import { AppRouter } from './router';
import { AppProviders } from './providers/AppProviders';

export function App() {
  return <AppProviders><AppRouter /></AppProviders>;
}
