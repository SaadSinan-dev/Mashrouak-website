import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useLocale } from './providers/PreferencesProvider';

interface ErrorBoundaryProps { children: ReactNode }
interface ErrorBoundaryState { hasError: boolean }

function ErrorFallback() {
  const { t } = useLocale();
  return <main className="app-error"><p>{t('contact.error')}</p><a href="/">{t('common.backHome')}</a></main>;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };
  public static getDerivedStateFromError(): ErrorBoundaryState { return { hasError: true }; }
  public componentDidCatch(error: Error, info: ErrorInfo): void { console.error('Application rendering error:', error, info.componentStack); }
  public render(): ReactNode { return this.state.hasError ? <ErrorFallback /> : this.props.children; }
}
