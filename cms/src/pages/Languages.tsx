import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

const LANGUAGES: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
]

export default function Languages() {
  const { data: shows } = useQuery({
    queryKey: ['shows', 'all'],
    queryFn: () => api.listShows({ limit: 500 }),
  })

  return (
    <div>
      <div className="page-hero">
        <div className="page-hero-text">
          <h1>Languages</h1>
          <p>Languages supported across the Peblo TV catalogue.</p>
        </div>
      </div>
      <div className="simple-page-list">
        {LANGUAGES.map((l) => (
          <div key={l.code} className="simple-page-item">
            {l.label} <span style={{ color: 'var(--color-muted)', fontSize: 12 }}>({l.code})</span>
            <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 4 }}>
              Available across {shows?.length ?? '…'} shows
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
