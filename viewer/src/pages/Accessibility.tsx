import { Link } from 'react-router-dom'

export default function Accessibility() {
  return (
    <div className="legal-page-container" style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>Accessibility Statement</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6 }}>
        Peblo TV aims to make video streaming accessible to all children and families.
      </p>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Features & Commitments</h2>
        <ul style={{ color: 'var(--text-muted)', paddingLeft: 20, lineHeight: 1.6, marginTop: 8 }}>
          <li>High-contrast dark mode interfaces for comfortable viewing.</li>
          <li>Keyboard navigation support across all pages, search, and video playback.</li>
          <li>Visible focus outlines for interactive buttons and inputs.</li>
          <li>ARIA labels on icons and interactive elements for screen reader compatibility.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Feedback</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
          If you encounter accessibility obstacles, please reach out via our Content Concern / Feedback form.
        </p>
      </section>

      <div style={{ marginTop: 32 }}>
        <Link to="/" className="btn btn-primary">
          Back to Home
        </Link>
      </div>
    </div>
  )
}
