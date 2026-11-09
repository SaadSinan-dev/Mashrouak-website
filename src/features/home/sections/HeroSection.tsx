import {CmsText} from '../../content/Editable';
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
import { ProductSceneSkeleton } from "../../../components/shared/ProductSceneSkeleton";
import { withModuleDeadline } from "../../../../shared/loadable";

function HeroVisual() {
  const { t } = useLocale();
  const [Scene, setScene] = useState<ComponentType<{
    onReady: (ready: boolean) => void;
  }> | null>(null);
  const [state, setState] = useState<"initializing" | "ready" | "fallback">(
    () =>
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "fallback"
        : "initializing",
  );
  const ref = useRef<HTMLDivElement>(null);
  const ready = useCallback(
    (value: boolean) => setState(value ? "ready" : "fallback"),
    [],
  );
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let active = true;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) {
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
              if (active) setState("fallback");
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
  }, []);
  return (
    <div
      ref={ref}
      className={`hero-visual hero-visual--${state} ${state === "ready" ? "hero-visual--3d" : ""}`}
      data-scene-state={state}
      role="img"
      aria-label={t('hero.visualAlt')}
    >
      <div className="hero-visual__grid" />
      <div className="hero-visual__topline">
        <span><CmsText k="hero.visual.topline"/></span>
        <span dir="ltr">01 — 03</span>
      </div>
      {state === "fallback" && (
        <>
          <div className="hero-node hero-node--web" aria-hidden="true">
            <div className="hero-node__label">
              <span>
                <Monitor size={12} />
              </span>
              <CmsText k="hero.nodeWeb"/>
            </div>
            <strong><CmsText k="hero.visual.webTag"/></strong>
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
              <CmsText k="hero.nodeSystem"/>
            </div>
            <strong><CmsText k="hero.visual.systemTag"/></strong>
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
              <CmsText k="hero.nodeApp"/>
            </div>
            <strong><CmsText k="hero.visual.appTag"/></strong>
            <div className="hero-node__phone">
              <i />
              <div />
              <div />
              <div />
            </div>
          </div>
        </>
      )}
      {state === "initializing" && <ProductSceneSkeleton />}
      <div className="hero-visual__legend">
        <CircleDot size={13} />
        <span><CmsText k="hero.legend"/></span>
      </div>
      <span className="hero-visual__edge"><CmsText k="hero.visual.edge"/></span>
      {Scene && state !== "fallback" && <Scene onReady={ready} />}
    </div>
  );
}

export function HeroSection() {
  const { isArabic } = useLocale();
  const ArrowUp = isArabic ? ArrowUpLeft : ArrowUpRight;
  const ArrowDown = isArabic ? ArrowDownLeft : ArrowDownRight;
  return (
    <section className="hero-section">
      <Container className="hero-section__layout">
        <div className="hero-section__copy">
          <p className="eyebrow">
            <span className="eyebrow__dot" /> <CmsText k="hero.eyebrow"/>
          </p>
          <h1>
            <CmsText k="hero.title"/> <em><CmsText k="hero.emphasis"/></em>
          </h1>
          <p className="hero-section__description"><CmsText k="hero.description"/></p>
          <div className="hero-section__actions">
            <ButtonLink to="/contact" size="lg">
              <CmsText k={"common.discuss"}/> <ArrowUp size={18} />
            </ButtonLink>
            <Link className="hero-section__secondary" to="/work">
              <CmsText k={"common.exploreWork"}/> <ArrowDown size={17} />
            </Link>
          </div>
          <div className="hero-section__footnote">
            <span dir="ltr">01 / 06</span>
            <span><CmsText k="hero.footnote"/></span>
          </div>
        </div>
        <HeroVisual />
      </Container>
      <div className="hero-section__bottomline">
        <Container>
          <span dir="ltr">MASHROUAK.NET</span>
          <span><CmsText k="hero.bottomline"/></span>
          <span><CmsText k="hero.bottomMeta"/></span>
        </Container>
      </div>
    </section>
  );
}
