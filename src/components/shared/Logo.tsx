import { siteConfig } from '../../config/site';
import { useLocale, useTheme } from '../../app/providers/PreferencesProvider';

interface LogoProps {
  variant?: 'light' | 'dark' | 'auto';
  className?: string;
  width?: number;
}

export function Logo({ variant = 'auto', className, width = 190 }: LogoProps) {
  const { theme } = useTheme();
  const { language } = useLocale();
  const resolvedVariant = variant === 'auto' ? (theme === 'dark' ? 'dark' : 'light') : variant;
  const src = language === 'en'
    ? (resolvedVariant === 'dark' ? '/brand/logo-horizontal-en-ivory.png' : '/brand/logo-horizontal-en-colour.png')
    : (resolvedVariant === 'dark' ? siteConfig.logo.dark : siteConfig.logo.light);

  return (
    <span className={`brand-lockup ${className ?? ''}`} style={{ width: `${width}px`, height: `${Math.round(width * 0.3)}px`, maxWidth: '100%' }}>
      <img
        src={src}
        alt={language === 'ar' ? 'مشروعك.net' : 'Mashrouak.net'}
        width={width}
        height={Math.round(width * 0.3)}
        decoding="async"
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </span>
  );
}
