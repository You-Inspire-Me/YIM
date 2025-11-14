import { forwardRef, SelectHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={clsx(
      'w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-black transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary dark:border-border dark:bg-primary dark:text-secondary',
      className
    )}
    {...props}
  >
    {children}
  </select>
));

Select.displayName = 'Select';

export default Select;
