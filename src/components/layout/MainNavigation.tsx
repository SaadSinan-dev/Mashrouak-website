import type { CSSProperties } from 'react';
import {
  BriefcaseBusiness,
  House,
  Layers3,
  Mail,
  UsersRound,
  Workflow,
  ChartNoAxesCombined,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useLocale } from '../../app/providers/preferences-context';
import { mainNavigation } from '../../config/navigation';
import { usePlatform, useSettings } from '../../app/providers/content-context';
import { Skeleton } from '../../../shared/ui/Skeleton';
import {CmsValue} from '../../features/content/Editable';

const navigationIcons = {
  '/': House,
  '/services': Layers3,
  '/work': BriefcaseBusiness,
  '/about': UsersRound,
  '/process': Workflow,
  '/contact': Mail,
  '/results': ChartNoAxesCombined,
} as const;

interface MainNavigationProps {
  onNavigate?: () => void;
  variant?: 'desktop' | 'drawer';
}

export function MainNavigation({ onNavigate, variant = 'desktop' }: MainNavigationProps) {
  const { t, language } = useLocale();
  const settings = useSettings();
  const { loading } = usePlatform();
  const items = settings?.navigation ?? [...mainNavigation.map(item => ({ to:item.to,label:{ar:t(item.key),en:t(item.key)} })),{to:'/results',label:{ar:'نتائجنا',en:'Our Results'}}];
  const isDrawer = variant === 'drawer';

  return (
    <nav className={`main-navigation${isDrawer ? ' main-navigation--drawer' : ''}`} aria-label={t('a11y.mainNav')}>
      {loading ? <span className="nav-skeleton" aria-label={t('common.loading')} role="status">{Array.from({length:6},(_,i)=><Skeleton className="sk-caption" key={i}/>)}</span> : <>
      {items.map((item, index) => {
        const Icon = navigationIcons[item.to as keyof typeof navigationIcons] ?? Layers3;
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
            <span className="main-navigation__label"><CmsValue kind="settings" slug="global" path={['navigation',index]} label="Navigation link">{item.label[language]}</CmsValue></span>
          </NavLink>
        );
      })}
      </>}
    </nav>
  );
}
