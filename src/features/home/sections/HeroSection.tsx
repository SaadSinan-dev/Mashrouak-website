import { CmsText } from "../../content/Editable";
import {
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpLeft,
  ArrowUpRight,
  CircleDot,
  Monitor,
  Smartphone,
  Workflow,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useLocale } from "../../../app/providers/preferences-context";
import { Container } from "../../../components/ui/Container";
import { ButtonLink } from "../../../components/ui/Button";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { withModuleDeadline } from "../../../../shared/loadable";
import type { SceneStatus } from "../../../lib/scene-lifecycle";
import { HeroHorizon } from "./HeroHorizon";

function HeroVisual() {
  const { t, isArabic } = useLocale();
  const [Scene, setScene] = useState<ComponentType<{
    onStatus: (status: SceneStatus) => void;
  }> | null>(null);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [status, setStatus] = useState<SceneStatus>({
    phase: reducedMotion ? "fallback" : "loading",
  });
  const [attempt, setAttempt] = useState(0);
  const state = status.phase;
  const ref = useRef<HTMLDivElement>(null);
  const reportStatus = useCallback((next: SceneStatus) => setStatus(next), []);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReducedMotion(motion.matches);
    motion.addEventListener("change", change);
    return () => motion.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let active = true;
    setScene(null);
    setStatus({ phase: reducedMotion ? "fallback" : "loading" });
    if (reducedMotion) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          observer.disconnect();
          void withModuleDeadline(import("./ProductScene"))
            .then((module) => {
              if (active) setScene(() => module.ProductScene);
            })
            .catch(() => {
              if (active)
                setStatus({ phase: "error", reason: "module_load_failed" });
            });
        }
      },
      { rootMargin: "120px" },
    );
    observer.observe(el);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [attempt, reducedMotion]);
  return (
    <div
      ref={ref}
      className={`hero-visual hero-visual--${state} ${state === "ready" ? "hero-visual--3d" : ""}`}
      data-scene-state={state}
      aria-busy={state === "loading" || state === "rendering"}
      role="group"
      aria-label={t("hero.visualAlt")}
    >
      <div className="hero-visual__grid" />
      <div className="hero-visual__topline">
        <span>
          <CmsText k="hero.visual.topline" />
        </span>
        <span dir="ltr">01 — 03</span>
      </div>
      {(state === "fallback" || state === "error") && (
        <>
          <div className="hero-node hero-node--web" aria-hidden="true">
            <div className="hero-node__label">
              <span>
                <Monitor size={12} />
              </span>
              <CmsText k="hero.nodeWeb" />
            </div>
            <strong>
              <CmsText k="hero.visual.webTag" />
            </strong>
            <div className="hero-node__screen">
              <div className="hero-node__screen-head">
                <i />
                <i />
                <i />
              </div>
              <div className="hero-node__screen-body">
                <b />
                <b />
                <b />
                <span />
                <span />
              </div>
              <div className="hero-node__screen-footer">
                <i />
                <i />
              </div>
            </div>
          </div>
          <div className="hero-node hero-node--system" aria-hidden="true">
            <div className="hero-node__label">
              <span>
                <Workflow size={12} />
              </span>
              <CmsText k="hero.nodeSystem" />
            </div>
            <strong>
              <CmsText k="hero.visual.systemTag" />
            </strong>
            <div className="hero-node__system-body">
              <div />
              <div />
              <div />
              <div />
              <div />
              <div />
            </div>
          </div>
          <div className="hero-node hero-node--app" aria-hidden="true">
            <div className="hero-node__label">
              <span>
                <Smartphone size={12} />
              </span>
              <CmsText k="hero.nodeApp" />
            </div>
            <strong>
              <CmsText k="hero.visual.appTag" />
            </strong>
            <div className="hero-node__phone">
              <i />
              <div />
              <div />
              <div />
            </div>
          </div>
        </>
      )}
      <div className="hero-visual__legend">
        <CircleDot size={13} />
        <span>
          <CmsText k="hero.legend" />
        </span>
      </div>
      <span className="hero-visual__edge">
        <CmsText k="hero.visual.edge" />
      </span>
      {state === "error" && (
        <div className="product-scene-error" role="status">
          <span>
            {isArabic
              ? "تعذّر عرض النموذج ثلاثي الأبعاد"
              : "The 3D model could not be displayed"}
          </span>
          <button
            type="button"
            onClick={() =>
              status.reason === "module_load_failed"
                ? window.location.reload()
                : setAttempt((value) => value + 1)
            }
          >
            {isArabic ? "إعادة المحاولة" : "Retry"}
          </button>
        </div>
      )}
      {Scene && state !== "fallback" && state !== "error" && (
        <Scene key={attempt} onStatus={reportStatus} />
      )}
    </div>
  );
}

export function HeroSection() {
  const { isArabic } = useLocale();
  const ArrowUp = isArabic ? ArrowUpLeft : ArrowUpRight;
  const ArrowDown = isArabic ? ArrowDownLeft : ArrowDownRight;
  return (
    <section className="hero-section hero-section--horizon">
      <HeroHorizon />
      <Container className="hero-section__layout">
        <div className="hero-section__copy">
          <p className="hero-kicker"><CmsText k="hero.eyebrow" /></p>
          <h1>
            <CmsText k="hero.title" />{" "}
            <em>
              <CmsText k="hero.emphasis" />
            </em>
          </h1>
          <p className="hero-section__description">
            <CmsText k="hero.description" />
          </p>
          <div className="hero-section__actions">
            <ButtonLink to="/contact" size="lg">
              <CmsText k={"common.discuss"} /> <ArrowUp size={18} />
            </ButtonLink>
            <Link className="hero-section__secondary" to="/work">
              <CmsText k={"common.exploreWork"} /> <ArrowDown size={17} />
            </Link>
          </div>
        </div>
        <div className="hero-exhibit">
          <div className="hero-section__footnote">
            <span dir="ltr">FIG. 01</span>
            <span><CmsText k="hero.footnote" /></span>
          </div>
          <HeroVisual />
        </div>
      </Container>
      <div className="hero-section__bottomline">
        <Container>
          <span dir="ltr">MASHROUAK.NET</span>
          <span>
            <CmsText k="hero.bottomline" />
          </span>
          <span>
            <CmsText k="hero.bottomMeta" />
          </span>
        </Container>
      </div>
    </section>
  );
}
