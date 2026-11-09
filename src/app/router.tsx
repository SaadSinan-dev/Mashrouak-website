import { useEffect } from "react";
import {
  BrowserRouter,
  Route,
  Routes,
  Outlet,
  useLocation,
} from "react-router-dom";
import { createModule } from "../../shared/loadable";
import { createResourceCache } from "../../shared/resource-cache";
import type { Conversation, Message } from "../../shared/schema";
import { api } from "../lib/platform-api";
import { SiteHeader } from "../components/layout/SiteHeader";
import { SiteFooter } from "../components/layout/SiteFooter";
import { ScrollToTop } from "../components/layout/ScrollToTop";
import { CompanyChatbot } from "../components/shared/CompanyChatbot";
import { useLocale } from "./providers/preferences-context";
import { usePlatform } from "./providers/content-context";
import { skeletonKind } from "../lib/skeleton-kind";
import { PublicPageSkeleton } from "../components/shared/PublicPageSkeleton";
import { ResourceError } from "../../shared/ui/ResourceError";

const modules = {
  home: createModule(() =>
    import("../features/home/HomePage").then((m) => m.HomePage),
  ),
  services: createModule(() =>
    import("../features/services/ServicesPage").then((m) => m.ServicesPage),
  ),
  work: createModule(() =>
    import("../features/portfolio/PortfolioPage").then((m) => m.PortfolioPage),
  ),
  project: createModule(() =>
    import("../features/portfolio/CaseStudyPage").then((m) => m.CaseStudyPage),
  ),
  about: createModule(() =>
    import("../features/about/AboutPage").then((m) => m.AboutPage),
  ),
  process: createModule(() =>
    import("../features/process/ProcessPage").then((m) => m.ProcessPage),
  ),
  contact: createModule(() =>
    import("../features/contact/ContactPage").then((m) => m.ContactPage),
  ),
  results: createModule(() =>
    import("../features/results/ResultsPage").then((m) => m.ResultsPage),
  ),
  privacy: createModule(() =>
    import("../features/legal/PrivacyPage").then((m) => m.PrivacyPage),
  ),
  terms: createModule(() =>
    import("../features/legal/TermsPage").then((m) => m.TermsPage),
  ),
  custom: createModule(() =>
    import("../features/content/ContentPage").then((m) => m.ContentPage),
  ),
  missing: createModule(() =>
    import("../features/not-found/NotFoundPage").then((m) => m.NotFoundPage),
  ),
};
const chatModule = createModule(() =>
  import("../features/contact/ChatPage").then((m) => m.ChatPage),
);
const chatResources = createResourceCache(api);
function Ready() {
  useEffect(() => {
    document.documentElement.dataset.appRouteReady = "true";
    window.dispatchEvent(new Event("mashrouak:route-ready"));
  }, []);
  return null;
}
function Page({ name }: { name: keyof typeof modules }) {
  // Code and CMS requests begin independently; this component owns their single initial wireframe.
  const module = modules[name].useModule();
  const { content, loading, unavailable, retry } = usePlatform();
  const { pathname } = useLocation();
  const { language, t } = useLocale();
  if (module.error || (unavailable && !content))
    return (
      <div className="container-shell section-space">
        <ResourceError
          language={language}
          onRetry={() => {
            if (module.error) module.retry();
            if (unavailable) retry();
          }}
        />
      </div>
    );
  if (loading || module.pending || !module.Component)
    return (
      <PublicPageSkeleton
        kind={skeletonKind(pathname)}
        label={t("common.loading")}
      />
    );
  const Component = module.Component;
  return (
    <>
      {unavailable && (
        <div className="content-refresh-error" role="status">
          <span>
            {language === "ar"
              ? "تعذّر تحديث المحتوى؛ تُعرض آخر نسخة محمّلة"
              : "Refresh failed; showing the last loaded content"}
          </span>
          <button onClick={retry}>
            {language === "ar" ? "إعادة المحاولة" : "Retry"}
          </button>
        </div>
      )}
      <Component />
      <Ready />
    </>
  );
}
function ChatRoute() {
  const module = chatModule.useModule();
  const { language, t } = useLocale();
  const session = chatResources.useResource<{
    conversation: Conversation | null;
  }>("/chat/session");
  const history = chatResources.useResource<{
    conversation: Conversation;
    messages: Message[];
  }>(
    session.data?.conversation
      ? `/chat/conversations/${session.data.conversation.id}`
      : null,
  );
  if (module.error || session.error || history.error)
    return (
      <div className="container-shell section-space">
        <ResourceError
          language={language}
          onRetry={() => {
            if (module.error) module.retry();
            if (session.error) session.retry();
            if (history.error) history.retry();
          }}
        />
      </div>
    );
  if (
    module.pending ||
    session.loading ||
    history.loading ||
    !module.Component ||
    !session.data
  )
    return <PublicPageSkeleton kind="chat" label={t("common.loading")} />;
  const Component = module.Component;
  const conversation = history.data?.conversation ?? session.data.conversation;
  return (
    <>
      <Component
        key={conversation?.id ?? "start"}
        initialConversation={conversation}
        initialMessages={history.data?.messages ?? []}
      />
      <Ready />
    </>
  );
}
function SiteLayout() {
  const { preview, unavailable } = usePlatform();
  const { isArabic } = useLocale();
  return (
    <>
      <SiteHeader />
      {preview && (
        <div className="preview-banner" role="status">
          {unavailable
            ? isArabic
              ? "انتهت صلاحية المعاينة أو تعذّر تحميلها"
              : "Preview expired or unavailable"
            : isArabic
              ? "معاينة مسودة خاصة — لم تُنشر هذه التغييرات"
              : "Private draft preview — these changes are not published"}
        </div>
      )}
      <main id="main-content">
        <Outlet />
      </main>
      <SiteFooter />
      <CompanyChatbot />
    </>
  );
}
export function AppRouter() {
  return (
    <BrowserRouter>
      <PublicRouteTree />
    </BrowserRouter>
  );
}
export function PublicRouteTree() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/contact/chat" element={<ChatRoute />} />
        <Route path="/" element={<SiteLayout />}>
          <Route index element={<Page name="home" />} />
          <Route path="services" element={<Page name="services" />} />
          <Route path="work" element={<Page name="work" />} />
          <Route path="work/:slug" element={<Page name="project" />} />
          <Route path="about" element={<Page name="about" />} />
          <Route path="process" element={<Page name="process" />} />
          <Route path="contact" element={<Page name="contact" />} />
          <Route path="results" element={<Page name="results" />} />
          <Route path="pages/:slug" element={<Page name="custom" />} />
          <Route path="privacy" element={<Page name="privacy" />} />
          <Route path="terms" element={<Page name="terms" />} />
          <Route path="*" element={<Page name="missing" />} />
        </Route>
      </Routes>
    </>
  );
}
