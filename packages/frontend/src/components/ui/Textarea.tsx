import { forwardRef, TextareaHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={clsx(
        'w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-black transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary dark:border-border dark:bg-primary dark:text-secondary',
        className
      )}
      {...props}
    />
  );
});

Textarea.displayName = 'Textarea';

export default Textarea;
