import { forwardRef, InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={clsx(
        'w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-black transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary dark:border-border dark:bg-primary dark:text-secondary',
        className
      )}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export default Input;
