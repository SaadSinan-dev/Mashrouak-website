import {CmsText} from '../../features/content/Editable';
import { ArrowUpLeft, ArrowUpRight, MoveUpLeft, MoveUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLocale } from '../../app/providers/preferences-context';
import { Container } from '../ui/Container';

export function CTASection() {
  const { isArabic } = useLocale();
  const Arrow = isArabic ? ArrowUpLeft : ArrowUpRight;
  const Move = isArabic ? MoveUpLeft : MoveUpRight;
  return (
    <section className="cta-section" aria-labelledby="cta-title"><Container className="cta-section__inner">
      <div className="cta-section__mark" aria-hidden="true"><img src="/brand/symbol-white.svg" alt="" /></div>
      <div className="cta-section__copy"><p className="eyebrow eyebrow--light"><CmsText k="cta.eyebrow"/></p><h2 id="cta-title"><CmsText k="cta.title"/><br /><span><CmsText k="cta.emphasis"/></span></h2><p><CmsText k="cta.description"/></p></div>
      <Link className="cta-section__button" to="/contact"><span><CmsText k={'common.startProject'}/></span><Arrow size={22} /></Link>
      <span className="cta-section__index"><CmsText k="cta.index"/></span><Move className="cta-section__decor" size={28} aria-hidden="true" />
    </Container></section>
  );
}
