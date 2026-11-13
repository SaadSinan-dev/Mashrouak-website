import { useLocale } from '../../app/providers/preferences-context';

export function ProjectFeedStatus({ loading, error, stale, retry }: { loading: boolean; error: boolean; stale: boolean; retry: () => void }) {
  const { language } = useLocale();
  if (loading) return <div className="showcase-status" role="status" aria-busy="true">{language === 'ar' ? 'جارٍ تحميل المشاريع…' : 'Loading projects…'}</div>;
  if (!error) return null;
  return <div className="showcase-status" role="status"><span>{stale ? (language === 'ar' ? 'تعذّر التحديث. تُعرض آخر نسخة محفوظة.' : 'Refresh failed. Showing the last saved projects.') : (language === 'ar' ? 'تعذّر تحميل المشاريع الآن.' : 'Projects are temporarily unavailable.')}</span><button type="button" onClick={retry}>{language === 'ar' ? 'إعادة المحاولة' : 'Retry'}</button></div>;
}
