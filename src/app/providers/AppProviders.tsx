import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { ErrorBoundary } from '../ErrorBoundary';
import { AppLoader } from '../../components/shared/AppLoader';
import { PreferencesProvider, useLocale, useTheme } from './PreferencesProvider';

function AppToaster() {
  const { direction } = useLocale();
  const { theme } = useTheme();
  return <Toaster position="bottom-right" dir={direction} theme={theme} richColors closeButton duration={4200} />;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return <PreferencesProvider><AppLoader /><ErrorBoundary>{children}<AppToaster /></ErrorBoundary></PreferencesProvider>;
}
