import React from 'react';

/**
 * SearchErrorBoundary Component
 * 
 * Isolates search failures from the rest of the app
 * Shows inline error message without breaking the page
 * 
 * Performance benefits:
 * - Prevents full page crashes
 * - Allows retry without reload
 * - Logs errors for debugging
 */
class SearchErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[SearchErrorBoundary] Error caught:', error);
    console.error('[SearchErrorBoundary] Component stack:', errorInfo.componentStack);
    
    // TODO: Send to error tracking service (Sentry, etc.)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center p-8 bg-red-50 rounded-lg border border-red-200">
          <div className="text-center max-w-md">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="text-lg font-semibold text-red-900 mb-2">
              Search Temporarily Unavailable
            </h3>
            <p className="text-sm text-red-700 mb-4">
              {this.state.error?.message || 'An error occurred while searching.'}
            </p>
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700 transition-colors"
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

export default SearchErrorBoundary;
