import { Link } from 'react-router-dom'
import { SUPPORT_CONTACT_EMPTY_TEXT, SUPPORT_EMAIL } from '../lib/contact'

export default function Help() {
  return (
    <div
      className="legal-page-container"
      style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}
    >
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>Help & Frequently Asked Questions</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6 }}>
        Find answers to common questions about using Peblo TV.
      </p>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, marginBottom: 6 }}>
          How do I change the audio language of a show?
        </h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
          You can select your preferred audio language in <strong>Settings</strong> or directly
          inside the video player while watching an episode.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, marginBottom: 6 }}>How do I save shows to watch later?</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Click the <strong>+ My List</strong> button on any show detail page to save it. You can
          access all your saved shows under <strong>My List</strong> in the top navigation.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, marginBottom: 6 }}>Is Peblo TV safe for children?</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Yes. All shows and episodes are thoroughly reviewed by our content moderation team before
          being published to the catalogue.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, marginBottom: 6 }}>Still need help?</h2>
        {SUPPORT_EMAIL ? (
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        ) : (
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {SUPPORT_CONTACT_EMPTY_TEXT}
          </p>
        )}
      </section>

      <div style={{ marginTop: 32, display: 'flex', gap: 12 }}>
        <Link to="/report" className="btn btn-outline">
          Report a Content Concern
        </Link>
        <Link to="/" className="btn btn-primary">
          Back to Home
        </Link>
      </div>
    </div>
  )
}
