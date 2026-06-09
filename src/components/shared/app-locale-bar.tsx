import { LocaleSwitcher } from '@/components/harbour/locale-switcher';

export function AppLocaleBar() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-end px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="pointer-events-auto">
        <LocaleSwitcher />
      </div>
    </div>
  );
}
