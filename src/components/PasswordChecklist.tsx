import { validatePassword } from '@/lib/passwordValidation';
import { Check, X } from 'lucide-react';

interface PasswordChecklistProps {
  password: string;
}

export function PasswordChecklist({ password }: PasswordChecklistProps) {
  if (!password) return null;
  const checks = validatePassword(password);

  return (
    <ul className="space-y-1 mt-1.5">
      {checks.map((c) => (
        <li key={c.label} className="flex items-center gap-1.5 text-xs">
          {c.met ? (
            <Check className="h-3 w-3 text-emerald-500 shrink-0" />
          ) : (
            <X className="h-3 w-3 text-destructive shrink-0" />
          )}
          <span className={c.met ? 'text-muted-foreground' : 'text-destructive'}>
            {c.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
