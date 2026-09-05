import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

// Mirrors backend allowed categories
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

export default function Categories() {
  const { data: shows } = useQuery({
    queryKey: ['shows', 'all'],
    queryFn: () => api.listShows({ limit: 500 }),
  })

  const countFor = (cat: string) =>
    (shows || []).filter((s: any) => s.categories?.includes(cat)).length

  return (
    <div>
      <div className="page-hero">
        <div className="page-hero-text">
          <h1>Categories</h1>
          <p>Topic tags used to organise content across Peblo TV.</p>
        </div>
      </div>
      <div className="simple-page-list">
        {CATEGORIES.map((c) => (
          <div key={c} className="simple-page-item">
            {c}
            <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 4 }}>
              {shows ? `${countFor(c)} show${countFor(c) === 1 ? '' : 's'}` : '…'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
