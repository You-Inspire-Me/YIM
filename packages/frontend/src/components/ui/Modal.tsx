import { X } from 'lucide-react';
import { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const Modal = ({ isOpen, onClose, title, children }: ModalProps): JSX.Element | null => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-xl bg-white p-6 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#1E293B] dark:text-white">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 hover:bg-[#F8FAFC] dark:hover:bg-gray-800"
              aria-label="Close modal"
            >
              <X className="h-5 w-5 text-[#64748B]" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

export default Modal;

