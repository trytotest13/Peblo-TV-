import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import Select from '../components/Select'

const ENTITY_OPTIONS = [
  { value: '', label: 'All Entities' },
  { value: 'show', label: 'Shows' },
  { value: 'season', label: 'Seasons' },
  { value: 'episode', label: 'Episodes' },
]

export default function AuditLog() {
  const [entityType, setEntityType] = useState('')
  const {
    data: logs,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['audit-log', entityType],
    queryFn: () => api.getAuditLog(entityType ? { entity_type: entityType } : undefined),
  })

  if (isLoading) return <div className="empty-state">Loading audit logs…</div>
  if (error) return <div className="alert alert-error">{(error as Error).message}</div>

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <h2>Audit Log</h2>
        <div style={{ width: 180 }}>
          <Select
            options={ENTITY_OPTIONS}
            value={entityType}
            onChange={setEntityType}
            ariaLabel="Filter by entity type"
            className="sm"
          />
        </div>
      </div>

      <div className="card table-card">
        <div className="pub-table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity Type</th>
                <th>Entity ID</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {!logs || logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{ textAlign: 'center', color: 'var(--color-muted)', padding: 24 }}
                  >
                    No audit logs recorded.
                  </td>
                </tr>
              ) : (
                logs.map((log: any) => (
                  <tr key={log.id}>
                    <td className="cell-cats">{log.actor_email}</td>
                    <td>
                      <span className="row-title">{log.action}</span>
                    </td>
                    <td className="cell-cats" style={{ textTransform: 'capitalize' }}>
                      {log.entity_type}
                    </td>
                    <td className="cell-cats" style={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {log.entity_id}
                    </td>
                    <td className="cell-cats">{new Date(log.created_at).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
