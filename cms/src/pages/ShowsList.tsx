import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

const SECTIONS = ['featured', 'series', 'minisodes', 'songs']
const PAGE_SIZE = 20

export default function ShowsList() {
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [section, setSection] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce search input by 300ms so we don't fire a request on every keystroke
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search])

  const queryClient = useQueryClient()
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['shows', page, debouncedSearch, section, statusFilter],
    queryFn: () =>
      api.listShows({
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(section && { section }),
        ...(statusFilter && { status: statusFilter }),
      }),
  })

  const deleteShow = useMutation({
    mutationFn: api.deleteShow,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shows'] }),
  })

  if (error) return <div className="alert alert-error">{(error as Error).message}</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, flex: 1 }}>Shows</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          + New Show
        </button>
      </div>

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
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
            style={{ flex: 1 }}
          />
          {isFetching && !isLoading && (
            <span style={{ color: 'var(--color-muted)', fontSize: 12 }}>Searching...</span>
          )}
          <select
            className="form-select"
            value={section}
            onChange={(e) => {
              setSection(e.target.value)
              setPage(0)
            }}
          >
            <option value="">All sections</option>
            {SECTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(0)
            }}
          >
            <option value="">All statuses</option>
            <option value="published">published</option>
            <option value="draft">draft</option>
          </select>
        </div>

        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-muted)' }}>
            Loading...
          </div>
        ) : !data || data.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-muted)' }}>
            No shows found.{' '}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                setShowForm(true)
              }}
            >
              Create one
            </a>
            .
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Section</th>
                <th>Categories</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.map((s: any) => (
                <tr key={s.id}>
                  <td>
                    <Link to={`/shows/${s.id}`}>{s.title}</Link>
                    <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>{s.slug}</div>
                  </td>
                  <td>{s.section}</td>
                  <td>
                    {s.categories?.map((c: string) => (
                      <span
                        key={c}
                        style={{ marginRight: 4, fontSize: 11, color: 'var(--color-muted)' }}
                      >
                        • {c}
                      </span>
                    ))}
                  </td>
                  <td>
                    <span className={`badge badge-${s.status}`}>{s.status}</span>
                  </td>
                  <td>
                    <button
                      className="btn btn-danger"
                      style={{ padding: '4px 8px', fontSize: 12 }}
                      onClick={() => {
                        if (confirm(`Delete show "${s.title}"?`)) deleteShow.mutate(s.id)
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

        <div style={{ padding: 14, display: 'flex', justifyContent: 'space-between' }}>
          <button className="page-btn" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            ‹ Prev
          </button>
          <span style={{ alignSelf: 'center', color: 'var(--color-muted)' }}>Page {page + 1}</span>
          <button
            className="page-btn"
            disabled={!data || data.length < PAGE_SIZE}
            onClick={() => setPage((p) => p + 1)}
          >
            Next ›
          </button>
        </div>
      </div>

      {showForm && <NewShowModal onClose={() => setShowForm(false)} />}
    </div>
  )
}

const CATEGORIES = [
  'adventure',
  'folk',
  'friendship',
  'india',
  'language',
  'learning',
  'maths',
  'music',
  'nature',
  'reading',
  'science',
  'singalong',
  'stories',
  'travel',
  'values',
]

function NewShowModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    title: '',
    slug: '',
    synopsis: '',
    section: 'series',
    categories: [] as string[],
    status: 'draft',
  })
  const [err, setErr] = useState('')

  const create = useMutation({
    mutationFn: api.createShow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shows'] })
      onClose()
    },
    onError: (e) => setErr((e as Error).message),
  })

  return (
    <div style={modalBackdrop}>
      <div className="card" style={modalBox}>
        <div className="card-header">New Show</div>
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
            <label className="form-label">Slug (lowercase, hyphens only)</label>
            <input
              className="form-input"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
              pattern="[a-z0-9\-]+"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Synopsis</label>
            <textarea
              className="form-textarea"
              value={form.synopsis}
              onChange={(e) => setForm({ ...form, synopsis: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Section</label>
            <select
              className="form-select"
              value={form.section}
              onChange={(e) => setForm({ ...form, section: e.target.value })}
            >
              {SECTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Categories</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CATEGORIES.map((c) => {
                const active = form.categories.includes(c)
                return (
                  <button
                    key={c}
                    type="button"
                    className="btn"
                    style={{
                      padding: '3px 8px',
                      fontSize: 12,
                      ...(active && {
                        background: 'var(--color-primary)',
                        color: '#fff',
                        borderColor: 'var(--color-primary)',
                      }),
                    }}
                    onClick={() => {
                      setForm({
                        ...form,
                        categories: active
                          ? form.categories.filter((x) => x !== c)
                          : [...form.categories, c],
                      })
                    }}
                  >
                    {c}
                  </button>
                )
              })}
            </div>
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
            disabled={create.isPending}
            onClick={() => create.mutate(form)}
          >
            {create.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
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
