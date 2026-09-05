import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  addToMyList,
  fetchCatalog,
  fetchMyList,
  IMG,
  removeFromMyList,
  type EpisodeEntry,
} from '../api'
import ProfileMenu from '../components/ProfileMenu'
import { getPreferredLanguage } from '../prefs'

export default function ShowDetail() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [openSeasons, setOpenSeasons] = useState<Set<number> | null>(null)
  const [posterError, setPosterError] = useState(false)
  const [selectedEpisode, setSelectedEpisode] = useState<EpisodeEntry | null>(null)
  const [isInList, setIsInList] = useState(
    () => localStorage.getItem(`peblo-list:${slug}`) === 'true'
  )
  const [shareLabel, setShareLabel] = useState('Share show')
  const [toast, setToast] = useState('')

  const {
    data: catalog,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['catalog'],
    queryFn: fetchCatalog,
  })

  const show = catalog?.shows?.find((s) => s.slug === slug)
  const poster = IMG(show?.poster_url)
  const banner = IMG(show?.banner_url || show?.poster_url)

  const firstSeasonNumber = show?.seasons?.[0]?.season_number
  const visibleSeasons =
    openSeasons ?? new Set(firstSeasonNumber === undefined ? [] : [firstSeasonNumber])

  const toggleSeason = (seasonNumber: number) => {
    setOpenSeasons((previous) => {
      const next = new Set(previous ?? (firstSeasonNumber === undefined ? [] : [firstSeasonNumber]))
      if (next.has(seasonNumber)) next.delete(seasonNumber)
      else next.add(seasonNumber)
      return next
    })
  }

  useEffect(() => {
    if (!slug || !localStorage.getItem('peblo_token')) return
    void fetchMyList()
      .then(({ slugs }) => setIsInList(slugs.includes(slug)))
      .catch(() => undefined)
  }, [slug])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const showToast = (message: string) => setToast(message)
  const handlePlay = () => {
    const firstEpisode = show?.seasons[0]?.episodes[0]
    if (firstEpisode) setSelectedEpisode(firstEpisode)
  }
  const toggleMyList = async () => {
    const nextValue = !isInList
    try {
      if (slug && localStorage.getItem('peblo_token')) {
        if (nextValue) await addToMyList(slug)
        else await removeFromMyList(slug)
      } else if (slug) {
        localStorage.setItem(`peblo-list:${slug}`, String(nextValue))
      }
      setIsInList(nextValue)
      showToast(nextValue ? 'Added to My List' : 'Removed from My List')
    } catch {
      showToast('Sign in to save shows')
    }
  }
  const handleShare = async () => {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: show?.title, url })
      else {
        await navigator.clipboard.writeText(url)
        setShareLabel('Link copied')
        showToast('Link copied')
        window.setTimeout(() => setShareLabel('Share show'), 1800)
      }
    } catch {
      showToast('Sharing cancelled')
    }
  }
  const handleDownload = () => showToast('Available on the Peblo app')

  if (isLoading) {
    return (
      <div className="detail-hero">
        <button className="detail-back" onClick={() => navigate('/')}>
          <span className="back-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M19 12H5M11 18l-6-6 6-6" />
            </svg>
          </span>
          <span>Back to Browse</span>
        </button>
        <div className="detail-hero-content">
          <div className="detail-poster-wrap">
            <div className="loading-skeleton" style={{ width: '100%', height: '100%' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div
              className="loading-skeleton"
              style={{ height: 40, width: '50%', marginBottom: 16 }}
            />
            <div
              className="loading-skeleton"
              style={{ height: 20, width: '30%', marginBottom: 24 }}
            />
            <div className="loading-skeleton" style={{ height: 80, width: '80%' }} />
          </div>
        </div>
      </div>
    )
  }

  if (isError || !show) {
    return (
      <div className="detail-hero">
        <div className="empty-state">
          <h2>{isError ? 'Something went wrong' : 'Show not found'}</h2>
          <p>
            {isError
              ? "We couldn't load this show. Please try again."
              : 'This show may not be published yet.'}
          </p>
          <button
            className="filter-pill active"
            style={{ marginTop: 16, marginRight: 8 }}
            onClick={() => (isError ? refetch() : navigate('/'))}
          >
            {isError ? 'Retry' : 'Go home'}
          </button>
          {isError && (
            <button className="filter-pill" style={{ marginTop: 16 }} onClick={() => navigate('/')}>
              Back to Browse
            </button>
          )}
        </div>
      </div>
    )
  }

  const allLangs: string[] = [
    ...new Set<string>(
      show.seasons.flatMap((s) => s.episodes.flatMap((e) => e.languages.map((l) => l.language)))
    ),
  ]

  const metaParts: string[] = []
  if (show.year) metaParts.push(String(show.year))
  if (show.rating) metaParts.push(String(show.rating))
  const similarShows = (catalog?.shows || [])
    .filter((candidate) => candidate.slug !== show.slug)
    .sort((a, b) => {
      const aMatches = a.categories.filter((category) => show.categories.includes(category)).length
      const bMatches = b.categories.filter((category) => show.categories.includes(category)).length
      return bMatches - aMatches
    })
    .slice(0, 3)

  return (
    <div className="detail-page">
      <header className="detail-topbar">
        <button className="topbar-logo" onClick={() => navigate('/')} aria-label="Peblo TV home">
          Peblo TV
        </button>
        <nav className="topbar-nav" aria-label="Primary navigation">
          <button className="topbar-link" onClick={() => navigate('/')}>
            Home
          </button>
          <button className="topbar-link active" onClick={() => navigate('/')}>
            Series
          </button>
          <button className="topbar-link" onClick={() => navigate('/')}>
            Explore
          </button>
        </nav>
        <button className="search-bar detail-search" onClick={() => navigate('/')} type="button">
          <svg
            className="search-icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <span>Search for shows, characters, songs...</span>
        </button>
        <ProfileMenu />
      </header>
      <div
        className="detail-hero"
        style={{ '--detail-backdrop': `url(${banner})` } as React.CSSProperties}
      >
        <button className="detail-back" onClick={() => navigate('/')}>
          <span className="back-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M19 12H5M11 18l-6-6 6-6" />
            </svg>
          </span>
          <span>Back to Browse</span>
        </button>

        <div className="detail-body">
          <aside className="detail-sidebar">
            <div className="detail-poster-wrap">
              {(!poster || posterError) && <div className="detail-poster-fallback">🎬</div>}
              {poster && !posterError && (
                <img
                  className="detail-poster"
                  src={poster}
                  alt={show.title}
                  onError={() => setPosterError(true)}
                />
              )}
            </div>
            {similarShows.length > 0 && (
              <section className="similar-panel" aria-labelledby="similar-title">
                <h2 id="similar-title">More Like This</h2>
                <div className="similar-grid">
                  {similarShows.map((candidate) => {
                    const candidateImage = IMG(candidate.poster_url || candidate.thumbnail_url)
                    return (
                      <button
                        className="similar-card"
                        key={candidate.slug}
                        onClick={() => navigate(`/show/${candidate.slug}`)}
                      >
                        <span className="similar-card-media">
                          {candidateImage ? (
                            <img src={candidateImage} alt={candidate.title} loading="lazy" />
                          ) : (
                            <span aria-hidden="true">🎬</span>
                          )}
                        </span>
                        <span>{candidate.title}</span>
                      </button>
                    )
                  })}
                </div>
              </section>
            )}
          </aside>
          <main className="detail-main">
            <h1 className="detail-title">{show.title}</h1>
            <div className="detail-meta">
              {metaParts.map((m, i) => (
                <span key={i} className={i === 1 ? 'rating' : undefined}>
                  {m}
                </span>
              ))}
              {metaParts.length > 0 && <span>•</span>}
              <span>{show.section}</span>
              <span>•</span>
              <span>
                {show.seasons.length} season{show.seasons.length !== 1 ? 's' : ''}
              </span>
              {allLangs.map((l) => (
                <span key={l} className="lang-tag">
                  {l.toUpperCase()}
                </span>
              ))}
            </div>
            {show.categories?.length > 0 && (
              <div className="detail-categories">
                {show.categories.map((c) => (
                  <span key={c} className="cat-tag">
                    {c}
                  </span>
                ))}
              </div>
            )}
            <p className="detail-synopsis">{show.synopsis}</p>
            <div className="hero-actions">
              <button
                className="btn-play"
                onClick={handlePlay}
                disabled={!show.seasons[0]?.episodes[0]}
              >
                <svg viewBox="0 0 24 24" className="btn-icon btn-play-icon" aria-hidden="true">
                  <path d="M8 5v14l11-7z" fill="currentColor" />
                </svg>
                Play
              </button>
              <button
                className={`btn-secondary${isInList ? ' selected' : ''}`}
                onClick={toggleMyList}
                aria-pressed={isInList}
              >
                {isInList ? (
                  'Remove'
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="btn-icon" aria-hidden="true">
                      <path d="M19 13H13v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor" />
                    </svg>
                    My List
                  </>
                )}
              </button>
              <button
                className="btn-circle"
                onClick={handleShare}
                aria-label={shareLabel}
                title={shareLabel}
              >
                <svg viewBox="0 0 24 24" className="btn-icon" aria-hidden="true">
                  <path
                    d="M18 16.1c-.8 0-1.4.3-2 .8l-7.1-4.2c0-.2.1-.4.1-.7s0-.5-.1-.7L16 7.2c.5.5 1.2.8 2 .8 1.7 0 3-1.3 3-3s-1.3-3-3-3-3 1.3-3 3c0 .2 0 .5.1.7L8 9.8C7.5 9.3 6.8 9 6 9c-1.7 0-3 1.3-3 3s1.3 3 3 3c.8 0 1.5-.3 2-.8l7.1 4.2c0 .2 0 .4-.1.6 0 1.6 1.4 2.9 3 2.9s3-1.3 3-2.9-1.4-2.9-3-2.9z"
                    fill="currentColor"
                  />
                </svg>
              </button>
              <button
                className="btn-circle"
                onClick={handleDownload}
                aria-label="Download"
                title="Download"
              >
                <svg viewBox="0 0 24 24" className="btn-icon" aria-hidden="true">
                  <path d="M12 16l6-6h-4V4h-4v6H6l6 6zm-8 2h16v2H4v-2z" fill="currentColor" />
                </svg>
              </button>
            </div>
            <div className="seasons-list">
              {show.seasons.map((season) => {
                const isOpen = visibleSeasons.has(season.season_number)
                return (
                  <div key={season.season_number} className="season-accordion">
                    <button
                      className="season-header"
                      onClick={() => toggleSeason(season.season_number)}
                      aria-expanded={isOpen}
                    >
                      <svg
                        className={`chevron${isOpen ? ' open' : ''}`}
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" />
                      </svg>
                      <span>{season.title || `Season ${season.season_number}`}</span>
                      <span className="season-count">
                        {season.episodes.length} episode{season.episodes.length !== 1 ? 's' : ''}
                      </span>
                      <span className="season-tagline">
                        {isOpen ? 'Up for new adventures' : 'New places, new stories'}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="season-episodes">
                        <div className="episode-list">
                          {season.episodes.map((ep) => (
                            <EpisodeRow key={ep.slug} episode={ep} onPlay={setSelectedEpisode} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </main>
        </div>
      </div>
      {selectedEpisode && (
        <VideoPlayer
          episode={selectedEpisode}
          showTitle={show.title}
          onClose={() => setSelectedEpisode(null)}
        />
      )}
      {toast && (
        <div className="action-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}

function EpisodeRow({
  episode,
  onPlay,
}: {
  episode: EpisodeEntry
  onPlay: (episode: EpisodeEntry) => void
}) {
  const [thumbError, setThumbError] = useState(false)
  const thumb = IMG(episode.thumbnail_url || episode.poster_url)
  const totalSeconds = episode.languages.map((l) => l.duration_seconds ?? 0).find((d) => d > 0)
  const duration = totalSeconds && totalSeconds > 0 ? ` · ${Math.floor(totalSeconds / 60)}m` : ''

  return (
    <div className="episode-item">
      <div className="episode-num">{episode.episode_number}</div>
      <div className="episode-thumb-wrap">
        {(!thumb || thumbError) && (
          <div className="episode-thumb-fallback">
            <span aria-hidden="true">◆</span>
          </div>
        )}
        {thumb && !thumbError && (
          <img
            className="episode-thumb"
            src={thumb}
            alt={episode.title}
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = 'none'
              setThumbError(true)
            }}
          />
        )}
      </div>
      <div className="episode-info">
        <div className="episode-title">
          {episode.title}
          {duration && (
            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{duration}</span>
          )}
        </div>
        {episode.synopsis && (
          <div className="episode-synopsis">
            {episode.synopsis.length > 120
              ? episode.synopsis.slice(0, 120) + '…'
              : episode.synopsis}
          </div>
        )}
      </div>
      <div className="episode-langs">
        {episode.languages?.map((l) => (
          <span key={l.language} className="lang-tag">
            {l.language.toUpperCase()}
            {l.duration_seconds ? ` · ${Math.floor(l.duration_seconds / 60)}m` : ''}
          </span>
        ))}
      </div>
      <button
        className="btn-circle episode-play"
        aria-label={`Play ${episode.title}`}
        onClick={() => onPlay(episode)}
      >
        <svg viewBox="0 0 24 24" className="btn-icon" aria-hidden="true">
          <path d="M8 5v14l11-7z" fill="currentColor" />
        </svg>
      </button>
    </div>
  )
}

function VideoPlayer({
  episode,
  showTitle,
  onClose,
}: {
  episode: EpisodeEntry
  showTitle: string
  onClose: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<HTMLDivElement>(null)
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [isLoading, setIsLoading] = useState(Boolean(getEpisodeUrl(episode)))
  const [mediaError, setMediaError] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const source = getEpisodeUrl(episode)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.target instanceof HTMLInputElement) return
      if (event.key === ' ') {
        event.preventDefault()
        togglePlayback()
      }
      if (event.key === 'ArrowLeft') seek(-10)
      if (event.key === 'ArrowRight') seek(10)
      if (event.key.toLowerCase() === 'm') toggleMute()
      if (event.key.toLowerCase() === 'f') toggleFullscreen()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
      if (controlsTimer.current) clearTimeout(controlsTimer.current)
    }
  })

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.debug('[Peblo TV] episode playback data', episode)
    }
  }, [episode])

  useEffect(() => {
    const updateFullscreen = () => setIsFullscreen(document.fullscreenElement === playerRef.current)
    document.addEventListener('fullscreenchange', updateFullscreen)
    return () => document.removeEventListener('fullscreenchange', updateFullscreen)
  }, [])

  const showControls = () => {
    setControlsVisible(true)
    if (controlsTimer.current) clearTimeout(controlsTimer.current)
    if (isPlaying) {
      controlsTimer.current = setTimeout(() => setControlsVisible(false), 3000)
    }
  }

  const togglePlayback = () => {
    const video = videoRef.current
    if (!video || !source || mediaError) return
    if (video.paused) {
      void video.play()
    } else {
      video.pause()
    }
  }

  const seek = (seconds: number) => {
    const video = videoRef.current
    if (video)
      video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds))
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setIsMuted(video.muted)
  }

  const changeVolume = (value: number) => {
    const video = videoRef.current
    if (!video) return
    video.volume = value
    video.muted = value === 0
    setVolume(value)
    setIsMuted(video.muted)
  }

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void playerRef.current?.requestFullscreen()
    }
  }

  const updateProgress = () => {
    const video = videoRef.current
    if (!video) return
    setCurrentTime(video.currentTime)
    setDuration(video.duration || 0)
    if (video.buffered.length) setBuffered(video.buffered.end(video.buffered.length - 1))
  }

  const retry = () => {
    const video = videoRef.current
    if (!video) return
    setMediaError(false)
    setIsLoading(true)
    video.load()
    void video.play().catch(() => undefined)
  }

  const progress = duration ? (currentTime / duration) * 100 : 0
  const bufferedProgress = duration ? (buffered / duration) * 100 : 0

  return (
    <div
      className="video-player-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`${episode.title} video player`}
      onMouseMove={showControls}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="video-player" ref={playerRef}>
        <button className="video-player-close" onClick={onClose} aria-label="Close player">
          ✕
        </button>
        <div className="video-stage">
          {source ? (
            <video
              ref={videoRef}
              src={source}
              poster={IMG(episode.banner_url || episode.thumbnail_url || episode.poster_url)}
              preload="metadata"
              onCanPlay={() => setIsLoading(false)}
              onLoadedMetadata={updateProgress}
              onTimeUpdate={updateProgress}
              onProgress={updateProgress}
              onPlay={() => {
                setIsPlaying(true)
                showControls()
              }}
              onPause={() => {
                setIsPlaying(false)
                setControlsVisible(true)
              }}
              onEnded={() => setIsPlaying(false)}
              onError={() => {
                setIsLoading(false)
                setMediaError(true)
              }}
              onClick={togglePlayback}
            />
          ) : (
            <div className="video-player-unavailable">
              <span aria-hidden="true">▶</span>
              <p>Episode coming soon</p>
            </div>
          )}
          {source && isLoading && <div className="video-player-spinner" aria-label="Loading" />}
          {source && mediaError && (
            <div className="video-player-message">
              <strong>Playback error — try again</strong>
              <span>There was a problem loading this episode.</span>
              <button className="video-player-retry" onClick={retry}>
                Retry
              </button>
            </div>
          )}
          {source && !mediaError && !isLoading && !isPlaying && (
            <button className="video-player-center-play" onClick={togglePlayback} aria-label="Play">
              ▶
            </button>
          )}
          {source && !mediaError && (
            <div className={`video-player-controls${controlsVisible ? ' visible' : ''}`}>
              <div
                className="video-progress"
                style={
                  {
                    '--buffered': `${bufferedProgress}%`,
                    '--progress': `${progress}%`,
                  } as React.CSSProperties
                }
              >
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  step="0.1"
                  value={currentTime}
                  onChange={(event) => {
                    const nextTime = Number(event.target.value)
                    if (videoRef.current) videoRef.current.currentTime = nextTime
                    setCurrentTime(nextTime)
                  }}
                  aria-label="Seek video"
                />
              </div>
              <div className="video-control-row">
                <button onClick={togglePlayback} aria-label={isPlaying ? 'Pause' : 'Play'}>
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <button onClick={() => seek(-10)} aria-label="Back 10 seconds">
                  ↶10
                </button>
                <button onClick={() => seek(10)} aria-label="Forward 10 seconds">
                  10↷
                </button>
                <span className="video-time">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
                <div className="video-volume">
                  <button onClick={toggleMute} aria-label={isMuted ? 'Unmute' : 'Mute'}>
                    {isMuted ? '🔇' : '🔊'}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(event) => changeVolume(Number(event.target.value))}
                    aria-label="Volume"
                  />
                </div>
              </div>
            </div>
          )}
          <button
            className="video-player-fullscreen"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? '⛶' : '⛶'}
          </button>
        </div>
        <div className="video-player-caption">
          <span>{showTitle}</span>
          <h2>{episode.title}</h2>
        </div>
      </div>
    </div>
  )
}

function getEpisodeUrl(episode: EpisodeEntry): string {
  const preferred = getPreferredLanguage()
  const language =
    (preferred && episode.languages.find((variant) => variant.language === preferred)) ||
    episode.languages[0]
  const url =
    episode.video_url ||
    episode.hls_url ||
    episode.stream_url ||
    language?.video_url ||
    language?.hls_url ||
    language?.stream_url
  if (!url) return ''
  if (/^https?:\/\//.test(url) || url.startsWith('/')) return url
  return IMG(url)
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0')}`
}
