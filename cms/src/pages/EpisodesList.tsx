import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

const LANGUAGES = ['en', 'hi']

export default function EpisodesList() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [language, setLanguage] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['episodes', search, statusFilter, language],
    queryFn: () =>
      api.listEpisodes({
        limit: 200,
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(language && { language }),
      }),
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
