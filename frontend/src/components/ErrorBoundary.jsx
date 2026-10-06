import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          textAlign: 'center',
          background: 'var(--bg-main, #FAF6F0)',
          color: 'var(--text-dark, #2B211D)',
          fontFamily: 'var(--font-family-base)'
        }}>
          <div style={{
            fontSize: '54px',
            marginBottom: '16px'
          }}>
            🧵
          </div>
          <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '28px',
            fontWeight: 700,
            marginBottom: '10px',
            color: 'var(--accent-maroon)'
          }}>
            Something went wrong while rendering this section
          </h2>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-muted, #8A7A6D)',
            maxWidth: '500px',
            marginBottom: '24px',
            lineHeight: 1.6
          }}>
            We caught an error to prevent a blank screen. You can refresh the page or return to the main ledger dashboard.
          </p>

          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '24px'
          }}>
            <button
              onClick={this.handleReload}
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                border: '1px solid var(--accent-gold)',
                background: 'var(--accent-maroon)',
                color: '#FAF6F0',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-card)'
              }}
            >
              🔄 Refresh Page
            </button>
            <button
              onClick={this.handleGoHome}
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                border: '1px solid var(--border-gold-subtle)',
                background: 'var(--card-secondary)',
                color: 'var(--text-dark)',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              🏠 Go to Dashboard
            </button>
          </div>

          {this.state.error && (
            <details style={{
              textAlign: 'left',
              maxWidth: '650px',
              width: '100%',
              background: '#FFFFFF',
              border: '1px solid var(--border-light, #E2E8F0)',
              borderRadius: '10px',
              padding: '14px 18px',
              fontSize: '12px',
              color: '#EF4444'
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--text-gray, #64748B)' }}>
                View error details
              </summary>
              <pre style={{ marginTop: '10px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
