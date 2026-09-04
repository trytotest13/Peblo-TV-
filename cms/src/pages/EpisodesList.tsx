import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

const LANGUAGES = ['en', 'hi']

export default function EpisodesList() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [language, setLanguage] = useState('')
  const [editingEpisode, setEditingEpisode] = useState<any | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search])

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['episodes', debouncedSearch, statusFilter, language],
    queryFn: () =>
      api.listEpisodes({
        limit: 200,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter && { status: statusFilter }),
        ...(language && { language }),
      }),
  })

  const updateEpisode = useMutation({
    mutationFn: (vars: { id: string; body: any }) => api.updateEpisode(vars.id, vars.body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['episodes'] })
      setEditingEpisode(null)
    },
    onError: (e) => alert((e as Error).message),
  })

  return (
    <div>
      <h2 style={{ margin: '0 0 16px' }}>Episodes</h2>
      <div className="card">
        <div
          style={{
            padding: 14,
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            gap: 8,
          }}
        >
          <input
            className="form-input"
            placeholder="Search by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />
          {isFetching && !isLoading && (
            <span style={{ color: 'var(--color-muted)', fontSize: 12 }}>Searching...</span>
          )}
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="published">published</option>
            <option value="draft">draft</option>
          </select>
          <select
            className="form-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="">All languages</option>
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-muted)' }}>
            Loading...
          </div>
        ) : error ? (
          <div className="alert alert-error" style={{ margin: 14 }}>
            {(error as Error).message}
          </div>
        ) : !data || data.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-muted)' }}>
            No episodes match your filters.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Slug</th>
                <th>Language</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((e: any) => (
                <tr key={e.id}>
                  <td>{e.title}</td>
                  <td>
                    <code style={{ fontSize: 11 }}>{e.slug}</code>
                  </td>
                  <td>{e.language}</td>
                  <td>
                    <span className={`badge badge-${e.status}`}>{e.status}</span>
                  </td>
                  <td>
                    {e.duration_seconds
                      ? `${Math.floor(e.duration_seconds / 60)}m ${e.duration_seconds % 60}s`
                      : '—'}
                  </td>
                  <td>
                    <button
                      className="btn"
                      style={{ padding: '2px 8px', fontSize: 11, marginRight: 4 }}
                      onClick={() => setEditingEpisode(e)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger"
                      style={{ padding: '2px 8px', fontSize: 11 }}
                      onClick={() => {
                        if (confirm(`Delete episode "${e.title}"?`)) {
                          api.deleteEpisode(e.id).then(() => {
                            queryClient.invalidateQueries({ queryKey: ['episodes'] })
                          })
                        }
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editingEpisode && (
        <EditEpisodeModal
          episode={editingEpisode}
          onClose={() => setEditingEpisode(null)}
          onSave={(body) => updateEpisode.mutate({ id: editingEpisode.id, body })}
          isPending={updateEpisode.isPending}
        />
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

function EditEpisodeModal({
  episode,
  onClose,
  onSave,
  isPending,
}: {
  episode: any
  onClose: () => void
  onSave: (body: any) => void
  isPending: boolean
}) {
  const [form, setForm] = useState({
    title: episode.title,
    episode_number: episode.episode_number,
    duration_seconds: episode.duration_seconds,
    language: episode.language,
    content_group: episode.content_group || '',
    status: episode.status,
  })
  const [err, setErr] = useState('')

  return (
    <div style={modalBackdrop}>
      <div className="card" style={modalBox}>
        <div className="card-header">Edit Episode</div>
        <div className="card-body">
          {err && <div className="alert alert-error">{err}</div>}
          <div className="form-group">
            <label className="form-label">Title</label>
            <input
              className="form-input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Content Group (shared with language variants)</label>
            <input
              className="form-input"
              placeholder="my-show-s01e01"
              value={form.content_group}
              onChange={(e) => setForm({ ...form, content_group: e.target.value })}
              required
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Episode #</label>
              <input
                className="form-input"
                type="number"
                min={1}
                value={form.episode_number}
                onChange={(e) => setForm({ ...form, episode_number: +e.target.value })}
                required
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Duration (s)</label>
              <input
                className="form-input"
                type="number"
                min={0}
                value={form.duration_seconds}
                onChange={(e) => setForm({ ...form, duration_seconds: +e.target.value })}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Language</label>
              <select
                className="form-select"
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value as 'en' | 'hi' })}
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              className="form-select"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as 'draft' | 'published' })}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>
        <div
          style={{
            padding: 12,
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
          }}
        >
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            disabled={isPending}
            onClick={() => {
              if (!form.title.trim()) {
                setErr('Title is required.')
                return
              }
              if (form.episode_number < 1) {
                setErr('Episode number must be at least 1.')
                return
              }
              setErr('')
              onSave(form)
            }}
          >
            {isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
