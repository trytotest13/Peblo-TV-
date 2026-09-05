import { Link } from 'react-router-dom'
import { SUPPORT_CONTACT_EMPTY_TEXT, SUPPORT_EMAIL } from '../lib/contact'

// TODO(legal): pending DPDP parental-consent review — see
// docs/PRODUCTION_PAGE_AUDIT.md §Children's Data. Do not remove.

export default function Privacy() {
  return (
    <div
      className="legal-page-container"
      style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}
    >
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>Privacy Policy</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6 }}>
        Peblo TV is committed to protecting the privacy of children and families.
      </p>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>1. Data We Collect</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
          We collect minimal information necessary to deliver content:
        </p>
        <ul style={{ color: 'var(--text-muted)', paddingLeft: 20, lineHeight: 1.6, marginTop: 8 }}>
          <li>Account credentials (email, hashed password) for optional user accounts.</li>
          <li>
            Local preferences (language selection, watchlist items stored in browser storage).
          </li>
          <li>System logs and technical error diagnostics for service reliability.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>2. Protection of Children's Data</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Peblo TV does not sell personal data or serve targeted third-party advertising to
          children. In compliance with DPDP and child privacy guidelines, parental consent is
          recommended when setting up user accounts.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>3. Data Storage & Security</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Data is transmitted securely over HTTPS and stored using authenticated backend databases
          with access controls.
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
