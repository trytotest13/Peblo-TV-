import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { fetchCatalog, searchCatalog, IMG } from '../api'

const SECTIONS = ['featured', 'series', 'minisodes', 'songs']
const LANGUAGES = ['en', 'hi']

export default function Home() {
  const [search, setSearch] = useState('')
  const [activeSection, setActiveSection] = useState('')
  const [activeLang, setActiveLang] = useState('')
  const [activeCat, setActiveCat] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const topbarRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Use search query when active, otherwise use the full catalog
  const { data: catalog, isLoading } = useQuery({
    queryKey: ['catalog', search],
    queryFn: () =>
      search
        ? searchCatalog({
            q: search,
            section: activeSection || undefined,
            category: activeCat || undefined,
            language: activeLang || undefined,
          }).then((r) => ({ shows: r.results || [] }))
        : fetchCatalog(),
  })

  const shows = catalog?.shows || []
  const featured = shows.find((s: any) => s.section === 'featured') || shows[0]

  // Apply section/language/category filters on top of catalog (or search results)
  const filteredShows = shows.filter((s: any) => {
    if (activeSection && s.section !== activeSection) return false
    if (activeCat && !s.categories?.includes(activeCat)) return false
    if (
      activeLang &&
      !s.seasons?.some((se: any) =>
        se.episodes?.some((ep: any) => ep.languages?.some((l: any) => l.language === activeLang))
      )
    )
      return false
    return true
  })

  const sections = activeSection ? [activeSection] : SECTIONS

  const clearFilters = () => {
    setActiveSection('')
    setActiveLang('')
    setActiveCat('')
    setSearch('')
  }

  const hasFilters = search || activeSection || activeLang || activeCat

  return (
    <div>
      {/* Topbar */}
      <div ref={topbarRef} className={`topbar ${scrolled ? 'scrolled' : ''}`}>
        <span className="topbar-logo">Peblo TV</span>
        <div className="topbar-links">
          <a href="#">Home</a>
        </div>
        <div className="search-bar">
          <span>🔍</span>
          <input
            placeholder="Search shows, episodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setSearch(search)}
          />
        </div>
      </div>

      {/* Hero */}
      {featured && !hasFilters && (
        <div className="hero">
          <div
            className="hero-bg"
            style={{ backgroundImage: `url(${IMG(featured.banner_url || featured.poster_url)})` }}
          />
          <div className="hero-gradient" />
          <div className="hero-content">
            <div className="hero-title">{featured.title}</div>
            <div className="hero-synopsis">{featured.synopsis}</div>
            <button className="hero-btn" onClick={() => navigate(`/show/${featured.slug}`)}>
              ▶ Play
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filter-row">
        <button
          className={`filter-pill ${!activeSection && !activeLang && !activeCat ? 'active' : ''}`}
          onClick={clearFilters}
        >
          All
        </button>
        {SECTIONS.map((s) => (
          <button
            key={s}
            className={`filter-pill ${activeSection === s ? 'active' : ''}`}
            onClick={() => setActiveSection(activeSection === s ? '' : s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <span style={{ width: 1, background: 'rgba(255,255,255,.1)', margin: '0 4px' }} />
        {LANGUAGES.map((l) => (
          <button
            key={l}
            className={`filter-pill ${activeLang === l ? 'active' : ''}`}
            onClick={() => setActiveLang(activeLang === l ? '' : l)}
          >
            {l === 'en' ? 'English' : 'हिंदी'}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{ padding: 40 }}>
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

      {/* Empty */}
      {!isLoading && filteredShows.length === 0 && (
        <div className="empty-state">
          <h2>No results found</h2>
          <p>Try different search terms or clear your filters.</p>
          <button className="filter-pill active" style={{ marginTop: 16 }} onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      )}

      {/* Rows by section */}
      {!hasFilters ? (
        sections.map((section) => {
          const sectionShows = filteredShows.filter((s: any) => s.section === section)
          if (sectionShows.length === 0) return null
          return (
            <div key={section} className="section-row">
              <div className="section-title">
                {section.charAt(0).toUpperCase() + section.slice(1)}
              </div>
              <div className="row-scroll">
                {sectionShows.map((show: any) => (
                  <ShowCard key={show.slug} show={show} />
                ))}
              </div>
            </div>
          )
        })
      ) : (
        /* Single combined row for filtered view */
        <div className="section-row">
          <div className="section-title">
            {search ? `Results for "${search}"` : 'Shows'}
            {activeSection && ` — ${activeSection}`}
            {activeLang && ` — ${activeLang}`}
          </div>
          <div className="row-scroll">
            {filteredShows.map((show: any) => (
              <ShowCard key={show.slug} show={show} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ShowCard({ show }: { show: any }) {
  const [hovered, setHovered] = useState(false)
  return (
    <Link
      to={`/show/${show.slug}`}
      className="show-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        src={IMG(hovered ? show.banner_url || show.thumbnail_url : show.poster_url) || undefined}
        alt={show.title}
        loading="lazy"
      />
      <div className="show-card-title">{show.title}</div>
    </Link>
  )
}
