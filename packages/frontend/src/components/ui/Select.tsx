import { forwardRef, SelectHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={clsx(
      'w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm transition focus:border-[#0EA5E9] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] dark:border-gray-700 dark:bg-gray-900',
      className
    )}
    {...props}
  >
    {children}
  </select>
));

Select.displayName = 'Select';

export default Select;
