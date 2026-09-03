import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import ArtworkSlot from '../components/ArtworkSlot'

const LANGUAGES = ['en', 'hi']

export default function ShowDetail() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [episodeForm, setEpisodeForm] = useState<{ seasonId: string; showId: string } | null>(null)

  const {
    data: show,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['show', id],
    queryFn: () => api.getShow(id!),
    enabled: !!id,
  })

  const { data: episodes } = useQuery({
    queryKey: ['episodes'],
    queryFn: () => api.listEpisodes({ limit: 500 }),
  })

  const showEpisodes = (episodes || []).filter((ep: any) =>
    show?.seasons?.some((s: any) => s.id === ep.season_id)
  )

  const updateShow = useMutation({
    mutationFn: (body: any) => api.updateShow(id!, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['show', id] }),
  })

  const togglePublish = () => {
    if (!show) return
    updateShow.mutate({ status: show.status === 'published' ? 'draft' : 'published' })
  }

  if (isLoading) return <div>Loading...</div>
  if (error) return <div className="alert alert-error">{(error as Error).message}</div>
  if (!show) return <div>Not found</div>

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Link to="/shows" style={{ fontSize: 13 }}>
          ← Back to shows
        </Link>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <h2 style={{ margin: 0, flex: 1 }}>{show.title}</h2>
            <span className={`badge badge-${show.status}`}>{show.status}</span>
            <button className="btn" onClick={togglePublish} disabled={updateShow.isPending}>
              {show.status === 'published' ? 'Move to draft' : 'Publish'}
            </button>
          </div>
          <div style={{ color: 'var(--color-muted)', fontSize: 13 }}>
            <strong>Section:</strong> {show.section} · <strong>Slug:</strong> {show.slug}
          </div>
          {show.synopsis && <p style={{ marginTop: 12 }}>{show.synopsis}</p>}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">Show Artwork</div>
        <div className="card-body">
          <div className="artwork-grid">
            <ArtworkSlot
              showId={show.id}
              artworkType="poster"
              spec={{ aspect: '2:3', px: '600×900', maxKB: 200 }}
              current={show.artwork?.find((a: any) => a.artwork_type === 'poster')}
            />
            <ArtworkSlot
              showId={show.id}
              artworkType="banner"
              spec={{ aspect: '16:9', px: '1280×720', maxKB: 200 }}
              current={show.artwork?.find((a: any) => a.artwork_type === 'banner')}
            />
            <ArtworkSlot
              showId={show.id}
              artworkType="thumbnail"
              spec={{ aspect: '16:9', px: '640×360', maxKB: 200 }}
              current={show.artwork?.find((a: any) => a.artwork_type === 'thumbnail')}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ flex: 1 }}>Seasons &amp; Episodes</span>
          <button
            className="btn btn-primary"
            onClick={() => {
              if (show.seasons.length === 0) {
                alert('Create a season first.')
                return
              }
              setEpisodeForm({ showId: show.id, seasonId: show.seasons[0].id })
            }}
          >
            + Add Episode
          </button>
        </div>
        <div className="card-body">
          {show.seasons.length === 0 ? (
            <div style={{ color: 'var(--color-muted)', padding: 20, textAlign: 'center' }}>
              No seasons yet.
              <br />
              <button
                className="btn"
                style={{ marginTop: 12 }}
                onClick={async () => {
                  await api.createSeason({ show_id: show.id, season_number: 1, title: 'Season 1' })
                  queryClient.invalidateQueries({ queryKey: ['show', id] })
                }}
              >
                + Create Season 1
              </button>
            </div>
          ) : (
            show.seasons.map((s: any) => (
              <div key={s.id} style={{ marginBottom: 16 }}>
                <h4 style={{ margin: '0 0 8px' }}>
                  {s.title || `Season ${s.season_number}`}{' '}
                  {s.season_number === 0 && <span className="badge badge-draft">trailers</span>}
                </h4>
                <div style={{ paddingLeft: 16 }}>
                  {showEpisodes
                    .filter((e: any) => e.season_id === s.id)
                    .map((e: any) => (
                      <EpisodeRow key={e.id} episode={e} />
                    ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {episodeForm && (
        <NewEpisodeModal
          seasonId={episodeForm.seasonId}
          showId={episodeForm.showId}
          onClose={() => setEpisodeForm(null)}
        />
      )}
    </div>
  )
}

function EpisodeRow({ episode }: { episode: any }) {
  const queryClient = useQueryClient()
  const togglePublish = useMutation({
    mutationFn: (status: string) => api.updateEpisode(episode.id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['episodes'] })
      queryClient.invalidateQueries({ queryKey: ['show'] })
    },
  })
  return (
    <div
      style={{
        padding: '6px 0',
        borderBottom: '1px solid #f1f3f5',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <span style={{ flex: 1 }}>
        <strong>E{episode.episode_number}</strong> — {episode.title}{' '}
        <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>· {episode.language}</span>
      </span>
      <span className={`badge badge-${episode.status}`} style={{ marginRight: 8 }}>
        {episode.status}
      </span>
      <button
        className="btn"
        style={{ padding: '2px 8px', fontSize: 11 }}
        onClick={() => togglePublish.mutate(episode.status === 'published' ? 'draft' : 'published')}
      >
        {episode.status === 'published' ? 'Unpublish' : 'Publish'}
      </button>
    </div>
  )
}

function NewEpisodeModal({
  seasonId,
  showId,
  onClose,
}: {
  seasonId: string
  showId: string
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    season_id: seasonId,
    title: '',
    episode_number: 1,
    duration_seconds: 300,
    language: 'en' as 'en' | 'hi',
    content_group: '',
    status: 'draft',
  })
  const [err, setErr] = useState('')

  const create = useMutation({
    mutationFn: api.createEpisode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['show', showId] })
      queryClient.invalidateQueries({ queryKey: ['episodes'] })
      onClose()
    },
    onError: (e) => setErr((e as Error).message),
  })

  return (
    <div style={modalBackdrop}>
      <div className="card" style={modalBox}>
        <div className="card-header">New Episode</div>
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
