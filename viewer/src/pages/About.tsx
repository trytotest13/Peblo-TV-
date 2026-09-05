import { Link } from 'react-router-dom'

export default function About() {
  return (
    <div
      className="legal-page-container"
      style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}
    >
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>About Peblo TV</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6 }}>
        Peblo TV is a curated digital video streaming platform built for children in Primary Classes
        1–5 (ages 6–10).
      </p>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Curated Educational & Entertainment Shows</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Peblo TV offers high-quality episodes across multiple categories including Science,
          Stories, Math, and General Knowledge. All content is pre-validated by our editorial safety
          team before being published.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Multilingual Audio Support</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Children can watch episodes with audio tracks in multiple Indian languages, helping kids
          learn and enjoy content in their primary or secondary language.
        </p>
      </section>

      <div style={{ marginTop: 32 }}>
        <Link to="/" className="btn btn-primary">
          Back to Browse
        </Link>
      </div>
    </div>
  )
}
