import { ArrowDownLeft, ArrowDownRight, ArrowUpLeft, ArrowUpRight, CircleDot, Monitor, Smartphone, Workflow } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLocale } from '../../../app/providers/PreferencesProvider';
import { Container } from '../../../components/ui/Container';
import { ButtonLink } from '../../../components/ui/Button';

function HeroVisual() {
  const { t } = useLocale();
  return (
    <div className="hero-visual" role="img" aria-label={t('hero.visualAlt')}>
      <div className="hero-visual__grid" />
      <div className="hero-visual__topline"><span>{t('hero.visual.topline')}</span><span dir="ltr">01 — 03</span></div>
      <div className="hero-node hero-node--web" aria-hidden="true">
        <div className="hero-node__label"><span><Monitor size={12} /></span>{t('hero.nodeWeb')}</div>
        <strong>{t('hero.visual.webTag')}</strong>
        <div className="hero-node__screen"><div className="hero-node__screen-head"><i /><i /><i /></div><div className="hero-node__screen-body"><b /><b /><b /><span /><span /></div><div className="hero-node__screen-footer"><i /><i /></div></div>
      </div>
      <div className="hero-node hero-node--system" aria-hidden="true">
        <div className="hero-node__label"><span><Workflow size={12} /></span>{t('hero.nodeSystem')}</div>
        <strong>{t('hero.visual.systemTag')}</strong>
        <div className="hero-node__system-body"><div /><div /><div /><div /><div /><div /></div>
      </div>
      <div className="hero-node hero-node--app" aria-hidden="true">
        <div className="hero-node__label"><span><Smartphone size={12} /></span>{t('hero.nodeApp')}</div>
        <strong>{t('hero.visual.appTag')}</strong>
        <div className="hero-node__phone"><i /><div /><div /><div /></div>
      </div>
      <div className="hero-visual__legend"><CircleDot size={13} /><span>{t('hero.legend')}</span></div>
      <span className="hero-visual__edge">{t('hero.visual.edge')}</span>
    </div>
  );
}

export function HeroSection() {
  const { t, isArabic } = useLocale();
  const ArrowUp = isArabic ? ArrowUpLeft : ArrowUpRight;
  const ArrowDown = isArabic ? ArrowDownLeft : ArrowDownRight;
  return (
    <section className="hero-section">
      <Container className="hero-section__layout">
        <div className="hero-section__copy">
          <p className="eyebrow"><span className="eyebrow__dot" /> {t('hero.eyebrow')}</p>
          <h1>{t('hero.title')} <em>{t('hero.emphasis')}</em></h1>
          <p className="hero-section__description">{t('hero.description')}</p>
          <div className="hero-section__actions">
            <ButtonLink to="/contact" size="lg">{t('common.discuss')} <ArrowUp size={18} /></ButtonLink>
            <Link className="hero-section__secondary" to="/work">{t('common.exploreWork')} <ArrowDown size={17} /></Link>
          </div>
          <div className="hero-section__footnote"><span dir="ltr">01 / 06</span><span>{t('hero.footnote')}</span></div>
        </div>
        <HeroVisual />
      </Container>
      <div className="hero-section__bottomline"><Container><span dir="ltr">MASHROUAK.NET</span><span>{t('hero.bottomline')}</span><span>{t('hero.bottomMeta')}</span></Container></div>
    </section>
  );
}
