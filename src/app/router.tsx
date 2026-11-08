import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes, Outlet, useLocation } from 'react-router-dom';

import { SiteHeader } from '../components/layout/SiteHeader';
import { SiteFooter } from '../components/layout/SiteFooter';
import { ScrollToTop } from '../components/layout/ScrollToTop';
import { CompanyChatbot } from '../components/shared/CompanyChatbot';
import { useLocale } from './providers/PreferencesProvider';

const HomePage = lazy(() => import('../features/home/HomePage').then((module) => ({ default: module.HomePage })));
const ServicesPage = lazy(() => import('../features/services/ServicesPage').then((module) => ({ default: module.ServicesPage })));
const PortfolioPage = lazy(() => import('../features/portfolio/PortfolioPage').then((module) => ({ default: module.PortfolioPage })));
const CaseStudyPage = lazy(() => import('../features/portfolio/CaseStudyPage').then((module) => ({ default: module.CaseStudyPage })));
const AboutPage = lazy(() => import('../features/about/AboutPage').then((module) => ({ default: module.AboutPage })));
const ProcessPage = lazy(() => import('../features/process/ProcessPage').then((module) => ({ default: module.ProcessPage })));
const ContactPage = lazy(() => import('../features/contact/ContactPage').then((module) => ({ default: module.ContactPage })));
const PrivacyPage = lazy(() => import('../features/legal/PrivacyPage').then((module) => ({ default: module.PrivacyPage })));
const TermsPage = lazy(() => import('../features/legal/TermsPage').then((module) => ({ default: module.TermsPage })));
const NotFoundPage = lazy(() => import('../features/not-found/NotFoundPage').then((module) => ({ default: module.NotFoundPage })));

function PageLoader() {
  const { t } = useLocale();
  const { pathname } = useLocation();
  const destination = pathname.startsWith('/work/') ? 'case'
    : pathname.startsWith('/work') ? 'portfolio'
      : pathname.startsWith('/services') ? 'services'
        : pathname.startsWith('/contact') ? 'contact'
          : pathname.startsWith('/process') ? 'process'
            : pathname.startsWith('/terms') || pathname.startsWith('/privacy') ? 'legal' : 'default';

  return <div className={`page-loading page-loading--${destination}`} data-destination={destination} role="status" aria-live="polite" aria-busy="true">
    <span className="page-loading__heading" />
    <span className="page-loading__line" />
    <span className="page-loading__line page-loading__line--short" />
    {destination === 'contact' ? <div className="page-loading__form"><i /><i /><i /><i /><i /></div>
      : destination === 'legal' ? <div className="page-loading__legal">{Array.from({ length: 5 }, (_, index) => <i key={index} />)}</div>
        : destination === 'process' ? <div className="page-loading__timeline">{Array.from({ length: 4 }, (_, index) => <i key={index} />)}</div>
          : destination === 'case' ? <div className="page-loading__case"><i /><div><i /><i /><i /></div></div>
            : <div className="page-loading__grid">{Array.from({ length: destination === 'services' ? 2 : 3 }, (_, index) => <i key={index} />)}</div>}
    <span className="sr-only">{t('common.loading')}</span>
  </div>;
}

function RouteReadySignal() {
  useEffect(() => {
    document.documentElement.dataset.appRouteReady = 'true';
    window.dispatchEvent(new Event('mashrouak:route-ready'));
  }, []);
  return null;
}

function ReadyOutlet() {
  return <><Outlet /><RouteReadySignal /></>;
}

function SiteLayout() {
  return (
    <>
      <SiteHeader />
      <main id="main-content"><Suspense fallback={<PageLoader />}><ReadyOutlet /></Suspense></main>
      <SiteFooter />
      <CompanyChatbot />
    </>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<SiteLayout />}>
          <Route index element={<HomePage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="work" element={<PortfolioPage />} />
          <Route path="work/:slug" element={<CaseStudyPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="process" element={<ProcessPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="terms" element={<TermsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
