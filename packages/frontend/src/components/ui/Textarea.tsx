import { forwardRef, TextareaHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={clsx(
        'w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm transition focus:border-[#0EA5E9] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] dark:border-gray-700 dark:bg-gray-900',
        className
      )}
      {...props}
    />
  );
});

Textarea.displayName = 'Textarea';

export default Textarea;
