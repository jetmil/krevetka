import { Component } from 'react';

/**
 * Error Boundary для graceful degradation
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Krevetka] Error caught by boundary:', error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="app error-screen">
          <div className="error-content">
            <span className="error-shrimp">🦐</span>
            <h2>Креветка запуталась</h2>
            <p>Что-то пошло не так.</p>
            <button className="action-btn share-btn" onClick={this.handleReload}>
              Перезагрузить
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
