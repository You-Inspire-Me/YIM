import { useState } from 'react';
import { X } from 'lucide-react';

const TopBanner = (): JSX.Element | null => {
  const [isVisible, setIsVisible] = useState(true);
  const message = import.meta.env.VITE_ANNOUNCEMENT || 'Black Friday: tot 50% korting';

  if (!message || !isVisible) {
    return null;
  }

  return (
    <div className="bg-accent border-b border-accent py-2">
      <div className="mx-auto flex max-w-7xl items-center justify-center px-4">
        <p className="text-sm font-medium text-black">{message}</p>
        <button
          type="button"
          onClick={() => setIsVisible(false)}
          className="ml-4 rounded-full p-1 hover:bg-accent transition"
          aria-label="Close banner"
        >
          <X className="h-4 w-4 text-black" />
        </button>
      </div>
    </div>
  );
};

export default TopBanner;

