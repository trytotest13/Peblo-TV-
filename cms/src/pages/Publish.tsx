import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export default function Publish() {
  const queryClient = useQueryClient()
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
              <div key={r.id} className="run-row">
                <span className={`run-status run-${r.outcome}`}>{r.outcome}</span>
                <span style={{ flex: 1 }}>
                  by {r.initiated_by} · {r.shows_published} shows · {r.episodes_published} episodes
                </span>
                <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>
                  {new Date(r.started_at).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
