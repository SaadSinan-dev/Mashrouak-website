import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {SkeletonRegion,SkeletonForm,SkeletonChatHistory,SkeletonPage,SkeletonTable,SkeletonDashboard,SkeletonImage,SkeletonCard,SkeletonProjectCard,SkeletonEditor,SkeletonMedia,SkeletonNavigation,SkeletonStatCard,SkeletonChart,SkeletonPageSection,SkeletonText,SkeletonChatMessage} from '../shared/ui/Skeleton';
import {ResourceError} from '../shared/ui/ResourceError';

describe('structural loading states',()=>{
  it('announces one localized loading region and hides decorative geometry',()=>{
    const html=renderToStaticMarkup(<SkeletonRegion label="جارٍ تحميل الرسائل"><SkeletonChatHistory/></SkeletonRegion>);
    expect(html).toContain('aria-busy="true"');expect(html).toContain('aria-label="جارٍ تحميل الرسائل"');expect(html).toContain('aria-hidden="true"');
    expect((html.match(/class="sk-message /g)??[]).length).toBe(5);expect(html).toContain('sk-message--own');
  });
  it('keeps authentication wireframes to two single-line inputs',()=>{
    const html=renderToStaticMarkup(<SkeletonForm fields={2}/>);
    expect(html).not.toContain('sk-input--area');expect((html.match(/class="skeleton sk-input"/g)??[]).length).toBe(2);
  });
  it('renders table columns, chart structure and responsive page compositions',()=>{
    const table=renderToStaticMarkup(<SkeletonTable rows={4} columns={3}/>);
    expect((table.match(/class="sk-table__row"/g)??[]).length).toBe(5);expect(table).toContain('repeat(3,minmax(0,1fr))');
    for(const kind of ['home','portfolio','case','services','contact','chat','process','results','legal','default'] as const) {
      const html=renderToStaticMarkup(<SkeletonPage kind={kind} label="Loading content"/>);
      expect(html).toContain('aria-busy="true"');expect(html).not.toMatch(/spinner|animate-spin|<svg/);
    }
    const dashboard=renderToStaticMarkup(<SkeletonDashboard/>);expect(dashboard).toContain('sk-chart--horizontal');expect(dashboard).toContain('sk-stat');
  });
  it('all reusable compositions render without timers or missing dimensions',()=>{
    const html=renderToStaticMarkup(<><SkeletonImage ratio="4 / 3"/><SkeletonCard/><SkeletonProjectCard/><SkeletonEditor/><SkeletonMedia/><SkeletonNavigation/><SkeletonStatCard/><SkeletonChart/><SkeletonPageSection/><SkeletonText/><SkeletonChatMessage/></>);
    expect(html).toContain('aspect-ratio:4 / 3');expect(html).not.toMatch(/NaN|undefined|spinner|animate-spin/);
  });
  it('failure is separate from loading and offers a localized retry action',()=>{
    const english=renderToStaticMarkup(<ResourceError language="en" onRetry={()=>{}}/>);
    const arabic=renderToStaticMarkup(<ResourceError language="ar" onRetry={()=>{}}/>);
    expect(english).toContain('Retry');expect(arabic).toContain('إعادة المحاولة');expect(english).not.toContain('aria-busy="true"');
  });
});
