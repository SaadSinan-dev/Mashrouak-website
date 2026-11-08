import { useEffect } from 'react';
import { useLocale, useTheme } from '../../app/providers/PreferencesProvider';

const ROUTE_READY_EVENT = 'mashrouak:route-ready';

function logoSource(language: 'ar' | 'en', theme: 'light' | 'dark') {
  if (language === 'en') {
    return theme === 'dark' ? '/brand/logo-horizontal-en-ivory.png' : '/brand/logo-horizontal-en-colour.png';
  }
  return theme === 'dark' ? '/brand/logo-horizontal-ivory.svg' : '/brand/logo-horizontal-colour.svg';
}

export function AppLoader() {
  const { language } = useLocale();
  const { theme } = useTheme();

  useEffect(() => {
    const loader = document.getElementById('app-loader');
    if (!loader) return;

    const logo = loader.querySelector<HTMLImageElement>('#app-loader-logo');
    const label = loader.querySelector<HTMLElement>('#app-loader-label');
    if (logo) {
      logo.src = logoSource(language, theme);
      logo.alt = language === 'ar' ? 'مشروعك.net' : 'Mashrouak.net';
    }
    if (label) label.textContent = language === 'ar' ? 'جارٍ تجهيز الموقع' : 'Preparing your experience';

    let cancelled = false;
    let routeFallback: number | undefined;
    let routeReadyHandler: (() => void) | undefined;

    const routeReady = new Promise<void>((resolve) => {
      if (document.documentElement.dataset.appRouteReady === 'true') {
        resolve();
        return;
      }
      routeReadyHandler = () => {
        if (routeFallback !== undefined) window.clearTimeout(routeFallback);
        resolve();
      };
      window.addEventListener(ROUTE_READY_EVENT, routeReadyHandler, { once: true });
      // A failed or unavailable route chunk must not trap visitors behind the loader.
      routeFallback = window.setTimeout(resolve, 6000);
    });

    const fontsReady = document.fonts?.ready?.then(() => undefined).catch(() => undefined) ?? Promise.resolve();
    const logoReady = logo?.decode?.().then(() => undefined).catch(() => undefined) ?? Promise.resolve();

    Promise.all([routeReady, fontsReady, logoReady]).then(() => {
      if (cancelled || !loader.isConnected) return;
      requestAnimationFrame(() => {
        if (!loader.isConnected) return;
        loader.dataset.state = 'ready';
        const removeLoader = () => {
          loader.removeEventListener('transitionend', onTransitionEnd);
          if (loader.isConnected) loader.remove();
        };
        const onTransitionEnd = (event: TransitionEvent) => {
          if (event.target === loader && event.propertyName === 'opacity') removeLoader();
        };
        loader.addEventListener('transitionend', onTransitionEnd);
        // Safety cleanup if a browser does not dispatch transitionend.
        window.setTimeout(removeLoader, 420);
      });
    });

    return () => {
      cancelled = true;
      if (routeFallback !== undefined) window.clearTimeout(routeFallback);
      if (routeReadyHandler) window.removeEventListener(ROUTE_READY_EVENT, routeReadyHandler);
    };
  }, [language, theme]);

  return null;
}
