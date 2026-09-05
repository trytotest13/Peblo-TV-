import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import Select, { type SelectOption } from '../components/Select'
import {
  PlusIcon,
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SectionsIcon,
  FeaturedIcon,
  SeriesIcon,
  MinisodesIcon,
  SongsIcon,
  StatusIcon,
} from '../components/Icons'

const SECTIONS = ['featured', 'series', 'minisodes', 'songs']
const PAGE_SIZE = 7
const UNDO_MS = 7000

// Custom Select options — order matters; "All" first, then the sections.
// Each option carries a small icon mirroring the design.
const SECTION_OPTIONS: SelectOption[] = [
  { value: '', label: 'All sections', icon: <SectionsIcon size={16} /> },
  { value: 'featured', label: 'Featured', icon: <FeaturedIcon size={16} /> },
  { value: 'series', label: 'Series', icon: <SeriesIcon size={16} /> },
  { value: 'minisodes', label: 'Minisodes', icon: <MinisodesIcon size={16} /> },
  { value: 'songs', label: 'Songs', icon: <SongsIcon size={16} /> },
]

const STATUS_OPTIONS: SelectOption[] = [
  { value: '', label: 'All statuses', icon: <StatusIcon size={16} /> },
  { value: 'published', label: 'Published', icon: <StatusIcon size={16} /> },
  { value: 'draft', label: 'Draft', icon: <StatusIcon size={16} /> },
]

type SortKey = 'title' | 'status'
type SortDir = 'asc' | 'desc'

