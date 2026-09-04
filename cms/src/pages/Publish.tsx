import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export default function Publish() {
  const queryClient = useQueryClient()
  const [diffData, setDiffData] = useState<any | null>(null)
  const [showDiffModal, setShowDiffModal] = useState(false)

  const {
    data: report,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['validation-report'],
    queryFn: api.getValidationReport,
  })
  const { data: runs } = useQuery({
    queryKey: ['publish-runs'],
    queryFn: () => api.getPublishRuns(0),
  })

  const publish = useMutation({
    mutationFn: api.publishCatalog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publish-runs'] })
      queryClient.invalidateQueries({ queryKey: ['validation-report'] })
    },
  })

  const rollback = useMutation({
    mutationFn: (runId: string) => api.rollbackTo(runId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publish-runs'] })
      queryClient.invalidateQueries({ queryKey: ['validation-report'] })
      alert('Rollback successful!')
    },
    onError: (e) => alert((e as Error).message),
  })

  const loadDiff = useMutation({
    mutationFn: (runId: string) => api.getDiff(runId),
    onSuccess: (data) => {
      setDiffData(data)
      setShowDiffModal(true)
    },
    onError: (e) => alert((e as Error).message),
  })

  if (isLoading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-muted)' }}>
        Loading validation report...
      </div>
    )
  }

  if (error) {
    const msg = (error as Error).message
    const isPermission = msg.toLowerCase().includes('unauthor') || msg.includes('403')
    return (
      <div className="alert alert-error" style={{ maxWidth: 600 }}>
        {isPermission
          ? "You don't have permission to view the publish report. Ask an admin for access."
          : `Couldn't load validation report: ${msg}`}
        <button className="btn" style={{ marginTop: 8 }} onClick={() => refetch()}>
          Retry
        </button>
      </div>
    )
  }

  const canPublish = report?.can_publish
  const groupedByShow: Record<string, any[]> = {}
  ;(report?.issues || []).forEach((issue: any) => {
    if (!groupedByShow[issue.show_slug]) groupedByShow[issue.show_slug] = []
    groupedByShow[issue.show_slug].push(issue)
  })

  return (
    <div>
      <h2 style={{ margin: '0 0 16px' }}>Publish</h2>

      <div className="card publish-card" style={{ marginBottom: 16 }}>
        <div className="card-header">Validation Report</div>
        <div className="card-body">
          <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--color-muted)' }}>
            {report?.total_shows ?? 0} shows · {report?.total_episodes ?? 0} episodes
          </div>

          {!canPublish ? (
            <>
              <div className="alert alert-warning">
                {report?.issues?.length} issue{report?.issues?.length === 1 ? '' : 's'} blocking
                publish. Fix them below, then run the publish.
              </div>
              {Object.entries(groupedByShow).map(([show, issues]) => (
                <div key={show} className="publish-block">
                  <h4>{show}</h4>
                  {issues.map((iss: any, i: number) => (
                    <div key={i} className="issue-item">
                      • <strong>{iss.kind.replace(/_/g, ' ')}</strong>: {iss.message}
                    </div>
                  ))}
                </div>
              ))}
            </>
          ) : (
            <div className="alert alert-success">No issues found. Ready to publish.</div>
          )}

          <button
            className="btn btn-primary"
            disabled={!canPublish || publish.isPending}
            onClick={() => {
              if (confirm('Publish the catalogue now? This is the version the viewer will see.')) {
                publish.mutate()
              }
            }}
            style={{ width: '100%', marginTop: 8 }}
          >
            {publish.isPending
              ? 'Publishing...'
              : canPublish
                ? '🚀 Publish Now'
                : '⛔ Publish disabled — fix issues above'}
          </button>
          {!canPublish && (
            <div
              style={{
                fontSize: 12,
                color: 'var(--color-muted)',
                marginTop: 6,
                textAlign: 'center',
              }}
            >
              Button is disabled because there are {report?.issues?.length} issue(s) blocking
              publish.
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">Run History</div>
        <div className="card-body">
          {!runs || runs.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-muted)' }}>
              No publish runs yet.
            </div>
          ) : (
            runs.map((r: any) => (
              <div key={r.id} className="run-row" style={{ marginBottom: 8 }}>
                <span className={`run-status run-${r.outcome}`} style={{ marginRight: 8 }}>
                  {r.outcome}
                </span>
                <span style={{ flex: 1, marginRight: 8 }}>
                  by {r.initiated_by} · {r.shows_published} shows · {r.episodes_published} episodes · {new Date(r.started_at).toLocaleString()}
                </span>
                <button
                  className="btn"
                  style={{ padding: '2px 8px', fontSize: 11, marginRight: 4 }}
                  onClick={() => {
                    if (confirm('Load diff for this run?')) loadDiff.mutate(r.id)
                  }}
                  disabled={loadDiff.isPending}
                >
                  View Diff
                </button>
                {r.outcome === 'success' && (
                  <button
                    className="btn btn-danger"
                    style={{ padding: '2px 8px', fontSize: 11 }}
                    onClick={() => {
                      if (confirm('Roll back to this run? This will replace the live catalogue with this version.')) {
                        rollback.mutate(r.id)
                      }
                    }}
                    disabled={rollback.isPending}
                  >
                    Rollback
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {showDiffModal && diffData && (
        <div style={modalBackdrop}>
          <div className="card" style={{ ...modalBox, width: '80%', maxWidth: 800 }}>
            <div className="card-header">Publish Diff</div>
            <div className="card-body">
              <h3>Changes Summary</h3>
              <div style={{ marginBottom: 16 }}>
                <strong>Added shows:</strong> {diffData.added_shows?.length || 0}
              </div>
              <div style={{ marginBottom: 16 }}>
                <strong>Removed shows:</strong> {diffData.removed_shows?.length || 0}
              </div>
              <div style={{ marginBottom: 16 }}>
                <strong>Changed shows:</strong> {diffData.changed_shows?.length || 0}
              </div>

              {diffData.added_shows && diffData.added_shows.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h4>Added Shows</h4>
                  <ul>
                    {diffData.added_shows.map((slug: string) => (
                      <li key={slug}>{slug}</li>
                    ))}
                  </ul>
                </div>
              )}

              {diffData.removed_shows && diffData.removed_shows.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h4>Removed Shows</h4>
                  <ul>
                    {diffData.removed_shows.map((slug: string) => (
                      <li key={slug}>{slug}</li>
                    ))}
                  </ul>
                </div>
              )}

              {diffData.changed_shows && diffData.changed_shows.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h4>Changed Shows</h4>
                  {diffData.changed_shows.map((c: any) => (
                    <div key={c.slug} style={{ marginBottom: 8, padding: 8, border: '1px solid var(--color-border)', borderRadius: 4 }}>
                      <strong>{c.slug}</strong>
                      <div>Episode count changed: {c.old_episodes} → {c.new_episodes}</div>
                      <div>Section changed: {c.old_section || '(none)'} → {c.new_section || '(none)'}</div>
                    </div>
                  ))}
                </div>
              )}

              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowDiffModal(false)
                  setDiffData(null)
                }}
                style={{ width: '100%' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const modalBackdrop: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
}
const modalBox: React.CSSProperties = { width: 480, maxHeight: '90vh', overflowY: 'auto' }
