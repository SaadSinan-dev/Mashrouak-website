import type { CSSProperties } from 'react';
import {
  BriefcaseBusiness,
  House,
  Layers3,
  Mail,
  UsersRound,
  Workflow,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useLocale } from '../../app/providers/PreferencesProvider';
import { mainNavigation } from '../../config/navigation';

const navigationIcons = {
  '/': House,
  '/services': Layers3,
  '/work': BriefcaseBusiness,
  '/about': UsersRound,
  '/process': Workflow,
  '/contact': Mail,
} as const;

interface MainNavigationProps {
  onNavigate?: () => void;
  variant?: 'desktop' | 'drawer';
}

export function MainNavigation({ onNavigate, variant = 'desktop' }: MainNavigationProps) {
  const { t } = useLocale();
  const isDrawer = variant === 'drawer';

  return (
    <nav className={`main-navigation${isDrawer ? ' main-navigation--drawer' : ''}`} aria-label={t('a11y.mainNav')}>
      {mainNavigation.map((item, index) => {
        const Icon = navigationIcons[item.to as keyof typeof navigationIcons];
        return (
          <NavLink
            className={({ isActive }) => `main-navigation__link${isActive ? ' is-active' : ''}`}
            key={item.to}
            onClick={onNavigate}
            to={item.to}
            end={item.to === '/'}
            style={isDrawer ? { '--nav-index': index } as CSSProperties : undefined}
          >
            {isDrawer && <Icon className="main-navigation__icon" size={19} strokeWidth={1.7} aria-hidden="true" />}
            <span className="main-navigation__label">{t(item.key)}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
