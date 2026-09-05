import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--border)', padding: '32px 48px', marginTop: 64, background: 'var(--surface)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 24, fontSize: 13, color: 'var(--text-muted)' }}>
        <div>
          <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 16 }}>Peblo TV</span>
          <p style={{ marginTop: 6, maxWidth: 320, lineHeight: 1.5 }}>
            Curated streaming platform for children in Classes 1–5.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Company & App</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Link to="/about">About Us</Link>
              <Link to="/help">Help & FAQ</Link>
              <Link to="/report">Report a Concern</Link>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Legal & Safety</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/terms">Terms of Service</Link>
              <Link to="/cookies">Cookie Policy</Link>
              <Link to="/accessibility">Accessibility</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
