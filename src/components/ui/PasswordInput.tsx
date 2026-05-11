import { useState, type InputHTMLAttributes } from 'react';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  inputClassName?: string;
  iconClassName?: string;
  leftIcon?: string;
}

export default function PasswordInput({
  inputClassName,
  iconClassName = 'text-base',
  leftIcon,
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      {leftIcon && (
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
          <i className={`${leftIcon} text-lg`}></i>
        </span>
      )}
      <input
        {...props}
        type={showPassword ? 'text' : 'password'}
        className={inputClassName}
      />
      <button
        type="button"
        onClick={() => setShowPassword((value) => !value)}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
        aria-label={showPassword ? 'Hide password' : 'Show password'}
      >
        <i className={`${showPassword ? 'ri-eye-off-line' : 'ri-eye-line'} ${iconClassName}`}></i>
      </button>
    </div>
  );
}
