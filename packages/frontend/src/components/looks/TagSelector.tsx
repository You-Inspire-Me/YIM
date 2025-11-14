import { useState, useRef, useEffect } from 'react';
import { X, Plus, ChevronDown } from 'lucide-react';

interface TagSelectorProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  suggestions?: string[];
}

const defaultSuggestions = [
  'summer',
  'winter',
  'casual',
  'formal',
  'wedding',
  'party',
  'office',
  'sporty',
  'vintage',
  'minimalist',
  'boho',
  'streetwear'
];

const TagSelector = ({ tags, onTagsChange, suggestions = defaultSuggestions }: TagSelectorProps): JSX.Element => {
  const [isOpen, setIsOpen] = useState(false);
  const [newTag, setNewTag] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const availableSuggestions = suggestions.filter((tag) => !tags.includes(tag));

  const handleAddTag = (tag: string): void => {
    if (tag.trim() && !tags.includes(tag.trim().toLowerCase())) {
      onTagsChange([...tags, tag.trim().toLowerCase()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string): void => {
    onTagsChange(tags.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tags</label>
      <div className="relative" ref={dropdownRef}>
        <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-900">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-3 py-1 text-sm font-medium text-teal-800 dark:bg-teal-900/30 dark:text-teal-400"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="hover:text-teal-900 dark:hover:text-teal-300"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-3 py-1 text-sm text-gray-500 transition hover:border-teal-500 hover:text-teal-600 dark:border-gray-600 dark:text-gray-400"
          >
            <Plus className="h-4 w-4" />
            Tag toevoegen
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {isOpen && (
          <div className="absolute left-0 top-full z-10 mt-2 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
            <div className="p-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag(newTag);
                  }
                }}
                placeholder="Type nieuwe tag..."
                className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                autoFocus
              />
              {availableSuggestions.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="px-2 text-xs font-medium text-gray-500 dark:text-gray-400">Suggesties:</p>
                  {availableSuggestions.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleAddTag(tag)}
                      className="w-full rounded px-2 py-1 text-left text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TagSelector;

