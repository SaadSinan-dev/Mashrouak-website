import { ArrowUpLeft, ArrowUpRight, MapPin, Search, ShoppingBag, Utensils } from 'lucide-react';
import type { TranslationKey } from '../../locales/messages';
import type { Project } from '../../types/content';
import { useLocale } from '../../app/providers/PreferencesProvider';

function SyrianMenuArtwork() {
  const { t } = useLocale();
  const tabs = t('art.menu.tabs').split('|');
  const items = [1, 2, 3];
  return <div className="artwork artwork--menu" aria-hidden="true"><div className="menu-window">
    <div className="menu-window__top"><span className="menu-mark"><Utensils size={13} /></span><span>{t('art.menu.title')}</span><span className="menu-dot" /></div>
    <div className="menu-window__hero"><span>{t('art.menu.tagline')}</span><small>{t('art.menu.sub')}</small></div>
    <div className="menu-tabs">{tabs.map((tab) => <i key={tab}>{tab}</i>)}</div>
    {items.map((index) => <div className="menu-item" key={index}><span className={`menu-food menu-food--${['one', 'two', 'three'][index - 1]}`} /><span><b>{t(`art.menu.item${index}` as TranslationKey)}</b><small>{t(`art.menu.item${index}sub` as TranslationKey)}</small></span><strong>{t('art.menu.price')}</strong></div>)}
  </div><div className="artwork__caption">{t('art.menu.caption')} / 01</div></div>;
}

function PetCornerArtwork() {
  const { t, isArabic } = useLocale();
  const Arrow = isArabic ? ArrowUpLeft : ArrowUpRight;
  const petTitle = t('art.pet.title').split('|');
  return <div className="artwork artwork--pet" aria-hidden="true"><div className="pet-window">
    <div className="pet-window__top"><span dir="ltr">pet corner</span><span><Search size={13} /><ShoppingBag size={13} /></span></div>
    <div className="pet-window__hero"><small>{t('art.pet.tagline')}</small><b>{petTitle[0]}<br />{petTitle[1]}</b><span>{t('art.pet.link')} <Arrow size={12} /></span></div>
    <div className="pet-products"><div className="pet-product"><span className="pet-product__image pet-product__image--a" /><small>{t('art.pet.category1')}</small><b>{t('art.pet.item1')}</b><strong>•••</strong></div><div className="pet-product"><span className="pet-product__image pet-product__image--b" /><small>{t('art.pet.category2')}</small><b>{t('art.pet.item2')}</b><strong>•••</strong></div></div>
  </div><div className="artwork__caption">{t('art.pet.caption')} / 02</div></div>;
}

function MashwarakArtwork() {
  const { t } = useLocale();
  return <div className="artwork artwork--ride" aria-hidden="true"><div className="ride-phone"><div className="ride-phone__speaker" /><div className="ride-phone__map"><div className="map-street map-street--one" /><div className="map-street map-street--two" /><div className="map-street map-street--three" /><div className="map-route" /><span className="map-pin map-pin--start"><MapPin size={12} /></span><span className="map-pin map-pin--end"><MapPin size={12} /></span><span className="map-label map-label--a">{t('art.ride.center')}</span><span className="map-label map-label--b">{t('art.ride.park')}</span></div><div className="ride-phone__details"><small>{t('art.ride.next')}</small><b>{t('art.ride.driver')}</b><span><i /> {t('art.ride.updated')}</span></div></div><div className="ride-float"><span>{t('art.ride.new')}</span><b>{t('art.ride.confirmed')}</b><small>{t('art.ride.details')}</small></div><div className="artwork__caption">{t('art.ride.caption')} / 03</div></div>;
}

export function ProjectArtwork({ project }: { project: Project }) {
  if (project.slug === 'syrian-menu') return <SyrianMenuArtwork />;
  if (project.slug === 'pet-corner') return <PetCornerArtwork />;
  if (project.slug === 'mashwarak') return <MashwarakArtwork />;
  return <div className="artwork artwork--generic" aria-hidden="true"><div className="generic-window"><div /><div /><div /></div><div className="artwork__caption">{t('art.generic.caption')}</div></div>;
}
