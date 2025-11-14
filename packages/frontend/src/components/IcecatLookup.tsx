'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';

interface IcecatProduct {
  title: string;
  brand: string;
  description: string;
  images: string[];
  specs: { name: string; value: string }[];
}

export default function IcecatLookup({ onSelect }: { onSelect: (data: any) => void }) {
  const [ean, setEan] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IcecatProduct | null>(null);
  const [vendor, setVendor] = useState('');

  const search = async () => {
    setLoading(true);
    const res = await fetch(`/api/icecat?ean=${ean}&vendor=${vendor}`);
    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-accent">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="EAN"
          value={ean}
          onChange={(e) => setEan(e.target.value)}
          className="flex-1 px-3 py-2 border rounded"
        />
        <input
          type="text"
          placeholder="Merk (bijv. Nike)"
          value={vendor}
          onChange={(e) => setVendor(e.target.value)}
          className="w-32 px-3 py-2 border rounded"
        />
        <button
          onClick={search}
          disabled={loading || !ean || !vendor}
          className="px-4 py-2 bg-primary text-secondary rounded hover:bg-gray-800 flex items-center gap-2"
        >
          <Search size={16} />
          {loading ? 'Zoeken...' : 'Zoek'}
        </button>
      </div>

      {result && (
        <div className="p-4 bg-white rounded border">
          <h3 className="font-bold">{result.title}</h3>
          <p className="text-sm text-muted">{result.brand}</p>
          <p className="text-sm mt-2">{result.description}</p>
          {result.images[0] && (
            <img src={result.images[0]} alt="Product" className="w-32 h-32 object-cover mt-2 rounded" />
          )}
          <button
            onClick={() => onSelect(result)}
            className="mt-3 px-4 py-2 bg-green-600 text-secondary rounded hover:bg-green-700"
          >
            Gebruik dit product
          </button>
        </div>
      )}
    </div>
  );
}