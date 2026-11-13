import {
  Component,
  useCallback,
  useEffect,
  useState,
  type ErrorInfo,
  type FormEvent,
  type ReactNode,
  type ComponentType,
} from "react";
import {
  BrowserRouter,
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import {
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  FileText,
  Image,
  Layers3,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  MousePointer2,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  UsersRound,
  X,
} from "lucide-react";
import type { User } from "../../shared/schema";
import { LocaleProvider } from "./i18n";
import { useLocale, type CopyKey } from "./locale-context";
import { api, ApiError, errorKey } from "./api";
import { SkeletonForm, SkeletonRegion } from "../../shared/ui/Skeleton";
import { BusyInline, ResourceError } from "../../shared/ui/ResourceError";
import { ModuleSkeleton } from "./ModuleSkeleton";
import { createModule } from "../../shared/loadable";
import { useResource, adminResources } from "./useResource";

function makePage<P extends object>(
  loader: () => Promise<ComponentType<P>>,
  path: (props: P, kind?: string) => string | null,
) {
  const module = createModule(loader);
  return function LoadedPage(props: P) {
    const { kind } = useParams();
    const query = path(props, kind);
    const resource = useResource(query);
    const operators = useResource(
      query === "/admin/inbox?q=" ? "/admin/operators" : null,
    );
    const code = module.useModule();
    const { language } = useLocale();
    if (
      code.error ||
      (resource.error && !resource.data) ||
      (operators.error && !operators.data)
    )
      return (
        <ResourceError
          language={language}
          onRetry={() => {
            if (code.error) code.retry();
            if (resource.error) resource.retry();
            if (operators.error) operators.retry();
          }}
        />
      );
    if (
      code.pending ||
      resource.loading ||
      operators.loading ||
      !code.Component
    )
      return <RouteSkeleton />;
    const Page = code.Component;
    return <Page {...props} />;
  };
}
const ContentManager = makePage(
  () => import("./ContentManager").then((m) => m.ContentManager),
  (props, kind) => `/admin/content?kind=${props.fixedKind ?? kind ?? "pages"}`,
);
const VisualEditor = makePage(
  () => import('./VisualEditor').then(module=>module.VisualEditor),
  () => '/admin/content',
);
const MediaLibrary = makePage(
  () => import("./MediaLibrary").then((m) => m.MediaLibrary),
  () => "/media",
);
const SupportInbox = makePage(
  () => import("./SupportInbox").then((m) => m.SupportInbox),
  () => "/admin/inbox?q=",
);
const Overview = makePage(
  () => import("./Overview").then((m) => m.Overview),
  () => "/admin/overview",
);
const Users = makePage(
  () => import("./Users").then((m) => m.Users),
  () => "/admin/users",
);
const AuditLog = makePage(
  () => import("./Users").then((m) => m.AuditLog),
  () => "/admin/audit",
);
const Account = makePage(
  () => import("./Users").then((m) => m.Account),
  () => null,
);

function Brand() {
  const { language, theme } = useLocale();
  return (
    <img
      className="admin-logo"
      src={
        language === "ar"
          ? `/brand/logo-horizontal-${theme === "dark" ? "ivory" : "colour"}.svg`
          : `/brand/logo-horizontal-en-${theme === "dark" ? "ivory" : "colour"}.png`
      }
      alt={language === "ar" ? "مشروعك.net" : "Mashrouak.net"}
      width="180"
      height="54"
    />
  );
}
function Preferences() {
  const { ar, theme, toggleLanguage, toggleTheme } = useLocale();
  return (
    <div className="admin-preferences">
      <button
        type="button"
        onClick={toggleLanguage}
        aria-label={ar ? "التبديل إلى الإنجليزية" : "Switch to Arabic"}
      >
        {ar ? "EN" : "عربي"}
      </button>
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={
          ar
            ? theme === "dark"
              ? "المظهر الفاتح"
              : "المظهر الداكن"
            : theme === "dark"
              ? "Light theme"
              : "Dark theme"
        }
      >
        {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
      </button>
    </div>
  );
}
function Login({
  onLogin,
  loading = false,
}: {
  onLogin: () => Promise<void>;
  loading?: boolean;
}) {
  const { t, language } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setPassword("");
      await onLogin();
    } catch (err) {
      setError(t(errorKey(err)));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="login-page">
      <div className="login-topbar">
        <Brand />
        <Preferences />
      </div>
      <main className="login-layout">
        <section className="login-intro">
          <span className="admin-eyebrow">
            MASHROUAK.NET / {t("dashboard")}
          </span>
          <h1>{t("welcome")}</h1>
          <p>{t("loginNote")}</p>
          <div className="login-blueprint" aria-hidden="true">
            <i />
            <i />
            <i />
            <div />
            <span />
            <span />
          </div>
          <span className="login-private">
            <ShieldCheck size={16} />
            {t("sessionPrivate")}
          </span>
        </section>
        <section className="login-card">
          <span className="login-card__index">
            01 / {language === "ar" ? "الدخول الآمن" : "SECURE ACCESS"}
          </span>
          <h2>{t("signIn")}</h2>
          {loading ? (
            <SkeletonRegion label={t("loading")}>
              <SkeletonForm fields={2} />
            </SkeletonRegion>
          ) : (
            <form onSubmit={submit}>
              <label>
                {t("email")}
                <input
                  autoComplete="username"
                  type="email"
                  dir="ltr"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label>
                {t("password")}
                <input
                  autoComplete="current-password"
                  type="password"
                  required
                  maxLength={256}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              {error && (
                <p className="admin-error" role="alert">
                  {error}
                </p>
              )}
              <button className="admin-button" disabled={busy}>
                {busy ? (
                  <BusyInline label={t("signIn")} />
                ) : (
                  <>
                    {t("signIn")}
                    {language === "ar" ? (
                      <ChevronLeft size={18} />
                    ) : (
                      <ChevronRight size={18} />
                    )}
                  </>
                )}
              </button>
            </form>
          )}
          <p className="admin-hint">{t("loginHint")}</p>
        </section>
      </main>
    </div>
  );
}
function RouteSkeleton() {
  return <ModuleSkeleton />;
}
function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const { t, ar } = useLocale();
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const { pathname } = useLocation();
  const menu = menuPath === pathname;
  const links: {
    to: string;
    label: CopyKey;
    icon: typeof Settings;
    roles: User["role"][];
  }[] = [
    {to:'/visual',label:'visualEditor',icon:MousePointer2,roles:['owner','editor']},
    {
      to: "/",
      label: "overview",
      icon: LayoutDashboard,
      roles: ["owner", "editor", "support"],
    },
    {
      to: "/content/pages",
      label: "pages",
      icon: FileText,
      roles: ["owner", "editor"],
    },
    {
      to: "/content/services",
      label: "services",
      icon: Layers3,
      roles: ["owner", "editor"],
    },
    {
      to: "/content/results",
      label: "results",
      icon: ChartNoAxesCombined,
      roles: ["owner", "editor"],
    },
    { to: "/media", label: "media", icon: Image, roles: ["owner", "editor"] },
    {
      to: "/settings",
      label: "settings",
      icon: Settings,
      roles: ["owner", "editor"],
    },
    {
      to: "/inbox",
      label: "inbox",
      icon: MessageSquare,
      roles: ["owner", "support"],
    },
    {
      to: "/content/knowledge",
      label: "knowledge",
      icon: Sparkles,
      roles: ["owner", "editor"],
    },
    { to: "/users", label: "users", icon: UsersRound, roles: ["owner"] },
    { to: "/audit", label: "audit", icon: ShieldCheck, roles: ["owner"] },
  ];
  const allowed = (role: User["role"][]) => role.includes(user.role);
  return (
    <div className="admin-shell">
      <a className="skip-link" href="#admin-main">
        {ar ? "انتقل إلى المحتوى" : "Skip to content"}
      </a>
      {menu && (
        <button
          className="sidebar-scrim"
          aria-label={t("close")}
          onClick={() => setMenuPath(null)}
        />
      )}
      <aside className={`admin-sidebar ${menu ? "is-open" : ""}`}>
        <div className="sidebar-brand">
          <Link to="/" aria-label={t("overview")}>
            <Brand />
          </Link>
          <button
            className="icon-button sidebar-close"
            aria-label={t("close")}
            onClick={() => setMenuPath(null)}
          >
            <X size={20} />
          </button>
        </div>
        <span className="sidebar-label">{t("dashboard")}</span>
        <nav aria-label={t("dashboard")}>
          {links
            .filter((l) => allowed(l.roles))
            .map(({ to, label, icon: Icon }) => (
              <NavLink to={to} key={to} end={to === "/"}>
                <Icon size={18} strokeWidth={1.6} />
                <span>{t(label)}</span>
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <Link to="/account">
            <span className="user-avatar">{user.name.slice(0, 1)}</span>
            <span>
              <strong>{user.name}</strong>
              <small>{t(user.role)}</small>
            </span>
          </Link>
          <button
            className="icon-button"
            aria-label={t("signOut")}
            onClick={onLogout}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <div className="admin-body">
        <header className="admin-topbar">
          <div>
            <button
              className="icon-button sidebar-trigger"
              aria-label={t("menu")}
              aria-expanded={menu}
              onClick={() => setMenuPath(pathname)}
            >
              <Menu size={21} />
            </button>
            <span>
              {links.find((l) => l.to === pathname)?.label
                ? t(links.find((l) => l.to === pathname)!.label)
                : t("dashboard")}
            </span>
          </div>
          <div>
            <a
              className="website-link"
              href={import.meta.env.VITE_PUBLIC_URL ?? "http://localhost:5173"}
              target="_blank"
              rel="noreferrer"
            >
              {t("website")}{" "}
              {ar ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
            </a>
            <Preferences />
          </div>
        </header>
        <main id="admin-main" className="admin-main">
          <Routes>
            <Route index element={<Overview user={user} />} />
            <Route path="content/projects" element={<Navigate to="/" replace />} />
            <Route path="visual" element={allowed(['owner','editor'])?<VisualEditor/>:<Navigate to="/"/>}/>
            <Route
              path="content/:kind"
              element={
                allowed(["owner", "editor"]) ? (
                  <ContentManager />
                ) : (
                  <Navigate to="/" />
                )
              }
            />
            <Route
              path="settings"
              element={
                allowed(["owner", "editor"]) ? (
                  <ContentManager fixedKind="settings" />
                ) : (
                  <Navigate to="/" />
                )
              }
            />
            <Route
              path="media"
              element={
                allowed(["owner", "editor"]) ? (
                  <MediaLibrary />
                ) : (
                  <Navigate to="/" />
                )
              }
            />
            <Route
              path="inbox"
              element={
                allowed(["owner", "support"]) ? (
                  <SupportInbox />
                ) : (
                  <Navigate to="/" />
                )
              }
            />
            <Route
              path="users"
              element={allowed(["owner"]) ? <Users /> : <Navigate to="/" />}
            />
            <Route
              path="audit"
              element={allowed(["owner"]) ? <AuditLog /> : <Navigate to="/" />}
            />
            <Route path="account" element={<Account />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
function AuthenticatedApp() {
  const { language } = useLocale();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    try {
      const data = await api<{ user: User }>("/auth/me");
      setUser(data.user);
      setError(false);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setUser(null);
      else setError(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
    const unauthorized = () => {
      adminResources.clear();
      setUser(null);
    };
    window.addEventListener("mashrouak:unauthorized", unauthorized);
    return () =>
      window.removeEventListener("mashrouak:unauthorized", unauthorized);
  }, [load]);
  const logout = () => {
    void api("/auth/logout", { method: "POST" })
      .then(() => {
        adminResources.clear();
        setUser(null);
      })
      .catch(() => setError(true));
  };
  if (loading) return <Login onLogin={load} loading />;
  if (error)
    return (
      <div className="login-page">
        <div className="login-topbar">
          <Brand />
          <Preferences />
        </div>
        <div className="auth-error">
          <ResourceError
            language={language}
            onRetry={() => {
              setLoading(true);
              void load();
            }}
          />
        </div>
      </div>
    );
  return user ? (
    <BrowserRouter>
      <Dashboard user={user} onLogout={logout} />
    </BrowserRouter>
  ) : (
    <Login onLogin={load} />
  );
}
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Admin interface error", error, info.componentStack);
  }
  override render() {
    return this.state.failed ? <Fatal /> : this.props.children;
  }
}
function Fatal() {
  const { language } = useLocale();
  return (
    <ResourceError
      language={language}
      onRetry={() => window.location.reload()}
    />
  );
}
export function App() {
  return (
    <LocaleProvider>
      <Boundary>
        <AuthenticatedApp />
      </Boundary>
    </LocaleProvider>
  );
}
