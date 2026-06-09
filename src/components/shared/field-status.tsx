type FieldStatusProps = {
  tone: 'success' | 'warning' | 'error' | 'muted';
  children: React.ReactNode;
};

const toneClasses: Record<FieldStatusProps['tone'], string> = {
  success: 'border-emerald-900/50 bg-emerald-950/40 text-emerald-200',
  warning: 'border-amber-900/50 bg-amber-950/40 text-amber-100',
  error: 'border-red-900/50 bg-red-950/40 text-red-300',
  muted: 'text-muted',
};

export function FieldStatus({ tone, children }: FieldStatusProps) {
  if (tone === 'muted') {
    return (
      <p className={`text-xs ${toneClasses.muted}`} role="status">
        {children}
      </p>
    );
  }

  return (
    <p
      className={`rounded-lg border px-3 py-2 text-xs ${toneClasses[tone]}`}
      role="status"
    >
      {children}
    </p>
  );
}
