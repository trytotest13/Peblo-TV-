import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { fetchCatalog, searchCatalog, IMG, type Show } from '../api'

const SECTIONS = ['featured', 'series', 'minisodes']
const LANGUAGES = ['en', 'hi'] as const

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function showHasLanguage(show: Show, lang: string): boolean {
  return show.seasons.some((season) =>
    season.episodes.some((ep) => ep.languages.some((l) => l.language === lang))
  )
}

export default function Home() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [activeSection, setActiveSection] = useState('')
  const [activeLang, setActiveLang] = useState('')
  const [activeCat, setActiveCat] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce search so we don't fire a request on every keystroke
  const handleSearchChange = (val: string) => {
    setSearch(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(val.trim()), 400)
  }

  const applySearchNow = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setDebouncedSearch(search.trim())
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Global `/` keyboard shortcut → focus the search input (unless the user
  // is already typing in another field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/') return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
        return
      }
      e.preventDefault()
      const input = document.querySelector<HTMLInputElement>('.search-bar input')
      input?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const {
    data: catalog,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['catalog', debouncedSearch, activeSection, activeCat, activeLang],
    queryFn: () =>
      debouncedSearch
        ? searchCatalog({
            q: debouncedSearch,
            section: activeSection || undefined,
            category: activeCat || undefined,
            language: activeLang || undefined,
          }).then((r) => ({ shows: r.results || [] }))
        : fetchCatalog(),
  })

  const shows: Show[] = catalog?.shows || []
  const featured = shows.find((s) => s.section === 'featured') || shows[0]

  // Backend already applies section/category/language when searching —
  // client-side filtering only applies to the full catalog.
  const isSearching = debouncedSearch.length > 0
  const filteredShows: Show[] = isSearching
    ? shows
    : shows.filter((s) => {
        if (activeSection && s.section !== activeSection) return false
        if (activeCat && !s.categories?.includes(activeCat)) return false
        if (activeLang && !showHasLanguage(s, activeLang)) return false
        return true
      })

  // Categories derived from data (curated whitelist)
  const ALLOWED_CATEGORIES = ['adventure', 'folk', 'learning', 'music', 'nature', 'science']
  const visibleCategories: string[] = [...new Set(shows.flatMap((s) => s.categories || []))]
    .sort()
    .filter((c) => ALLOWED_CATEGORIES.includes(c))

  // Browse shows the curated sections; search shows whatever sections the results contain
  // (so removed sections like songs can still surface via search).
  const sections = activeSection
    ? [activeSection]
    : isSearching
      ? [...new Set(filteredShows.map((s) => s.section))]
      : SECTIONS

  const clearFilters = () => {
    setActiveSection('')
    setActiveLang('')
    setActiveCat('')
    setSearch('')
    setDebouncedSearch('')
  }

  const hasFilters = Boolean(debouncedSearch || activeSection || activeLang || activeCat)
  const showHero = Boolean(featured && !hasFilters)

  const goHome = () => {
    clearFilters()
    navigate('/')
  }

  return (
    <div className="home-page">
      {/* Topbar — transparent only while hero is visible AND page is at top */}
      <div className={`topbar${scrolled ? ' scrolled' : ''}${showHero ? ' hero-active' : ''}`}>
        <button className="topbar-logo" onClick={goHome} aria-label="Peblo TV home">
          Peblo TV
        </button>
        <nav className="topbar-nav" aria-label="Primary navigation">
          <button className={`topbar-link${!activeSection ? ' active' : ''}`} onClick={goHome}>
            Home
          </button>
          <button
            className={`topbar-link${activeSection === 'series' ? ' active' : ''}`}
            onClick={() => setActiveSection('series')}
          >
            Series
          </button>
          <button
            className={`topbar-link${activeSection === 'featured' ? ' active' : ''}`}
            onClick={() => setActiveSection('featured')}
          >
            Explore
          </button>
        </nav>
        <div className="search-bar">
          <svg
            className="search-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            placeholder="Search by title, slug, or keyword"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applySearchNow()
            }}
          />
          {!search && (
            <kbd className="search-kbd" aria-hidden="true">
              /
            </kbd>
          )}
          {search && (
            <button
              type="button"
              className="search-clear"
              aria-label="Clear search"
              onClick={() => {
                setSearch('')
                setDebouncedSearch('')
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Hero — hidden entirely when search/filters are active */}
      {showHero && (
        <div className="hero">
          {IMG(featured.banner_url || featured.poster_url) ? (
            <div
              className="hero-bg"
              style={{
                backgroundImage: `url(${IMG(featured.banner_url || featured.poster_url)})`,
              }}
            />
          ) : (
            <div className="hero-bg-fallback" />
          )}
          <div className="hero-gradient" />
          <div className="hero-content">
            <div className="hero-tagline">Big Stories · Small Hearts · Brighter Tomorrows</div>
            <div className="hero-title">{featured.title}</div>
            <div className="hero-synopsis">{featured.synopsis}</div>
            <button className="hero-btn" onClick={() => navigate(`/show/${featured.slug}`)}>
              ▶ Play
            </button>
          </div>
        </div>
      )}

      {/* Filter row — sticky under topbar, horizontally scrollable */}
      <div className="filter-row">
        <button className={`filter-pill${!hasFilters ? ' active' : ''}`} onClick={clearFilters}>
          All
        </button>
        {SECTIONS.map((s) => (
          <button
            key={s}
            className={`filter-pill${activeSection === s ? ' active' : ''}`}
            onClick={() => setActiveSection(activeSection === s ? '' : s)}
          >
            {titleCase(s)}
          </button>
        ))}
        <span className="filter-divider" />
        {LANGUAGES.map((l) => (
          <button
            key={l}
            className={`filter-pill${activeLang === l ? ' active' : ''}`}
            onClick={() => setActiveLang(activeLang === l ? '' : l)}
          >
            {l === 'en' ? 'English' : 'हिंदी'}
          </button>
        ))}
        {visibleCategories.map((c) => (
          <button
            key={c}
            className={`filter-pill${activeCat === c ? ' active' : ''}`}
            onClick={() => setActiveCat(activeCat === c ? '' : c)}
          >
            {c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      {/* Loading — shimmer skeleton */}
      {isLoading && (
        <div className="loading-block">
          <div
            className="loading-skeleton"
            style={{ height: 220, width: '100%', marginBottom: 12 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="loading-skeleton"
                style={{ flex: 1, aspectRatio: '2/3', borderRadius: 4 }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {!isLoading && isError && (
        <div className="empty-state">
          <h2>Something went wrong</h2>
          <p>We couldn&apos;t load the catalogue. Please try again.</p>
          <button
            className="filter-pill active"
            style={{ marginTop: 16 }}
            onClick={() => refetch()}
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && filteredShows.length === 0 && (
        <div className="empty-state">
          <div className="empty-illustration" aria-hidden="true">
            ⌁
          </div>
          <h2>No results found</h2>
          <p>
            We couldn&apos;t find any shows matching your filters.
            <br />
            Try changing or clearing your filters.
          </p>
          <button className="filter-pill active" style={{ marginTop: 16 }} onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      )}

      {/* Section rows — same layout with or without filters; empty rows removed */}
      {!isLoading &&
        !isError &&
        sections.map((section) => {
          let sectionShows = filteredShows.filter((s) => s.section === section)
          // For featured section, if fewer than 5 shows are assigned to featured, curate top shows so row is populated
          if (
            section === 'featured' &&
            sectionShows.length < 5 &&
            !activeSection &&
            !activeCat &&
            !activeLang &&
            !debouncedSearch
          ) {
            sectionShows = filteredShows.slice(0, 9)
          }
          if (sectionShows.length === 0) return null
          return (
            <div key={section} className="section-row">
              <div className="section-header">
                <h2 className="section-title">
                  {isSearching
                    ? `${titleCase(section)} — Results for "${debouncedSearch}"`
                    : titleCase(section)}
                  <span className="section-count">{sectionShows.length}</span>
                </h2>
                {!isSearching && (
                  <button
                    className="see-all-link"
                    onClick={() => setActiveSection(activeSection === section ? '' : section)}
                  >
                    <span>See All</span>
                    <svg viewBox="0 0 24 24" className="see-all-arrow" aria-hidden="true">
                      <path
                        d="M5 12h14M13 6l6 6-6 6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                )}
              </div>
              <div className="row-scroll">
                {sectionShows.map((show) => (
                  <ShowCard key={show.slug} show={show} />
                ))}
              </div>
            </div>
          )
        })}
    </div>
  )
}

function ShowCard({ show }: { show: Show }) {
  const src = IMG(show.poster_url || show.thumbnail_url || show.banner_url)
  const hoverSrc = IMG(show.banner_url || show.thumbnail_url)

  return (
    <Link to={`/show/${show.slug}`} className="show-card">
      <div className="show-card-media">
        <div className="show-card-img-fallback">
          <span aria-hidden="true">🎬</span>
        </div>
        {src && (
          <img
            src={src}
            alt={show.title}
            loading="lazy"
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        )}
        {hoverSrc && hoverSrc !== src && (
          <img
            className="img-hover"
            src={hoverSrc}
            alt=""
            aria-hidden="true"
            loading="lazy"
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        )}
      </div>
      <div className="show-card-title">{show.title}</div>
      <div className="show-card-meta">
        {titleCase(show.section)} <span>·</span> {show.rating || 'U'}
      </div>
    </Link>
  )
}
