import { ChangeEventHandler, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface InputFieldProps {
  label: string;
  value?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  description?: string;
  error?: string;
  icon?: ReactNode;
  type?: string;
  disabled?: boolean;
}

export function InputField({
  label,
  value,
  onChange,
  placeholder,
  description,
  error,
  icon,
  type = 'text',
  disabled,
}: InputFieldProps) {
  return (
    <label className="block space-y-2 text-sm text-foreground/90">
      <div className="flex items-center justify-between">
        <span className="font-semibold">{label}</span>
        {description ? <span className="text-xs text-muted">{description}</span> : null}
      </div>
      <div
        className={cn(
          'flex items-center gap-3 rounded-[12px] border border-white/10 bg-background/80 px-3 py-2 shadow-soft transition',
          'focus-within:border-[#6C4DFF]/50 focus-within:ring-2 focus-within:ring-[#6C4DFF]/30',
          disabled && 'opacity-60'
        )}
      >
        {icon ? <span className="text-muted">{icon}</span> : null}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted focus:outline-none"
        />
      </div>
      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
    </label>
  );
}

export default InputField;
