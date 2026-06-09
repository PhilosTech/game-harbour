import Link from 'next/link';

type ReturnToSessionLinkProps = {
  href: string;
  label: string;
  className?: string;
};

export function ReturnToSessionLink({
  href,
  label,
  className = 'min-h-11 rounded-xl bg-accent px-4 text-sm font-semibold text-background hover:bg-accent-hover',
}: ReturnToSessionLinkProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center ${className}`}
    >
      {label}
    </Link>
  );
}
