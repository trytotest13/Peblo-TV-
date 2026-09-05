import React from 'react'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="state-container state-404">
      <h1 className="state-code">404</h1>
      <h2 className="state-title">Page Not Found</h2>
      <p className="state-message">The page or show you are looking for does not exist.</p>
      <Link to="/" className="btn btn-primary">
        Back to Home
      </Link>
    </div>
  )
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Unhandled UI Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="state-container state-500" role="alert">
          <h1 className="state-code">500</h1>
          <h2 className="state-title">Unexpected Error</h2>
          <p className="state-message">
            Something unexpected occurred. Please refresh or navigate back to safety.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => {
              this.setState({ hasError: false })
              window.location.href = '/'
            }}
          >
            Return to Safety
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
