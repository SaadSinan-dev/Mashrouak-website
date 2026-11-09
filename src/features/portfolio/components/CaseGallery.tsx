import {CmsText,CmsValue} from '../../content/Editable';
import type { Project } from '../../../types/content';
import { useLocale } from '../../../app/providers/preferences-context';
import type { TranslationKey } from '../../../locales/messages';
import { Container } from '../../../components/ui/Container';
import { SmartImage } from '../../../components/shared/SmartImage';
import { mediaUrl } from '../../../lib/platform-api';

export function CaseGallery({ project }: { project: Project }) {
  const { language } = useLocale();
  if(project.cms?.gallery.length) return <section className="case-gallery section-space"><Container><h2><CmsText k={'gallery.title'}/></h2><div className="case-real-gallery">{project.cms.gallery.map((image,index)=><figure key={`${image.url}-${index}`}><CmsValue kind="projects" slug={project.slug} path={['gallery',index]} label="Gallery image" image><SmartImage src={mediaUrl(image.url)} alt={image.alt[language]} width={1440} height={960}/></CmsValue><figcaption>{image.alt[language]}</figcaption></figure>)}</div></Container></section>;
  if(project.cms?.illustrative===false)return null;
  return <section className={`case-gallery section-space case-gallery--${project.accent}`} aria-labelledby="case-gallery-title"><Container>
    <div className="case-gallery__heading"><div><p className="eyebrow"><CmsText k={'gallery.eyebrow'}/></p><h2 id="case-gallery-title"><CmsText k={'gallery.title'}/> <span><CmsText k={'gallery.emphasis'}/></span></h2></div><p><CmsText k={'gallery.description'}/></p></div>
    <div className="case-gallery__grid">{[1, 2, 3].map((index) => <figure className="case-gallery__item" key={index}>
      <div className={`case-gallery__mockup case-gallery__mockup--${index}`} aria-hidden="true">
        {index === 1 ? <div className="case-mini-window"><div className="case-mini-window__bar"><i /><i /><i /></div><div className="case-mini-window__hero"><b /><span /><span /></div><div className="case-mini-window__tiles"><i /><i /><i /></div></div> : null}
        {index === 2 ? <div className="case-mini-list"><div className="case-mini-list__heading"><b /><i /></div>{[0, 1, 2, 3].map((item) => <div className="case-mini-list__row" key={item}><i /><span /><b /></div>)}</div> : null}
        {index === 3 ? <div className="case-mini-flow"><span /><i /><span /><i /><span /></div> : null}
        <span className="case-gallery__mockup-index" dir="ltr">{project.slug.toUpperCase()} / 0{index}</span>
      </div>
      <figcaption><span dir="ltr">0{index}</span><div><h3><CmsText k={`gallery.${index}.title` as TranslationKey}/></h3><p><CmsText k={`gallery.${index}.caption` as TranslationKey}/></p></div></figcaption>
    </figure>)}</div>
  </Container></section>;
}
