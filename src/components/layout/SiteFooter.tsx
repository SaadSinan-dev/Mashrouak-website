import { ArrowUpLeft, ArrowUpRight, Instagram, Mail, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLocale } from '../../app/providers/PreferencesProvider';
import { Logo } from '../shared/Logo';
import { getLocalizedServices } from '../../locales/content';
import { footerNavigation } from '../../config/navigation';
import { siteConfig } from '../../config/site';

export function SiteFooter() {
  const year = new Date().getFullYear();
  const { t, language } = useLocale();
  const isArabic = language === 'ar';
  const serviceLinks = getLocalizedServices(language);
  const Arrow = isArabic ? ArrowUpLeft : ArrowUpRight;

  return (
    <footer className="site-footer">
      <div className="container-shell">
        <div className="site-footer__main">
          <div className="site-footer__brand-column">
            <Link to="/" aria-label={t('header.brandHome')}><Logo variant="dark" width={184} /></Link>
            <p>{t('footer.description')}</p>
            <Link className="site-footer__contact-link" to="/contact">{t('footer.startConversation')} <Arrow size={17} /></Link>
            <div className="site-footer__contact-channels" aria-label={isArabic ? 'قنوات التواصل الرسمية' : 'Official contact channels'}>
              <a href={`https://wa.me/${siteConfig.contact.whatsapp}`} target="_blank" rel="noopener noreferrer" aria-label={isArabic ? 'تواصل عبر واتساب' : 'Contact us on WhatsApp'}><MessageCircle size={15} /><span>{isArabic ? 'واتساب' : 'WhatsApp'}</span></a>
              <a href={`mailto:${siteConfig.contact.email}`} aria-label={isArabic ? 'راسلنا عبر البريد' : 'Email us'}><Mail size={15} /><span>{isArabic ? 'البريد' : 'Email'}</span></a>
              <a href={siteConfig.contact.instagram} target="_blank" rel="noopener noreferrer" aria-label={isArabic ? 'زيارة حساب إنستغرام' : 'Visit Instagram'}><Instagram size={15} /><span>{isArabic ? 'إنستغرام' : 'Instagram'}</span></a>
            </div>
          </div>
          <div className="site-footer__links-column">
            <h2>{t('footer.browse')}</h2>
            <ul>{footerNavigation.map((item) => <li key={item.to}><Link to={item.to}>{t(item.key)}</Link></li>)}</ul>
          </div>
          <div className="site-footer__links-column">
            <h2>{t('footer.solutions')}</h2>
            <ul>{serviceLinks.map((item) => <li key={item.id}><Link to={`/services#${item.id}`}>{item.title}</Link></li>)}</ul>
          </div>
          <div className="site-footer__note-column">
            <span className="footer-index">01 / 04</span>
            <p>{t('footer.note')}</p>
            <Link to="/process" aria-label={t('footer.process')} className="site-footer__round-link"><Arrow size={19} /></Link>
          </div>
        </div>
        <div className="site-footer__bottom">
          <span>© {year} {t('footer.copyright')}</span>
          <div className="site-footer__legal-links"><Link to="/terms">{isArabic ? 'الشروط والأحكام' : 'Terms and Conditions'}</Link><Link to="/privacy">{t('footer.privacy')}</Link><span className="site-footer__separator" /><span>{t('footer.tagline')}</span></div>
          <span className="site-footer__signature">{t('footer.signature')}</span>
        </div>
      </div>
    </footer>
  );
}
