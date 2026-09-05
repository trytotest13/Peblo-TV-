import { Link } from 'react-router-dom'
import { SUPPORT_CONTACT_EMPTY_TEXT, SUPPORT_EMAIL } from '../lib/contact'

export default function Terms() {
  return (
    <div
      className="legal-page-container"
      style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}
    >
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>Terms of Service</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6 }}>
        Welcome to Peblo TV. By using our website or app, you agree to these terms.
      </p>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>1. Platform Use</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Peblo TV is designed for child education and entertainment under parental or guardian
          supervision. Content may not be copied, redistributed, or repurposed without
          authorization.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>2. Accounts and Access</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Optional account creation allows saving watchlist items ("My List") and preferences.
          Parents and guardians remain responsible for managing account access on behalf of
          children.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>3. Content Availability</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Shows and episodes may be updated or replaced as part of catalogue editorial management.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>4. Contact</h2>
        {SUPPORT_EMAIL ? (
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        ) : (
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {SUPPORT_CONTACT_EMPTY_TEXT}
          </p>
        )}
      </section>

      <div style={{ marginTop: 32 }}>
        <Link to="/" className="btn btn-primary">
          Back to Home
        </Link>
      </div>
    </div>
  )
}