interface ToastState {
  message: string
  kind?: 'error'
  undo?: () => void
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function relativeTime(ts: number, now: number): string {
  const secs = Math.max(0, Math.round((now - ts) / 1000))
  if (secs < 10) return 'just now'
  if (secs < 60) return `${secs}s ago`
  const mins = Math.round(secs / 60)
  if (mins < 60) return `${mins} min ago`
  return `${Math.round(mins / 60)}h ago`
}

export default function ShowsList() {
  const [searchParams] = useSearchParams()
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('search') || '')
  const [section, setSection] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingShow, setEditingShow] = useState<{
    id: string
    title: string
    section: string
    categories: string[]
  } | null>(null)

  // UX-layer state: sorting, row selection, optimistic deletes, toast
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'title', dir: 'asc' })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<ToastState | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const headCheckRef = useRef<HTMLInputElement>(null)

  // Debounce search input by 300ms so we don't fire a request on every keystroke
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search])

  // Re-render occasionally so "updated X ago" stays honest
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  // "/" focuses the filter search, unless the user is already typing somewhere
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      if (e.key === '/' && !typing) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Toasts auto-dismiss after UNDO_MS
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), UNDO_MS)
    return () => clearTimeout(t)
  }, [toast])

  const filters = {
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(section && { section }),
    ...(statusFilter && { status: statusFilter }),
  }

  const queryClient = useQueryClient()
  const { data, isLoading, error, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['shows', page, debouncedSearch, section, statusFilter],
    queryFn: () => api.listShows({ skip: page * PAGE_SIZE, limit: PAGE_SIZE, ...filters }),
  })

  const { data: countData } = useQuery({
    queryKey: ['shows-count', debouncedSearch, section, statusFilter],
    queryFn: () => api.countShows(filters),
  })

  const invalidateShows = () => {
    queryClient.invalidateQueries({ queryKey: ['shows'] })
    queryClient.invalidateQueries({ queryKey: ['shows-count'] })
  }

  // Optimistic delete: row disappears immediately, undo recreates it from cached data
  const deleteShow = useMutation({
    mutationFn: (s: any) => api.deleteShow(s.id),
    onSuccess: (_data, s) => {
      invalidateShows()
      setToast({
        message: `Deleted "${s.title}"`,
        undo: () =>
          restoreShow.mutate({
            title: s.title,
            slug: s.slug,
            synopsis: s.synopsis ?? null,
            section: s.section,
            categories: s.categories || [],
            status: s.status,
          }),
      })
    },
    onError: (_e, s) => {
      setHiddenIds((prev) => {
        const next = new Set(prev)
        next.delete(s.id)
        return next
      })
      setToast({ message: `Couldn't delete "${s.title}".`, kind: 'error' })
    },
  })

  const restoreShow = useMutation({
    mutationFn: (body: {
      title: string
      slug: string
      synopsis: string | null
      section: string
      categories: string[]
      status: string
    }) => api.createShow(body),
    onSuccess: () => {
      invalidateShows()
      setToast({ message: 'Show restored.' })
    },
    onError: (e) => setToast({ message: (e as Error).message, kind: 'error' }),
  })

  // No archive status in the API contract (draft|published), so bulk "archive" = move to draft
  const bulkDraft = useMutation({
    mutationFn: (ids: string[]) =>
      Promise.all(ids.map((id) => api.updateShow(id, { status: 'draft' }))),
    onSuccess: (_data, ids) => {
      invalidateShows()
      setSelected(new Set())
      setToast({ message: `Moved ${ids.length} show${ids.length === 1 ? '' : 's'} to draft.` })
    },
    onError: (e) => {
      const raw = (e as Error).message
      // The API client throws a verbose "Cannot reach API at ..." when fetch
      // itself fails; surface a short, actionable message instead.
      const friendly = raw.startsWith('Cannot reach API')
        ? 'Backend not reachable. Is the API server running on port 8000?'
        : raw
      setToast({ message: `Couldn't move to draft: ${friendly}`, kind: 'error' })
    },
  })

  // Derived data — computed before any early return so hook order stays stable
  const total = countData?.count ?? 0
  const shows = data || []
  const rows = (() => {
    const visible = shows.filter((s: any) => !hiddenIds.has(s.id))
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...visible].sort((a: any, b: any) => {
      const cmp =
        sort.key === 'title'
          ? a.title.localeCompare(b.title)
          : a.status.localeCompare(b.status) || a.title.localeCompare(b.title)
      return cmp * dir
    })
  })()

  const hasFilters = Boolean(debouncedSearch || section || statusFilter)
  const allOnPage = rows.length > 0 && rows.every((s: any) => selected.has(s.id))

  // Keep the header checkbox indeterminate visual in sync
  useEffect(() => {
    if (headCheckRef.current) {
      const some = rows.some((s: any) => selected.has(s.id))
      headCheckRef.current.indeterminate = some && !allOnPage
    }
  })

  if (error) return <div className="alert alert-error">{(error as Error).message}</div>

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }
    )
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev)
      rows.forEach((s: any) => (allOnPage ? next.delete(s.id) : next.add(s.id)))
      return next
    })
  }

  function clearFilters() {
    setSearch('')
    setSection('')
    setStatusFilter('')
    setPage(0)
    setSelected(new Set())
  }

  return (
    <div>
      {/* Header */}
      <div className="page-hero">
        <div className="page-hero-text">
          <h1>Shows</h1>
          <p>Manage show metadata and publish state.</p>
          {!isLoading && (
            <p className="page-meta">
              {total} show{total === 1 ? '' : 's'}
              {dataUpdatedAt ? ` · updated ${relativeTime(dataUpdatedAt, now)}` : ''}
            </p>
          )}
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <PlusIcon size={14} /> New show
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="filter-bar">
        <div className="filter-search">
          <SearchIcon size={15} />
          <input
            ref={searchRef}
            aria-label="Search shows"
            placeholder="Search by title, slug, or keyword"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
              setSelected(new Set())
            }}
          />
          {isFetching && !isLoading && <span className="filter-sync">updating…</span>}
          {!search && (
            <kbd className="kbd" aria-hidden="true">
              /
            </kbd>
          )}
        </div>
        <Select
          ariaLabel="Filter by section"
          value={section}
          onChange={(v) => {
            setSection(v)
            setPage(0)
            setSelected(new Set())
          }}
          options={SECTION_OPTIONS}
        />
        <Select
          ariaLabel="Filter by status"
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v)
            setPage(0)
            setSelected(new Set())
          }}
          options={STATUS_OPTIONS}
        />
      </div>

      {/* Bulk selection bar */}
      {selected.size > 0 && (
        <div className="bulk-bar" role="status">
          <span>
            <strong>{selected.size}</strong> selected
          </span>
          <button
            className="btn"
            disabled={bulkDraft.isPending}
            onClick={() => bulkDraft.mutate([...selected])}
          >
            {bulkDraft.isPending ? 'Working…' : 'Set draft'}
          </button>
          <button className="link-btn" onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="card table-card">
        {isLoading ? (
          <div className="empty-state">Loading…</div>
        ) : shows.length === 0 ? (
          <div className="empty-state">
            {hasFilters ? (
              <>
                {debouncedSearch ? (
                  <>No shows match &ldquo;{debouncedSearch}&rdquo;. </>
                ) : (
                  'No shows match the current filters. '
                )}
                <button className="link-btn" onClick={clearFilters}>
                  {debouncedSearch ? 'Clear search' : 'Clear filters'}
                </button>
              </>
            ) : (
              <>
                No shows yet.{' '}
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
              </>
            )}
          </div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th className="check-cell">
                    <input
                      ref={headCheckRef}
                      type="checkbox"
                      className="check"
                      checked={allOnPage}
                      onChange={toggleAll}
                      aria-label="Select all shows on this page"
                    />
                  </th>
                  <th
                    aria-sort={
                      sort.key === 'title'
                        ? sort.dir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                  >
                    <button className="th-sort" onClick={() => toggleSort('title')}>
                      Show{' '}
                      <span className="th-sort-arrow" aria-hidden="true">
                        {sort.key === 'title' ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </button>
                  </th>
                  <th>Section</th>
                  <th>Categories</th>
                  <th
                    aria-sort={
                      sort.key === 'status'
                        ? sort.dir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                  >
                    <button className="th-sort" onClick={() => toggleSort('status')}>
                      Status{' '}
                      <span className="th-sort-arrow" aria-hidden="true">
                        {sort.key === 'status' ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </button>
                  </th>
                  <th style={{ width: 120 }}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s: any) => (
                  <tr key={s.id}>
                    <td className="check-cell">
                      <input
                        type="checkbox"
                        className="check"
                        checked={selected.has(s.id)}
                        onChange={() => toggleOne(s.id)}
                        aria-label={`Select ${s.title}`}
                      />
                    </td>
                    <td>
                      <Link to={`/shows/${s.id}`} className="row-title">
                        {s.title}
                      </Link>
                      <span className="row-inline-slug">{s.slug}</span>
                    </td>
                    <td>
                      <span className={s.section === 'featured' ? 'section-em' : 'section-plain'}>
                        {cap(s.section)}
                      </span>
                    </td>
                    <td className="cell-cats">
                      {s.categories?.length ? s.categories.join(', ') : '—'}
                    </td>
                    <td>
                      <span className={`status-pill status-pill-${s.status}`}>
                        <span className={`status-dot status-dot-${s.status}`} aria-hidden="true" />
                        {s.status === 'published' ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setEditShow(s.id, s.title, s.section, s.categories || [])}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-ghost-danger btn-sm"
                          disabled={deleteShow.isPending}
                          onClick={() => {
                            setHiddenIds((prev) => new Set(prev).add(s.id))
                            deleteShow.mutate(s)
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer: count + pagination — always shown with the table.
                total falls back to rows.length while the count query loads,
                so the footer never flashes "No shows" under a full table. */}
            <div className="table-footer">
              <span className="table-footer-count">
                {(() => {
                  const knownTotal = countData ? total : Math.max(total, rows.length)
                  if (knownTotal === 0) return 'No shows'
                  return `Showing ${page * PAGE_SIZE + 1}–${Math.min(
                    (page + 1) * PAGE_SIZE,
                    knownTotal
                  )} of ${knownTotal}`
                })()}
              </span>
              <div className="pagination">
                <button
                  className="page-btn"
                  disabled={page === 0}
                  onClick={() => {
                    setPage((p) => p - 1)
                    setSelected(new Set())
                  }}
                >
                  <ChevronLeftIcon size={13} /> Prev
                </button>
                <button className="page-btn active" aria-current="page">
                  {page + 1}
                </button>
                <button
                  className="page-btn"
                  disabled={(page + 1) * PAGE_SIZE >= (countData ? total : rows.length)}
                  onClick={() => {
                    setPage((p) => p + 1)
                    setSelected(new Set())
                  }}
                >
                  Next <ChevronRightIcon size={13} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <span className={toast.kind === 'error' ? 'toast-error' : undefined}>
            {toast.message}
          </span>
          {toast.undo && (
            <button
              className="toast-undo"
              onClick={() => {
                const undo = toast.undo
                setToast(null)
                undo?.()
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}

      {showForm && <NewShowModal onClose={() => setShowForm(false)} />}
      {editingShow && (
        <EditShowModal
          showId={editingShow.id}
          initialTitle={editingShow.title}
          initialSection={editingShow.section}
          initialCategories={editingShow.categories}
          onClose={() => setEditingShow(null)}
        />
      )}
    </div>
  )

  function setEditShow(id: string, title: string, section: string, categories: string[]) {
    setEditingShow({ id, title, section, categories })
  }
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
      queryClient.invalidateQueries({ queryKey: ['shows-count'] })
      onClose()
    },
    onError: (e) => setErr((e as Error).message),
  })

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card" style={modalBox} onClick={(e) => e.stopPropagation()}>
        <div className="card-header">New show</div>
        <div className="card-body">
          {err && <div className="alert alert-error">{err}</div>}
          <div className="form-group">
            <label className="form-label" htmlFor="new-show-title">
              Title
            </label>
            <input
              id="new-show-title"
              className="form-input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="new-show-slug">
              Slug (lowercase, hyphens only)
            </label>
            <input
              id="new-show-slug"
              className="form-input"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
              pattern="[a-z0-9\-]+"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="new-show-synopsis">
              Synopsis
            </label>
            <textarea
              id="new-show-synopsis"
              className="form-textarea"
              value={form.synopsis}
              onChange={(e) => setForm({ ...form, synopsis: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="new-show-section">
              Section
            </label>
            <select
              id="new-show-section"
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
            <span className="form-label">Categories</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CATEGORIES.map((c) => {
                const active = form.categories.includes(c)
                return (
                  <button
                    key={c}
                    type="button"
                    className="btn"
                    aria-pressed={active}
                    style={{
                      padding: '3px 9px',
                      fontSize: 12,
                      ...(active && {
                        background: 'var(--color-accent)',
                        color: 'var(--color-on-accent)',
                        borderColor: 'var(--color-accent)',
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
        <div className="table-footer" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            disabled={create.isPending}
            onClick={() => create.mutate(form)}
          >
            {create.isPending ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EditShowModal({
  showId,
  initialTitle,
  initialSection,
  initialCategories,
  onClose,
}: {
  showId: string
  initialTitle: string
  initialSection: string
  initialCategories: string[]
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    title: initialTitle,
    section: initialSection,
    categories: initialCategories,
  })
  const [err, setErr] = useState('')

  const update = useMutation({
    mutationFn: (vars: { id: string; title: string; section: string; categories: string[] }) =>
      api.updateShow(vars.id, {
        title: vars.title,
        section: vars.section,
        categories: vars.categories,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shows'] })
      onClose()
    },
    onError: (e) => setErr((e as Error).message),
  })

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card" style={modalBox} onClick={(e) => e.stopPropagation()}>
        <div className="card-header">Edit show</div>
        <div className="card-body">
          {err && <div className="alert alert-error">{err}</div>}
          <div className="form-group">
            <label className="form-label" htmlFor="edit-show-title">
              Title
            </label>
            <input
              id="edit-show-title"
              className="form-input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-show-section">
              Section
            </label>
            <select
              id="edit-show-section"
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
            <span className="form-label">Categories</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CATEGORIES.map((c) => {
                const active = form.categories.includes(c)
                return (
                  <button
                    key={c}
                    type="button"
                    className="btn"
                    aria-pressed={active}
                    style={{
                      padding: '3px 9px',
                      fontSize: 12,
                      ...(active && {
                        background: 'var(--color-accent)',
                        color: 'var(--color-on-accent)',
                        borderColor: 'var(--color-accent)',
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
        <div className="table-footer" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            disabled={update.isPending}
            onClick={() =>
              update.mutate({
                id: showId,
                title: form.title,
                section: form.section,
                categories: form.categories,
              })
            }
          >
            {update.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

const modalBox: React.CSSProperties = { width: 480, maxHeight: '90vh', overflowY: 'auto' }
