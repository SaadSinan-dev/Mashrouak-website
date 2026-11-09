import {CmsText} from '../../content/Editable';
import { ArrowUpLeft, ArrowUpRight, ClipboardList, MessagesSquare, MonitorSmartphone, PackageCheck, Route, Workflow } from 'lucide-react';
import { useLocale } from '../../../app/providers/preferences-context';
import type { TranslationKey } from '../../../locales/messages';
import { Reveal } from '../../../components/shared/Reveal';
import { Container } from '../../../components/ui/Container';
import { SectionHeading } from '../../../components/ui/SectionHeading';

const icons = [MessagesSquare, ClipboardList, Route, Workflow, MonitorSmartphone, PackageCheck];

export function ChallengesSection() {
  const { t, isArabic } = useLocale();
  const Arrow = isArabic ? ArrowUpLeft : ArrowUpRight;
  return (
    <section className="challenges-section section-space" id="challenges">
      <Container>
        <div className="challenges-section__intro">
          <Reveal><SectionHeading eyebrow={<CmsText k="challenges.eyebrow"/>} title={<><CmsText k="challenges.title"/><br /><span><CmsText k="challenges.emphasis"/></span></>} description={<CmsText k="challenges.description"/>} /></Reveal>
          <Reveal delay={0.12}><p className="challenges-section__aside"><CmsText k="challenges.aside"/></p><span className="challenges-section__aside-index"><CmsText k="challenges.asideIndex"/></span></Reveal>
        </div>
        <div className="challenge-list">
          {Array.from({length:6},(_,index)=>({problem:t(`challenge.${index+1}.problem` as TranslationKey),solution:t(`challenge.${index+1}.solution` as TranslationKey)})).map((item, index) => {
            const Icon = icons[index]!;
            return <Reveal key={index} delay={index * 0.06}><article className="challenge-row"><span className="challenge-row__number" dir="ltr">0{index + 1}</span><span className="challenge-row__icon"><Icon size={21} strokeWidth={1.6} /></span><h3>{item.problem}</h3><p>{item.solution}</p><Arrow className="challenge-row__arrow" size={19} aria-hidden="true" /></article></Reveal>;
          })}
        </div>
      </Container>
    </section>
  );
}
