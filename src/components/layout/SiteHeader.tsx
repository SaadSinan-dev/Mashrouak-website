import {CmsText} from '../../features/content/Editable';
import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowUpLeft, ArrowUpRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLocale, useTheme } from '../../app/providers/preferences-context';
import { Logo } from '../shared/Logo';
import { LanguageToggle, ThemeToggle } from '../shared/PreferenceControls';
import { ButtonLink } from '../ui/Button';
import { MainNavigation } from './MainNavigation';

function MenuMark({ open }: { open: boolean }) {
  return (
    <span className={`mobile-menu-mark${open ? ' mobile-menu-mark--open' : ''}`} aria-hidden="true">
      <span className="mobile-menu-mark__line mobile-menu-mark__line--top" />
      <span className="mobile-menu-mark__line mobile-menu-mark__line--bottom" />
    </span>
  );
}

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t, isArabic } = useLocale();
  const { theme } = useTheme();
  const Arrow = isArabic ? ArrowUpLeft : ArrowUpRight;
  const logoVariant = theme === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    const updateScrollState = () => setScrolled(window.scrollY > 12);
    updateScrollState();
    window.addEventListener('scroll', updateScrollState, { passive: true });
    return () => window.removeEventListener('scroll', updateScrollState);
  }, []);

  return (
    <header className={`site-header${scrolled ? ' site-header--scrolled' : ''}`}>
      <div className="container-shell site-header__inner">
        <div className="site-header__brand-group">
          <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
            <Dialog.Trigger asChild>
              <button
                className="mobile-menu-trigger"
                type="button"
                aria-label={mobileOpen ? t('a11y.closeMenu') : t('a11y.openMenu')}
                aria-expanded={mobileOpen}
                aria-haspopup="dialog"
              >
                <MenuMark open={mobileOpen} />
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="mobile-menu-overlay" />
              <Dialog.Content className="mobile-menu-panel" aria-describedby="mobile-menu-description">
                <Dialog.Title className="sr-only">{t('a11y.mainNav')}</Dialog.Title>
                <Dialog.Description id="mobile-menu-description" className="sr-only">
                  {t('a11y.mobileDescription')}
                </Dialog.Description>
                <Dialog.Close asChild>
                  <button className="mobile-menu-close" type="button" aria-label={t('a11y.closeMenu')}>
                    <X size={20} strokeWidth={1.8} aria-hidden="true" />
                  </button>
                </Dialog.Close>

                <MainNavigation variant="drawer" onNavigate={() => setMobileOpen(false)} />

                <ButtonLink className="mobile-menu-panel__cta" to="/contact" onClick={() => setMobileOpen(false)}>
                  <CmsText k={'common.discuss'}/> <Arrow size={17} />
                </ButtonLink>
                <p className="mobile-menu-panel__note">MASHROUAK.NET</p>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>

          <Link className="site-header__brand" to="/" aria-label={t('header.brandHome')}>
            <Logo variant={logoVariant} width={174} />
          </Link>
        </div>

        <div className="site-header__desktop-nav"><MainNavigation /></div>

        <div className="site-header__actions">
          <div className="site-header__preferences" role="group" aria-label={t('header.preferences')}>
            <ThemeToggle />
            <LanguageToggle />
          </div>

        </div>
      </div>
    </header>
  );
}
