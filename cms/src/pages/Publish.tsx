import { Fragment, useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import Select, { type SelectOption } from '../components/Select'
import './Publish.css'
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DotsIcon,
  FolderIcon,
  HistoryIcon,
  LayersIcon,
  PlayIcon,
  PlusIcon,
  PublishIcon,
  RefreshIcon,
  SectionsIcon,
  SendIcon,
  TrashIcon,
} from '../components/Icons'

const VIEWER_URL = import.meta.env.VITE_VIEWER_URL || 'http://localhost:5173'
const MEDIA_BASE = import.meta.env.VITE_API_URL || ''
const TOAST_MS = 7000
const HISTORY_LIMIT = 20
const QUEUE_PAGE_SIZE = 5
const SCHEDULE_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17]

const TYPE_OPTIONS: SelectOption[] = [
  { value: '', label: 'All types', icon: <SectionsIcon size={15} /> },
  { value: 'show', label: 'Show', icon: <PlayIcon size={15} /> },
  { value: 'episode', label: 'Episode', icon: <LayersIcon size={15} /> },
  { value: 'catalogue', label: 'Catalogue', icon: <FolderIcon size={15} /> },
]

type Tab = 'queue' | 'schedule' | 'history'

interface ToastState {
  message: string
  kind?: 'error'
  action?: { label: string; href: string }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const typeLabel = (t: string) => (t === 'catalogue' ? 'Catalogue' : cap(t))

function friendlyError(e: unknown): string {
  const raw = (e as Error).message || 'Request failed'
  return raw.startsWith('Cannot reach API')
    ? 'Backend not reachable. Is the API server running on port 8000?'
    : raw
}

function timeAgo(ts: number): string {
  if (!ts) return ''
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return new Date(ts).toLocaleTimeString()
}

export default function Publish() {
  const [tab, setTab] = useState<Tab>('queue')
  const [toast, setToast] = useState<ToastState | null>(null)

  const { data: jobsData } = useQuery({
    queryKey: ['publish-jobs'],
    queryFn: () => api.listPublishJobs(),
  })
  const pendingCount = (jobsData || []).length

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), TOAST_MS)
    return () => clearTimeout(t)
  }, [toast])

  return (
    <div className="publish-page">
      <div className="pub-hero">
        <div className="pub-hero-icon">
          <PublishIcon size={44} />
        </div>
        <div className="pub-hero-text">
          <h1>Publish</h1>
          <p>
            Validate and publish your content to Peblo TV. Ensure everything is ready before it goes
            live.
          </p>
        </div>
      </div>

      <div className="pub-tabs" role="tablist" aria-label="Publish sections">
        <button
          role="tab"
          aria-selected={tab === 'queue'}
          className={`pub-tab${tab === 'queue' ? ' active' : ''}`}
          onClick={() => setTab('queue')}
        >
          <SendIcon size={14} />
          Publish Queue
          {pendingCount > 0 && <span className="pub-tab-badge">{pendingCount}</span>}
        </button>
        <button
          role="tab"
          aria-selected={tab === 'schedule'}
          className={`pub-tab${tab === 'schedule' ? ' active' : ''}`}
          onClick={() => setTab('schedule')}
        >
          <CalendarIcon size={14} />
          Schedule
        </button>
        <button
          role="tab"
          aria-selected={tab === 'history'}
          className={`pub-tab${tab === 'history' ? ' active' : ''}`}
          onClick={() => setTab('history')}
        >
          <HistoryIcon size={14} />
          History
        </button>
      </div>

      <div className={`pub-dashboard pub-dashboard-${tab}`}>
        <section className="pub-queue-section" aria-label="Publish queue" hidden={tab !== 'queue'}>
          <QueueTab notify={setToast} />
        </section>
        <div className="pub-secondary-grid">
          <section aria-label="Schedule" hidden={tab === 'history'}>
            <ScheduleTab notify={setToast} />
          </section>
          <section aria-label="Publish history" hidden={tab === 'schedule'}>
            <HistoryTab />
          </section>
        </div>
      </div>

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <span className={toast.kind === 'error' ? 'toast-error' : undefined}>
            {toast.message}
          </span>
          {toast.action && (
            <a className="toast-undo" href={toast.action.href} target="_blank" rel="noreferrer">
              {toast.action.label}
            </a>
          )}
        </div>
      )}
    </div>
  )
}

