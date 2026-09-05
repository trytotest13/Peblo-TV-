import React from 'react'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="state-container state-404">
      <h1 className="state-code">404</h1>
      <h2 className="state-title">CMS Page Not Found</h2>
      <p className="state-message">The admin page or resource you requested does not exist.</p>
      <Link to="/shows" className="btn btn-primary">
        Back to Shows
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
    console.error('Unhandled CMS UI Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="state-container state-500" role="alert">
          <h1 className="state-code">500</h1>
          <h2 className="state-title">CMS System Error</h2>
          <p className="state-message">
            An unhandled UI error occurred. You can return to shows or reload the page.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => {
              this.setState({ hasError: false })
              window.location.href = '/shows'
            }}
          >
            Return to Dashboard
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
