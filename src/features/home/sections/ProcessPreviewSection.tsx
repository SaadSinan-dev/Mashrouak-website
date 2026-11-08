import { useRef } from 'react';
import { ArrowUpLeft, ArrowUpRight } from 'lucide-react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import type { TranslationKey } from '../../../locales/messages';
import { Link } from 'react-router-dom';
import { useLocale } from '../../../app/providers/PreferencesProvider';
import { Reveal } from '../../../components/shared/Reveal';
import { Container } from '../../../components/ui/Container';
import { SectionHeading } from '../../../components/ui/SectionHeading';

export function ProcessPreviewSection() {
  const { t, isArabic } = useLocale();
  const Arrow = isArabic ? ArrowUpLeft : ArrowUpRight;
  const trackRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ['start end', 'end start'] });
  const progress = useTransform(scrollYProgress, [0, 1], [0.06, 1]);

  return (
    <section className="process-preview section-space">
      <Container>
        <div className="process-preview__heading">
          <Reveal><SectionHeading eyebrow={t('process.eyebrow')} title={<>{t('process.title')}<br /><span>{t('process.emphasis')}</span></>} description={t('process.description')} /></Reveal>
          <Reveal delay={0.12}><Link to="/process" className="text-link">{t('process.details')} <Arrow size={17} /></Link></Reveal>
        </div>
        <div ref={trackRef} className="process-track">
          <motion.span className="process-track__progress" style={reduceMotion ? undefined : { scaleX: progress }} aria-hidden="true" />
          {Array.from({ length: 6 }, (_, index) => (
            <Reveal key={index} delay={index * 0.04}>
              <article className="process-track__step">
                <span className="process-track__number" dir="ltr">0{index + 1}</span>
                <span className="process-track__line" />
                <h3>{t(`step.${index + 1}.title` as TranslationKey)}</h3>
                <p>{t(`step.${index + 1}.subtitle` as TranslationKey)}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
