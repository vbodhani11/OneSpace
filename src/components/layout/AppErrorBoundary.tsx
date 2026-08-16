import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '../ui/Button';

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('OneAbyss rendering error', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen flex items-center justify-center px-4">
          <div className="glass-card max-w-md p-8 text-center">
            <h1 className="text-xl font-bold text-white mb-2">OneAbyss hit a problem</h1>
            <p className="text-sm text-white/50 mb-5">Your data is still safe. Reload the app to try again.</p>
            <Button onClick={() => window.location.reload()}>Reload OneAbyss</Button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
