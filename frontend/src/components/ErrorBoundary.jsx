import React from 'react';

/**
 * ErrorBoundary Component
 * 
 * Catches errors in PDF viewer and other child components
 * Prevents entire app from crashing due to PDF rendering issues
 * 
 * Usage:
 * <ErrorBoundary>
 *   <PdfViewer note={note} />
 * </ErrorBoundary>
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  // eslint-disable-next-line no-unused-vars
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error);
    console.error('Error details:', errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-96 bg-red-50 rounded-lg border-2 border-red-200 p-6">
          <div className="text-center max-w-md">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-red-900 mb-2">Something went wrong</h2>
            <p className="text-red-700 mb-4 text-sm">
              {this.state.error?.message || 'An unexpected error occurred while loading this content.'}
            </p>
            
            {import.meta.env.MODE === 'development' && (
              <details className="mb-4 text-left bg-white rounded p-3 border border-red-300">
                <summary className="cursor-pointer font-semibold text-red-900 mb-2">
                  Error Details (Dev Only)
                </summary>
                <pre className="text-xs overflow-auto max-h-40 bg-red-100 p-2 rounded text-red-900">
                  {this.state.error?.toString()}
                  {'\n\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <button
              onClick={this.handleRetry}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
