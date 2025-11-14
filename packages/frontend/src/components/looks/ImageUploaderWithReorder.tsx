import { useState, useRef } from 'react';
import { Upload, X, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '../ui/Button';
import { uploadImage } from '../../lib/cloudinary';

interface ImageUploaderWithReorderProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
}

const ImageUploaderWithReorder = ({
  images,
  onImagesChange,
  maxImages = 10
}: ImageUploaderWithReorderProps): JSX.Element => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList | null): Promise<void> => {
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      toast.error(`Maximum ${maxImages} afbeeldingen toegestaan`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setIsUploading(true);

    try {
      const uploadPromises = filesToUpload.map((file) => uploadImage(file));
      const urls = await Promise.all(uploadPromises);
      onImagesChange([...images, ...urls]);
      toast.success(`${urls.length} afbeelding(en) geüpload`);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Upload mislukt';
      toast.error(errorMessage);
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = (index: number): void => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  const moveImage = (index: number, direction: 'up' | 'down'): void => {
    const newImages = [...images];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= images.length) return;

    [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
    onImagesChange(newImages);
  };

  return (
    <div className="space-y-4">
      <div
        className="relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 transition hover:border-teal-500 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-teal-500"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
          disabled={isUploading || images.length >= maxImages}
        />
        {isUploading ? (
          <Loader2 className="h-12 w-12 animate-spin text-teal-600" />
        ) : (
          <>
            <Upload className="h-12 w-12 text-gray-400" />
            <p className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">
              Klik om afbeeldingen te uploaden
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {images.length}/{maxImages} afbeeldingen
            </p>
          </>
        )}
      </div>

      {images.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {images.map((url, index) => (
            <div key={index} className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
              <img src={url} alt={`Upload ${index + 1}`} className="h-full w-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveImage(index, 'up');
                  }}
                  disabled={index === 0}
                  className="rounded-full bg-white/90 p-2 disabled:opacity-50"
                  aria-label="Move up"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveImage(index, 'down');
                  }}
                  disabled={index === images.length - 1}
                  className="rounded-full bg-white/90 p-2 disabled:opacity-50"
                  aria-label="Move down"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(index);
                  }}
                  className="rounded-full bg-red-500/90 p-2 text-white"
                  aria-label="Remove"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs font-semibold text-white">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUploaderWithReorder;

