import {
  AppWindow,
  Blocks,
  Cable,
  MonitorSmartphone,
  ShoppingBag,
  Smartphone,
} from 'lucide-react';
import type { Service } from '../../types/content';

const icons = {
  website: MonitorSmartphone,
  store: ShoppingBag,
  mobile: Smartphone,
  webapp: AppWindow,
  system: Blocks,
  integration: Cable,
} as const;

export function ServiceIcon({ name, size = 24 }: { name: Service['icon']; size?: number }) {
  const Icon = icons[name];
  return <Icon aria-hidden="true" size={size} strokeWidth={1.6} />;
}