function JobThumb({ job, show }: { job: any; show?: any }) {
  if (job.item_type === 'show' && show) {
    const art =
      show.artwork?.find((a: any) => a.artwork_type === 'poster') ||
      show.artwork?.find((a: any) => a.artwork_type === 'thumbnail') ||
      show.artwork?.find((a: any) => a.artwork_type === 'banner')
    if (art) {
      return <img className="pub-thumb" src={`${MEDIA_BASE}/media/${art.storage_key}`} alt="" />
    }
  }
  return (
    <span className="pub-thumb" aria-hidden="true">
      {job.item_type === 'episode' ? <PlayIcon size={13} /> : <LayersIcon size={13} />}
    </span>
  )
}

function QueueTab({ notify }: { notify: (t: ToastState) => void }) {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [publishing, setPublishing] = useState<Set<string>>(new Set())
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [page, setPage] = useState(0)

  const { data, isLoading, error, dataUpdatedAt } = useQuery({
    queryKey: ['publish-jobs'],
    queryFn: () => api.listPublishJobs(),
  })
  const jobs = data || []

  const { data: shows } = useQuery({
    queryKey: ['shows', 'publish-join'],
    queryFn: () => api.listShows({ limit: 200 }),
  })
  const { data: episodes } = useQuery({
    queryKey: ['episodes', 'publish-join'],
    queryFn: () => api.listEpisodes(),
  })
  const showById = useMemo(() => {
    const m = new Map<string, any>()
    ;((shows || []) as any[]).forEach((s) => m.set(s.id, s))
    return m
  }, [shows])
  const epById = useMemo(() => {
    const m = new Map<string, any>()
    ;((episodes || []) as any[]).forEach((e) => m.set(e.id, e))
    return m
  }, [episodes])

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['publish-jobs'] })
    queryClient.invalidateQueries({ queryKey: ['publish-history'] })
    queryClient.invalidateQueries({ queryKey: ['publish-schedule'] })
  }

  const markPublishing = (id: string, on: boolean) =>
    setPublishing((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })

  const publishOne = useMutation({
    mutationFn: (job: any) => api.publishJob(job.id),
    onMutate: (job: any) => markPublishing(job.id, true),
    onSuccess: (_data, job: any) => {
      refresh()
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(job.id)
        return next
      })
      notify({
        message: `Published "${job.title}".`,
        action: { label: 'View in viewer app', href: VIEWER_URL },
      })
    },
    onError: (e, job: any) =>
      notify({ message: `Couldn't publish "${job.title}": ${friendlyError(e)}`, kind: 'error' }),
    onSettled: (_d, _e, job: any) => markPublishing(job.id, false),
  })

  const publishBulk = useMutation({
    mutationFn: async (items: any[]) => {
      let ok = 0
      let failed = 0
      for (const job of items) {
        markPublishing(job.id, true)
        try {
          await api.publishJob(job.id)
          ok++
        } catch {
          failed++
        } finally {
          markPublishing(job.id, false)
        }
      }
      return { ok, failed }
    },
    onSuccess: ({ ok, failed }) => {
      refresh()
      setSelected(new Set())
      notify(
        failed === 0
          ? {
              message: `Published ${ok} item${ok === 1 ? '' : 's'}.`,
              action: { label: 'View in viewer app', href: VIEWER_URL },
            }
          : { message: `Published ${ok}, ${failed} failed. Check the queue.`, kind: 'error' }
      )
    },
  })

  const cancelJob = useMutation({
    mutationFn: (job: any) => api.cancelPublishJob(job.id),
    onSuccess: (_data, job: any) => {
      refresh()
      notify({ message: `Cancelled "${job.title}".` })
    },
    onError: (e, job: any) =>
      notify({ message: `Couldn't cancel "${job.title}": ${friendlyError(e)}`, kind: 'error' }),
  })

  if (isLoading) return <div className="empty-state">Loading queue…</div>
  if (error) return <div className="alert alert-error">{friendlyError(error)}</div>

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const maxPage = Math.max(0, Math.ceil(jobs.length / QUEUE_PAGE_SIZE) - 1)
  const cur = Math.min(page, maxPage)
  const pageJobs = jobs.slice(cur * QUEUE_PAGE_SIZE, (cur + 1) * QUEUE_PAGE_SIZE)
  const allOnPage = pageJobs.length > 0 && pageJobs.every((j: any) => selected.has(j.id))
  const selectedJobs = jobs.filter((j: any) => selected.has(j.id))
  const selectedValid = selectedJobs.filter(
    (j: any) => j.validation_status === 'validated' && !publishing.has(j.id)
  )

  const slugFor = (job: any): string => {
    if (job.item_type === 'show') return showById.get(job.item_id)?.slug || 'show'
    if (job.item_type === 'episode') return epById.get(job.item_id)?.slug || 'episode'
    return 'catalogue.json'
  }

  return (
    <div className="card table-card pub-queue-card">
      <div className="pub-card-head">
        <div className="pub-card-icon">
          <FolderIcon size={17} />
        </div>
        <div className="pub-card-head-text">
          <h3>Publish Queue</h3>
          <p>Review validation status and publish your content to the viewer app.</p>
        </div>
        <div className="pub-card-head-actions">
          <span className="pub-updated">Last updated {timeAgo(dataUpdatedAt) || 'just now'}</span>
          <button className="btn btn-sm" onClick={refresh}>
            <RefreshIcon size={13} /> Refresh
          </button>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="empty-state">
          Nothing waiting to publish. Everything is live. <Link to="/shows">Back to shows</Link>
        </div>
      ) : (
        <>
          <div className="pub-table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th className="check-cell">
                    <input
                      type="checkbox"
                      className="check"
                      aria-label="Select all jobs"
                      checked={allOnPage}
                      onChange={() =>
                        setSelected(allOnPage ? new Set() : new Set(pageJobs.map((j: any) => j.id)))
                      }
                    />
                  </th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Requested by</th>
                  <th>Requested at</th>
                  <th>Validation status</th>
                  <th>Actions</th>
                  <th style={{ width: 40 }}>
                    <span className="sr-only">More</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageJobs.map((job: any) => {
                  const busy = publishing.has(job.id) || publishBulk.isPending
                  const status = publishing.has(job.id) ? 'publishing' : job.validation_status
                  const canPublish = status === 'validated' && !busy
                  return (
                    <Fragment key={job.id}>
                      <tr>
                        <td className="check-cell">
                          <input
                            type="checkbox"
                            className="check"
                            checked={selected.has(job.id)}
                            onChange={() => toggleOne(job.id)}
                            aria-label={`Select ${job.title}`}
                          />
                        </td>
                        <td>
                          <div className="pub-title-cell">
                            <JobThumb job={job} show={showById.get(job.item_id)} />
                            <div className="pub-title-text">
                              <span className="row-title">{job.title}</span>
                              <span className="pub-slug">{slugFor(job)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="cell-cats">{typeLabel(job.item_type)}</td>
                        <td className="cell-cats">{job.requested_by}</td>
                        <td className="cell-cats">{new Date(job.requested_at).toLocaleString()}</td>
                        <td>
                          <span className={`status-pill status-pill-${status}`}>
                            <span
                              className={`status-dot status-dot-${status}`}
                              aria-hidden="true"
                            />
                            {status === 'validated'
                              ? 'Validated'
                              : status === 'issues'
                                ? 'Issues found'
                                : 'Publishing'}
                          </span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              className="btn btn-primary btn-sm"
                              disabled={!canPublish}
                              title={
                                status === 'issues'
                                  ? 'Resolve validation issues first'
                                  : 'Publish now'
                              }
                              onClick={() => publishOne.mutate(job)}
                            >
                              {publishing.has(job.id) ? (
                                'Publishing…'
                              ) : (
                                <>
                                  <SendIcon size={13} /> Publish now
                                </>
                              )}
                            </button>
                            {job.issues?.length > 0 && (
                              <button
                                className="link-btn"
                                aria-expanded={expanded.has(job.id)}
                                onClick={() => toggleExpand(job.id)}
                              >
                                View issues
                              </button>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="row-menu-wrap">
                            <button
                              className="btn btn-sm"
                              aria-label={`More actions for ${job.title}`}
                              aria-expanded={openMenu === job.id}
                              onClick={() => setOpenMenu(openMenu === job.id ? null : job.id)}
                            >
                              <DotsIcon size={15} />
                            </button>
                            {openMenu === job.id && (
                              <>
                                <div className="menu-backdrop" onClick={() => setOpenMenu(null)} />
                                <div className="row-menu" role="menu">
                                  <button
                                    role="menuitem"
                                    disabled={!job.issues?.length}
                                    onClick={() => {
                                      setOpenMenu(null)
                                      toggleExpand(job.id)
                                    }}
                                  >
                                    View issues
                                  </button>
                                  <button
                                    role="menuitem"
                                    className="danger"
                                    disabled={busy || cancelJob.isPending}
                                    onClick={() => {
                                      setOpenMenu(null)
                                      if (confirm(`Cancel publish of "${job.title}"?`)) {
                                        cancelJob.mutate(job)
                                      }
                                    }}
                                  >
                                    Cancel job
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expanded.has(job.id) && job.issues?.length > 0 && (
                        <tr key={`${job.id}-issues`}>
                          <td />
                          <td colSpan={7}>
                            <div className="publish-block">
                              {job.issues.map((m: string, i: number) => (
                                <div key={i} className="issue-item">
                                  • {m}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {selected.size > 0 && (
            <div className="pub-bulk" role="status">
              <span>
                <strong>{selected.size}</strong> item{selected.size === 1 ? '' : 's'} selected
              </span>
              <button
                className="btn btn-primary btn-sm"
                disabled={selectedValid.length === 0 || publishBulk.isPending}
                onClick={() => publishBulk.mutate(selectedValid)}
              >
                {publishBulk.isPending ? (
                  'Working…'
                ) : (
                  <>
                    <SendIcon size={13} /> Publish {selectedValid.length} item
                    {selectedValid.length === 1 ? '' : 's'}
                  </>
                )}
              </button>
              <button
                className="btn btn-sm"
                style={{ marginLeft: 'auto' }}
                onClick={() => setSelected(new Set())}
              >
                <TrashIcon size={13} /> Cancel
              </button>
            </div>
          )}

          <div className="table-footer">
            <span className="table-footer-count">
              Showing {cur * QUEUE_PAGE_SIZE + 1}–
              {Math.min((cur + 1) * QUEUE_PAGE_SIZE, jobs.length)} of {jobs.length}
            </span>
            <div className="pagination">
              <button className="page-btn" disabled={cur === 0} onClick={() => setPage(cur - 1)}>
                <ChevronLeftIcon size={13} /> Previous
              </button>
              {[...Array(maxPage + 1)].map((_, n) => (
                <button
                  key={n}
                  className={`page-btn${n === cur ? ' active' : ''}`}
                  onClick={() => setPage(n)}
                >
                  {n + 1}
                </button>
              ))}
              <button
                className="page-btn"
                disabled={cur === maxPage}
                onClick={() => setPage(cur + 1)}
              >
                Next <ChevronRightIcon size={13} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function mondayOf(offsetWeeks: number): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow + offsetWeeks * 7)
  return d
}

function ScheduleTab({ notify }: { notify: (t: ToastState) => void }) {
  const queryClient = useQueryClient()
  const [weekOffset, setWeekOffset] = useState(0)
  const [modal, setModal] = useState<{ date?: string; hour?: number; entry?: any } | null>(null)

  const monday = useMemo(() => mondayOf(weekOffset), [weekOffset])
  const days = useMemo(
    () =>
      [0, 1, 2, 3, 4, 5, 6].map((i) => {
        const d = new Date(monday)
        d.setDate(d.getDate() + i)
        return d
      }),
    [monday]
  )

  const key = (d: Date) => d.toISOString().slice(0, 10)
  const todayKey = key(new Date())

  const { data, isLoading, error } = useQuery({
    queryKey: ['publish-schedule', weekOffset],
    queryFn: () => api.getPublishSchedule(key(days[0]), key(days[6])),
  })
  const entries = (data || []) as any[]

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['publish-schedule'] })
    queryClient.invalidateQueries({ queryKey: ['publish-jobs'] })
  }

  const byCell = new Map<string, any[]>()
  entries.forEach((e) => {
    const d = new Date(e.scheduled_for)
    const k = `${d.toISOString().slice(0, 10)}|${d.getUTCHours()}`
    if (!byCell.has(k)) byCell.set(k, [])
    byCell.get(k)!.push(e)
  })

  if (isLoading) return <div className="empty-state">Loading schedule…</div>
  if (error) return <div className="alert alert-error">{friendlyError(error)}</div>

  const fmtDay = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const rangeLabel = `${fmtDay(days[0])} – ${fmtDay(days[6])}, ${days[6].getFullYear()}`

  return (
    <div className="card table-card pub-schedule-card">
      <div className="pub-card-head">
        <div className="pub-card-icon">
          <CalendarIcon size={17} />
        </div>
        <div className="pub-card-head-text">
          <h3>Schedule</h3>
          <p>Schedule your content to be published automatically.</p>
        </div>
        <div className="pub-card-head-actions">
          <button className="btn btn-outline btn-sm" onClick={() => setModal({ date: todayKey })}>
            <PlusIcon size={13} /> Schedule Publish
          </button>
        </div>
      </div>

      <div className="schedule-nav">
        <button
          className="btn btn-sm"
          aria-label="Previous week"
          onClick={() => setWeekOffset((o) => o - 1)}
        >
          <ChevronLeftIcon size={14} />
        </button>
        <span className="sched-range">{rangeLabel}</span>
        <button
          className="btn btn-sm"
          aria-label="Next week"
          onClick={() => setWeekOffset((o) => o + 1)}
        >
          <ChevronRightIcon size={14} />
        </button>
        <button className="btn btn-sm" onClick={() => setWeekOffset(0)}>
          This week
        </button>
      </div>

      <div className="pub-calendar-scroll">
        <div className="sched-grid" role="grid" aria-label="Weekly publish schedule (UTC)">
          <div role="row" className="sched-row">
            <div />
            {days.map((d) => (
              <div
                key={key(d)}
                className={`sched-head${key(d) === todayKey ? ' today' : ''}`}
                role="columnheader"
              >
                <span>
                  {d.toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' })}
                </span>
                <span>
                  {d.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    timeZone: 'UTC',
                  })}
                </span>
              </div>
            ))}
          </div>
          {SCHEDULE_HOURS.map((h) => (
            <div role="row" className="sched-row" key={h}>
              <div className="sched-hour" role="rowheader">
                {h}:00
              </div>
              {days.map((d) => {
                const k = key(d)
                const cellEntries = (byCell.get(`${k}|${h}`) || []).sort(
                  (a, b) => +new Date(a.scheduled_for) - +new Date(b.scheduled_for)
                )
                return (
                  <div
                    key={k}
                    role="gridcell"
                    aria-label={`${d.toDateString()} ${h}:00`}
                    className={`sched-cell${k === todayKey ? ' today' : ''}`}
                    onClick={() => setModal({ date: k, hour: h })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setModal({ date: k, hour: h })
                    }}
                    tabIndex={0}
                  >
                    {cellEntries.map((b: any) => (
                      <button
                        key={b.id}
                        className={`schedule-block schedule-block-${b.item_type}`}
                        title={`${b.title} — edit or reschedule`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setModal({ entry: b })
                        }}
                      >
                        <span>{b.title}</span>
                        <span>
                          {new Date(b.scheduled_for).toLocaleTimeString(undefined, {
                            hour: 'numeric',
                            minute: '2-digit',
                            timeZone: 'UTC',
                          })}
                        </span>
                      </button>
                    ))}
                    {cellEntries.length === 0 && (
                      <span className="sched-cell-hint">Click to schedule</span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <ScheduleModal
          date={modal.date}
          hour={modal.hour}
          entry={modal.entry}
          notify={notify}
          onClose={() => {
            setModal(null)
            refresh()
          }}
        />
      )}
    </div>
  )
}

function ScheduleModal({
  date,
  hour,
  entry,
  notify,
  onClose,
}: {
  date?: string
  hour?: number
  entry?: any
  notify: (t: ToastState) => void
  onClose: () => void
}) {
  const isEdit = !!entry
  const [search, setSearch] = useState('')
  const [jobId, setJobId] = useState<string>('')
  const [day, setDay] = useState(
    entry ? new Date(entry.scheduled_for).toISOString().slice(0, 10) : (date ?? '')
  )
  const [time, setTime] = useState(
    entry
      ? new Date(entry.scheduled_for).toISOString().slice(11, 16)
      : hour != null
        ? `${String(hour).padStart(2, '0')}:00`
        : '09:00'
  )
  const [tzNote, setTzNote] = useState(entry?.timezone_note ?? '')
  const [err, setErr] = useState('')

  const { data } = useQuery({
    queryKey: ['publish-jobs'],
    queryFn: () => api.listPublishJobs(),
    enabled: !isEdit,
  })
  const options = ((data || []) as any[]).filter(
    (j) =>
      j.validation_status === 'validated' && j.title.toLowerCase().includes(search.toLowerCase())
  )

  const save = useMutation({
    mutationFn: () => {
      const scheduled_for = new Date(`${day}T${time}`).toISOString()
      if (isEdit) {
        return api.updateSchedule(entry.id, {
          title: entry.title,
          scheduled_for,
          timezone_note: tzNote || null,
        })
      }
      const picked = options.find((o: any) => o.id === jobId)
      if (!picked) throw new Error('Pick validated content first.')
      return api.createSchedule({
        title: picked.title,
        item_type: picked.item_type,
        item_id: picked.item_id,
        scheduled_for,
        timezone_note: tzNote || null,
      })
    },
    onSuccess: () => {
      notify({ message: isEdit ? 'Schedule updated.' : 'Publish scheduled.' })
      onClose()
    },
    onError: (e) => setErr(friendlyError(e)),
  })

  const cancelEntry = useMutation({
    mutationFn: () => api.cancelSchedule(entry.id),
    onSuccess: () => {
      notify({ message: `Cancelled "${entry.title}".` })
      onClose()
    },
    onError: (e) => setErr(friendlyError(e)),
  })

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="card"
        style={{ width: 480, maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-header">{isEdit ? 'Edit scheduled publish' : 'Schedule publish'}</div>
        <div className="card-body">
          {err && <div className="alert alert-error">{err}</div>}
          {!isEdit && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="sched-search">
                  Content (validated only)
                </label>
                <input
                  id="sched-search"
                  className="form-input"
                  placeholder="Search validated items"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="sched-content">
                  Pick content
                </label>
                <select
                  id="sched-content"
                  className="form-select"
                  value={jobId}
                  onChange={(e) => setJobId(e.target.value)}
                >
                  <option value="">Choose…</option>
                  {options.map((o: any) => (
                    <option key={o.id} value={o.id}>
                      {o.title} ({typeLabel(o.item_type)})
                    </option>
                  ))}
                </select>
                {options.length === 0 && (
                  <span className="form-error">
                    No validated items — resolve queue issues first.
                  </span>
                )}
              </div>
            </>
          )}
          <div className="form-group">
            <label className="form-label" htmlFor="sched-date">
              Date
            </label>
            <input
              id="sched-date"
              type="date"
              className="form-input"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="sched-time">
              Time
            </label>
            <input
              id="sched-time"
              type="time"
              className="form-input"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="sched-tz">
              Timezone note (optional)
            </label>
            <input
              id="sched-tz"
              className="form-input"
              placeholder={`Local timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`}
              value={tzNote}
              onChange={(e) => setTzNote(e.target.value)}
            />
          </div>
        </div>
        <div className="table-footer" style={{ justifyContent: 'flex-end', gap: 8 }}>
          {isEdit && (
            <button
              className="btn btn-ghost-danger btn-sm"
              style={{ marginRight: 'auto' }}
              disabled={cancelEntry.isPending}
              onClick={() => {
                if (confirm(`Cancel scheduled publish of "${entry.title}"?`)) {
                  cancelEntry.mutate()
                }
              }}
            >
              Cancel schedule
            </button>
          )}
          <button className="btn" onClick={onClose}>
            Close
          </button>
          <button
            className="btn btn-primary"
            disabled={save.isPending || (!isEdit && !jobId) || !day || !time}
            onClick={() => save.mutate()}
          >
            {save.isPending ? 'Saving…' : isEdit ? 'Save' : 'Schedule'}
          </button>
        </div>
      </div>
    </div>
  )
}

function HistoryTab() {
  const [cursor, setCursor] = useState(0)
  const [typeFilter, setTypeFilter] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)

  const params: Record<string, string> = {}
  if (typeFilter) params.type = typeFilter
  if (from) params.from_date = new Date(from).toISOString()
  if (to) params.to_date = new Date(`${to}T23:59:59`).toISOString()

  const { data, isLoading, error } = useQuery({
    queryKey: ['publish-history', cursor, typeFilter, from, to],
    queryFn: () => api.getPublishHistory(cursor, HISTORY_LIMIT, params),
  })
  const items = data?.items || []
  const total = data?.total ?? 0

  const resetPage = () => {
    setCursor(0)
    setExpanded(null)
  }

  if (isLoading) return <div className="empty-state">Loading history…</div>
  if (error) return <div className="alert alert-error">{friendlyError(error)}</div>

  return (
    <div className="card table-card pub-history-card">
      <div className="pub-card-head">
        <div className="pub-card-icon">
          <HistoryIcon size={17} />
        </div>
        <div className="pub-card-head-text">
          <h3>Publish History</h3>
          <p>View past publish events and their status.</p>
        </div>
        <div className="pub-card-head-actions">
          <Select
            ariaLabel="Filter by type"
            value={typeFilter}
            onChange={(v) => {
              setTypeFilter(v)
              resetPage()
            }}
            options={TYPE_OPTIONS}
          />
          <details className="pub-date-filter">
            <summary className="btn btn-sm">
              <CalendarIcon size={14} />{' '}
              {from || to ? `${from || 'Start'} – ${to || 'Today'}` : 'Date range'}
            </summary>
            <div className="pub-date-popover">
              <label>
                From
                <input
                  type="date"
                  aria-label="From date"
                  className="form-input"
                  style={{ width: 'auto' }}
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value)
                    resetPage()
                  }}
                />
              </label>
              <label>
                To
                <input
                  type="date"
                  aria-label="To date"
                  className="form-input"
                  style={{ width: 'auto' }}
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value)
                    resetPage()
                  }}
                />
              </label>
              <button
                className="btn btn-sm"
                onClick={() => {
                  setFrom('')
                  setTo('')
                  resetPage()
                }}
              >
                Clear dates
              </button>
            </div>
          </details>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">No publish history found.</div>
      ) : (
        <>
          <div className="pub-table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Published at</th>
                  <th>By</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {items.map((h: any, idx: number) => (
                  <Fragment key={h.id || idx}>
                    <tr>
                      <td>
                        <span className="row-title">{h.title}</span>
                      </td>
                      <td className="cell-cats">{typeLabel(h.item_type)}</td>
                      <td className="cell-cats">
                        {h.published_at ? new Date(h.published_at).toLocaleString() : '—'}
                      </td>
                      <td className="cell-cats">{h.published_by}</td>
                      <td>
                        {h.result && (
                          <button
                            className={`btn btn-sm run-${h.result}`}
                            style={{
                              padding: '2px 8px',
                              fontSize: '11px',
                              textTransform: 'capitalize',
                            }}
                            onClick={() => setExpanded(expanded === idx ? null : idx)}
                          >
                            {h.result}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expanded === idx && h.error_detail && (
                      <tr key={`${idx}-err`}>
                        <td colSpan={5}>
                          <div className="publish-block">
                            <strong>{h.error_detail}</strong>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="table-footer">
            <span className="table-footer-count">
              Showing {cursor + 1}–{Math.min(cursor + HISTORY_LIMIT, total)} of {total}
            </span>
            <div className="pagination">
              <button
                className="page-btn"
                disabled={cursor === 0}
                onClick={() => setCursor(Math.max(0, cursor - HISTORY_LIMIT))}
              >
                <ChevronLeftIcon size={13} /> Previous
              </button>
              <button
                className="page-btn"
                disabled={cursor + HISTORY_LIMIT >= total}
                onClick={() => setCursor(cursor + HISTORY_LIMIT)}
              >
                Next <ChevronRightIcon size={13} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
