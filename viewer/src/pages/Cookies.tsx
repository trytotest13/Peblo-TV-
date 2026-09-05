import { Link } from 'react-router-dom'

export default function Cookies() {
  return (
    <div
      className="legal-page-container"
      style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}
    >
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>Cookie & Local Storage Policy</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6 }}>
        Peblo TV uses essential browser local storage to operate the application.
      </p>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Essential Storage Keys Used</h2>
        <ul style={{ color: 'var(--text-muted)', paddingLeft: 20, lineHeight: 1.6, marginTop: 8 }}>
          <li>
            <strong style={{ color: 'var(--text)' }}>peblo_token</strong>: Stores JWT authentication
            token when logged in.
          </li>
          <li>
            <strong style={{ color: 'var(--text)' }}>peblo_prefs</strong>: Remembers your preferred
            audio language setting.
          </li>
          <li>
            <strong style={{ color: 'var(--text)' }}>peblo_my_list</strong>: Saves your bookmarked
            shows for offline or fast access.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>No Non-Essential Tracking Cookies</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
          We do not use third-party advertising cookies or cross-site tracking scripts.
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
