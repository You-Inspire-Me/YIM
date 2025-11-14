import { forwardRef, InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={clsx(
        'w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm transition focus:border-[#0EA5E9] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] dark:border-gray-700 dark:bg-gray-900',
        className
      )}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export default Input;
