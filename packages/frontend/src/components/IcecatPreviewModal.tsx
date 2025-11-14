import { Check, X } from 'lucide-react';
import Button from './ui/Button';
import Modal from './ui/Modal';

export interface IcecatProduct {
  title: string;
  description: string;
  brand: string;
  images: string[];
  specs: {
    size?: string;
    color?: string;
    material?: string;
    weight?: string;
    [key: string]: string | undefined;
  };
  ean: string;
}

interface IcecatPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: IcecatProduct;
  onUse: (product: IcecatProduct) => void;
  onEdit: (product: IcecatProduct) => void;
}

export const IcecatPreviewModal = ({
  isOpen,
  onClose,
  product,
  onUse,
  onEdit
}: IcecatPreviewModalProps): JSX.Element => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Product gevonden">
      <div className="space-y-4">
        {/* Product Image */}
        {product.images && product.images.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {product.images.slice(0, 5).map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt={product.title}
                className="h-32 w-32 flex-shrink-0 rounded-lg object-cover border border-gray-200"
              />
            ))}
          </div>
        )}

        {/* Product Info */}
        <div className="space-y-2">
          <div>
            <p className="text-sm font-medium text-gray-500">Titel</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{product.title}</p>
          </div>

          {product.brand && (
            <div>
              <p className="text-sm font-medium text-gray-500">Merk</p>
              <p className="text-gray-900 dark:text-white">{product.brand}</p>
            </div>
          )}

          {product.description && (
            <div>
              <p className="text-sm font-medium text-gray-500">Beschrijving</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                {product.description}
              </p>
            </div>
          )}

          {/* Specs */}
          {Object.keys(product.specs).length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Specificaties</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(product.specs).map(([key, value]) => (
                  <div key={key} className="text-sm">
                    <span className="font-medium text-gray-600 dark:text-gray-400">{key}:</span>{' '}
                    <span className="text-gray-900 dark:text-white">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-gray-500">EAN</p>
            <p className="text-gray-900 dark:text-white">{product.ean}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            <X className="mr-2 h-4 w-4" />
            Annuleren
          </Button>
          <Button
            variant="secondary"
            onClick={() => onEdit(product)}
            className="flex-1"
          >
            Bewerken
          </Button>
          <Button
            onClick={() => onUse(product)}
            className="flex-1"
          >
            <Check className="mr-2 h-4 w-4" />
            Gebruik
          </Button>
        </div>
      </div>
    </Modal>
  );
};

