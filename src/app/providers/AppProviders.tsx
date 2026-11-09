import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { ErrorBoundary } from "../ErrorBoundary";
import { AppLoader } from "../../components/shared/AppLoader";
import { PreferencesProvider } from "./PreferencesProvider";
import { useLocale, useTheme } from "./preferences-context";
import { ContentProvider } from "./ContentProvider";

function AppToaster() {
  const { direction } = useLocale();
  const { theme } = useTheme();
  return (
    <Toaster
      position="bottom-right"
      dir={direction}
      theme={theme}
      richColors
      closeButton
      duration={4200}
    />
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ContentProvider>
      <PreferencesProvider>
        <AppLoader />
        <ErrorBoundary>
          {children}
          <AppToaster />
        </ErrorBoundary>
      </PreferencesProvider>
    </ContentProvider>
  );
}
