import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { fetchCatalog, fetchMyList, IMG } from '../api'

export default function MyList() {
  const navigate = useNavigate()
  const hasToken = Boolean(localStorage.getItem('peblo_token'))
  const catalogQuery = useQuery({ queryKey: ['catalog'], queryFn: fetchCatalog })
  const listQuery = useQuery({
    queryKey: ['my-list'],
    queryFn: fetchMyList,
    enabled: hasToken,
  })

  if (catalogQuery.isLoading || (hasToken && listQuery.isLoading)) {
    return (
      <div className="empty-state">
        <h2>Loading My List...</h2>
      </div>
    )
  }

  if (catalogQuery.isError || (hasToken && listQuery.isError)) {
    return (
      <div className="empty-state">
        <h2>Could not load My List</h2>
        <p>Please try again in a moment.</p>
      </div>
    )
  }

  const localSlugs = (catalogQuery.data?.shows || [])
    .filter((show) => localStorage.getItem(`peblo-list:${show.slug}`) === 'true')
    .map((show) => show.slug)
  const savedSlugs = new Set(hasToken ? listQuery.data?.slugs || [] : localSlugs)
  const shows = (catalogQuery.data?.shows || []).filter((show) => savedSlugs.has(show.slug))

  return (
    <div className="my-list-page">
      <header className="my-list-header">
        <button className="topbar-logo" onClick={() => navigate('/')} aria-label="Peblo TV home">
          Peblo TV
        </button>
        <button className="detail-back" onClick={() => navigate('/')}>
          ← Back to Browse
        </button>
      </header>
      <main className="my-list-content">
        <h1>My List</h1>
        {shows.length === 0 ? (
          <div className="empty-state">
            <h2>Your list is empty</h2>
            <p>Add shows from their detail page to find them here.</p>
          </div>
        ) : (
          <div className="my-list-grid">
            {shows.map((show) => (
              <Link key={show.slug} to={`/show/${show.slug}`} className="my-list-card">
                <div className="my-list-card-media">
                  {IMG(show.poster_url || show.thumbnail_url) ? (
                    <img src={IMG(show.poster_url || show.thumbnail_url)} alt={show.title} />
                  ) : (
                    <span aria-hidden="true">🎬</span>
                  )}
                </div>
                <span>{show.title}</span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
