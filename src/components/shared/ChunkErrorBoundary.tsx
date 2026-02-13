import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasChunkError: boolean;
}

export class ChunkErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasChunkError: false };
  }

  static getDerivedStateFromError(error: Error): State | null {
    // Check if this is a chunk loading error
    if (
      error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('Loading chunk') ||
      error.message.includes('Loading CSS chunk') ||
      error.message.includes('Failed to load module script')
    ) {
      return { hasChunkError: true };
    }
    return null;
  }

  componentDidCatch(error: Error) {
    // Check if this is a chunk loading error
    if (
      error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('Loading chunk') ||
      error.message.includes('Loading CSS chunk') ||
      error.message.includes('Failed to load module script')
    ) {
      // Clear cache and reload
      console.log('Chunk loading error detected, reloading app...');

      // Small delay to show the message
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  }

  render() {
    if (this.state.hasChunkError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center p-6">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-text-primary mb-2">
              App Updated
            </h2>
            <p className="text-text-secondary">
              A new version is available. Reloading...
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
