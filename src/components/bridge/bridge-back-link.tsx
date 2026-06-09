import Link from 'next/link';

type BridgeBackLinkProps = {
  href: string;
  label: string;
};

export function BridgeBackLink({ href, label }: BridgeBackLinkProps) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm text-muted transition-colors hover:text-foreground"
      aria-label={label}
    >
      <svg
        aria-hidden="true"
        className="h-5 w-5 shrink-0"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12.5 15 7.5 10l5-5" />
      </svg>
      <span>{label}</span>
    </Link>
  );
}
