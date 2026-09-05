import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Report() {
  const navigate = useNavigate()
  const [category, setCategory] = useState('')
  const [targetId, setTargetId] = useState('')
  const [email, setEmail] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!category) {
      setErrMsg('Please select a concern category.')
      return
    }
    if (!description.trim()) {
      setErrMsg('Please enter a description for your concern.')
      return
    }
    setStatus('submitting')
    setErrMsg('')

    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          target_id: targetId.trim() || undefined,
          reporter_email: email.trim() || undefined,
          description: description.trim(),
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || 'Failed to submit report')
      }

      setStatus('success')
    } catch (err: any) {
      setErrMsg(err.message || 'Submission failed. Please try again.')
      setStatus('error')
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0812',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        color: '#f0ecfc',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 680,
          background: '#13101e',
          border: '1px solid #26203b',
          borderRadius: 16,
          padding: '32px 36px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
          position: 'relative',
        }}
      >
        <button
          onClick={() => navigate(-1)}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 24,
            right: 24,
            background: 'none',
            border: 'none',
            color: '#766e94',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 24 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: '#22193e',
              border: '1px solid #36295e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#a78bfa',
              flexShrink: 0,
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px', color: '#ffffff' }}>
              Report a Concern
            </h1>
            <p style={{ margin: 0, fontSize: 13.5, color: '#978eb8', lineHeight: 1.4 }}>
              Help us keep our platform safe by reporting inappropriate content or other issues.
            </p>
          </div>
        </div>

        {status === 'success' ? (
          <div
            style={{
              background: 'rgba(52, 211, 153, 0.1)',
              border: '1px solid rgba(52, 211, 153, 0.3)',
              borderRadius: 12,
              padding: 24,
              textAlign: 'center',
            }}
          >
            <h2 style={{ fontSize: 18, color: '#34d399', marginBottom: 8 }}>Concern Submitted</h2>
            <p style={{ fontSize: 14, color: '#a49cc0', marginBottom: 20 }}>
              Thank you for helping keep Peblo TV safe. Our moderation team will review this
              report.
            </p>
            <Link to="/" className="btn btn-primary" style={{ display: 'inline-block' }}>
              Back to Home
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
          >
            {errMsg && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                }}
              >
                {errMsg}
              </div>
            )}

            <div>
              <label
                htmlFor="report-category"
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#d1cbe8',
                  marginBottom: 8,
                }}
              >
                Concern Category <span style={{ color: '#ff4d6d' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  id="report-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    width: '100%',
                    height: 46,
                    background: '#191526',
                    border: '1px solid #2d2645',
                    borderRadius: 10,
                    padding: '0 40px 0 16px',
                    color: category ? '#f0ecfc' : '#736b91',
                    fontSize: 14,
                    outline: 'none',
                    appearance: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="" disabled>
                    Select a category
                  </option>
                  <option value="content_issue">Inappropriate Content or Inaccuracy</option>
                  <option value="playback_bug">Video or Audio Playback Error</option>
                  <option value="privacy">Privacy Concern</option>
                  <option value="other">Other Issue</option>
                </select>
                <div
                  style={{
                    position: 'absolute',
                    right: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: '#736b91',
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="report-target"
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#d1cbe8',
                  marginBottom: 8,
                }}
              >
                Show or Episode Name / ID{' '}
                <span style={{ color: '#8880a6', fontWeight: 400 }}>(Optional)</span>
              </label>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#6e658e',
                    display: 'flex',
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </div>
                <input
                  id="report-target"
                  type="text"
                  placeholder="e.g. Moti Adventures Episode 1"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  style={{
                    width: '100%',
                    height: 46,
                    background: '#191526',
                    border: '1px solid #2d2645',
                    borderRadius: 10,
                    padding: '0 16px 0 44px',
                    color: '#f0ecfc',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="report-email"
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#d1cbe8',
                  marginBottom: 8,
                }}
              >
                Parent / Guardian Contact Email{' '}
                <span style={{ color: '#8880a6', fontWeight: 400 }}>(Optional)</span>
              </label>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#6e658e',
                    display: 'flex',
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <input
                  id="report-email"
                  type="email"
                  placeholder="parent@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    height: 46,
                    background: '#191526',
                    border: '1px solid #2d2645',
                    borderRadius: 10,
                    padding: '0 16px 0 44px',
                    color: '#f0ecfc',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="report-desc"
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#d1cbe8',
                  marginBottom: 8,
                }}
              >
                Description <span style={{ color: '#ff4d6d' }}>*</span>
              </label>
              <div
                style={{
                  position: 'relative',
                  background: '#191526',
                  border: '1px solid #2d2645',
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: 14,
                    color: '#6e658e',
                    display: 'flex',
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
                <textarea
                  id="report-desc"
                  maxLength={1000}
                  placeholder="Please explain the concern in detail..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    width: '100%',
                    height: 110,
                    background: 'transparent',
                    border: 'none',
                    padding: '2px 0 24px 34px',
                    color: '#f0ecfc',
                    fontSize: 14,
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    right: 14,
                    bottom: 10,
                    fontSize: 12,
                    color: '#6e658e',
                  }}
                >
                  {description.length}/1000
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
              <button
                type="submit"
                disabled={status === 'submitting'}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '0 24px',
                  height: 44,
                  background: '#6c38ff',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                {status === 'submitting' ? 'Submitting…' : 'Submit Concern'}
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                style={{
                  padding: '0 24px',
                  height: 44,
                  background: 'transparent',
                  color: '#d1cbe8',
                  border: '1px solid #2f2a4a',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
