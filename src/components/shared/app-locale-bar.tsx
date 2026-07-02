import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { LocaleSwitcher } from "@/components/harbour/locale-switcher";

type AppLocaleBarProps = {
  locale: string;
};

export async function AppLocaleBar({ locale }: AppLocaleBarProps) {
  const t = await getTranslations("common");

  return (
    <div className="flex items-center justify-between px-4 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <Link
        href={`/${locale}`}
        className="text-sm font-medium uppercase tracking-[0.2em] text-accent"
      >
        {t("appName")}
      </Link>
      <LocaleSwitcher />
    </div>
  );
}
