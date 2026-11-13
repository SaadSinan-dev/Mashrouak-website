import {CmsText,CmsCopy,CmsValue} from '../../features/content/Editable';
import { useServices } from '../../app/providers/content-context';
import { ArrowUpLeft, ArrowUpRight, Github, Instagram, Mail, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLocale } from '../../app/providers/preferences-context';
import { Logo } from '../shared/Logo';
import { footerNavigation } from '../../config/navigation';
import { siteConfig } from '../../config/site';
import { useSettings } from '../../app/providers/content-context';
import { useState } from 'react';

export function SiteFooter() {
  const [year] = useState(() => new Date().getFullYear());
  const { t, language } = useLocale();
  const isArabic = language === 'ar';
  const settings = useSettings();
  const contact = settings ?? siteConfig.contact;
  const navigation = settings?.navigation ?? footerNavigation.map(item => ({to:item.to,label:{ar:t(item.key),en:t(item.key)}}));
  const serviceLinks = useServices(language);
  const Arrow = isArabic ? ArrowUpLeft : ArrowUpRight;

  return (
    <footer className="site-footer">
      <div className="container-shell">
        <div className="site-footer__main">
          <div className="site-footer__brand-column">
            <Link to="/" aria-label={t('header.brandHome')}><Logo variant="dark" width={184} /></Link>
            <p><CmsValue kind="settings" slug="global" path={['footerText']} label="Footer description">{settings?.footerText[language] || t('footer.description')}</CmsValue></p>
            <Link className="site-footer__contact-link" to="/contact"><CmsText k="footer.startConversation"/> <Arrow size={17} /></Link>
            <div className="site-footer__contact-channels" aria-label={isArabic ? 'قنوات التواصل الرسمية' : 'Official contact channels'}>
              <a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noopener noreferrer" aria-label={isArabic ? 'تواصل عبر واتساب' : 'Contact us on WhatsApp'}><MessageCircle size={15} /><span><CmsCopy copyKey="visual.SiteFooter.0027d82c4a" ar="واتساب" en="WhatsApp"/></span></a>
              <a href={`mailto:${contact.email}`} aria-label={isArabic ? 'راسلنا عبر البريد' : 'Email us'}><Mail size={15} /><span><CmsCopy copyKey="visual.SiteFooter.8681cda7f8" ar="البريد" en="Email"/></span></a>
<a
  href="https://github.com/Mashrouak-net"
  target="_blank"
  rel="noopener noreferrer"
  aria-label={isArabic ? 'زيارة GitHub' : 'Visit our GitHub'}
>
  <Github size={15} />
  <span>GitHub</span>
</a>
              <a href={contact.instagram} target="_blank" rel="noopener noreferrer" aria-label={isArabic ? 'زيارة حساب إنستغرام' : 'Visit Instagram'}><Instagram size={15} /><span><CmsCopy copyKey="visual.SiteFooter.662b3435d2" ar="إنستغرام" en="Instagram"/></span></a>
            </div>
          </div>
          <div className="site-footer__links-column">
            <h2><CmsText k="footer.browse"/></h2>
            <ul>{navigation.map((item,index) => <li key={item.to}><Link to={item.to}><CmsValue kind="settings" slug="global" path={['navigation',index]} label="Footer navigation link">{item.label[language]}</CmsValue></Link></li>)}</ul>
          </div>
          <div className="site-footer__links-column">
            <h2><CmsText k="footer.solutions"/></h2>
            <ul>{serviceLinks.map((item) => <li key={item.id}><Link to={`/services#${item.id}`}><CmsValue kind="services" slug={item.id} path={['title']} label="Service name">{item.title}</CmsValue></Link></li>)}</ul>
          </div>
          <div className="site-footer__note-column">
            <span className="footer-index">01 / 04</span>
            <p><CmsText k="footer.note"/></p>
            <Link to="/process" aria-label={t('footer.process')} className="site-footer__round-link"><Arrow size={19} /></Link>
          </div>
        </div>
        <div className="site-footer__bottom">
          <span>© {year} <CmsText k="footer.copyright"/></span>
          <div className="site-footer__legal-links"><Link to="/terms"><CmsCopy copyKey="visual.SiteFooter.919985ac32" ar="الشروط والأحكام" en="Terms and Conditions"/></Link><Link to="/privacy"><CmsText k="footer.privacy"/></Link><span className="site-footer__separator" /><span><CmsText k="footer.tagline"/></span></div>
          <span className="site-footer__signature"><CmsText k="footer.signature"/></span>
        </div>
      </div>
    </footer>
  );
}
