import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchCatalog, IMG } from '../api'

export default function ShowDetail() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [openSeason, setOpenSeason] = useState<number | null>(null)

  const { data: catalog, isLoading } = useQuery({
    queryKey: ['catalog', 'show', slug],
    queryFn: fetchCatalog,
  })

  const show = catalog?.shows?.find((s: any) => s.slug === slug)

  // Auto-open first season
  const effectiveOpen = openSeason ?? show?.seasons?.[0]?.season_number ?? null

  if (isLoading) {
    return (
      <div className="detail-hero">
        <div className="detail-back" onClick={() => navigate('/')}>← Back</div>
        <div className="detail-hero-content">
          <div className="loading-skeleton" style={{ width: 220, aspectRatio: '2/3' }} />
          <div style={{ flex: 1 }}>
            <div className="loading-skeleton" style={{ height: 40, width: '50%', marginBottom: 16 }} />
            <div className="loading-skeleton" style={{ height: 20, width: '30%', marginBottom: 24 }} />
            <div className="loading-skeleton" style={{ height: 80, width: '80%' }} />
          </div>
        </div>
      </div>
    )
  }

  if (!show) {
    return (
      <div className="detail-hero">
        <div className="empty-state">
          <h2>Show not found</h2>
          <p>This show may not be published yet.</p>
          <button className="filter-pill active" style={{ marginTop: 16 }} onClick={() => navigate('/')}>
            Go home
          </button>
        </div>
      </div>
    )
  }

  const allLangs = [...new Set(
    show.seasons.flatMap((s: any) =>
      s.episodes.flatMap((e: any) => e.languages?.map((l: any) => l.language) || [])
    )
  )]

  return (
    <div className="detail-hero">
      <div className="detail-back" onClick={() => navigate('/')}>← Back</div>

      <div className="detail-hero-content">
        <img
          className="detail-poster"
          src={IMG(show.poster_url) || undefined}
          alt={show.title}
        />
        <div className="detail-info">
          <h1 className="detail-title">{show.title}</h1>
          <div className="detail-meta">
            <span>{show.section}</span>
            <span>·</span>
            {show.seasons.length} season{show.seasons.length !== 1 ? 's' : ''}
            <span>·</span>
            {allLangs.map(l => (
              <span key={l} className="lang-tag">{l === 'en' ? 'EN' : 'HI'}</span>
            ))}
          </div>
          <div className="detail-categories">
            {show.categories?.map((c: any) => (
              <span key={c} className="cat-tag">{c}</span>
            ))}
          </div>
          <p className="detail-synopsis">{show.synopsis}</p>
        </div>
      </div>

      <div className="seasons-list">
        {show.seasons.map((season: any) => {
          const isOpen = effectiveOpen === season.season_number
          return (
            <div key={season.season_number} className="season-accordion">
              <div
                className="season-header"
                onClick={() => setOpenSeason(isOpen ? null : season.season_number)}
              >
                <span>{isOpen ? '▼' : '▶'}</span>
                <span>{season.title || `Season ${season.season_number}`}</span>
                <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                  {season.episodes.length} episode{season.episodes.length !== 1 ? 's' : ''}
                </span>
              </div>

              {isOpen && (
                <div className="season-episodes">
                  <div className="episode-list">
                    {season.episodes.map((ep: any) => (
                      <EpisodeRow key={ep.slug} episode={ep} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EpisodeRow({ episode }: { episode: any }) {
  return (
    <div className="episode-item">
      <div className="episode-num">{episode.episode_number}</div>
      <img
        className="episode-thumb"
        src={IMG(episode.thumbnail_url) || undefined}
        alt={episode.title}
        loading="lazy"
      />
      <div className="episode-info">
        <div className="episode-title">{episode.title}</div>
        {episode.synopsis && (
          <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
            {episode.synopsis.length > 120 ? episode.synopsis.slice(0, 120) + '…' : episode.synopsis}
          </div>
        )}
        <div className="episode-langs">
          {episode.languages?.map((l: any) => (
            <span key={l.language} className="lang-tag">
              {l.language.toUpperCase()}
              {l.duration_seconds ? ` · ${Math.floor(l.duration_seconds / 60)}m` : ''}
            </span>
          ))}
        </div>
      </div>
      <button className="hero-btn" style={{ flexShrink: 0, padding: '8px 16px', fontSize: '.9rem' }}>
        ▶
      </button>
    </div>
  )
}
