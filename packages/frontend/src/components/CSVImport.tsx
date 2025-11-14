'use client';

import { useState } from 'react';
import Papa from 'papaparse';

export default function CSVImport() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const upload = async () => {
    if (!file) return;
    setUploading(true);

    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        await fetch('/api/host/inventory/csv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: results.data })
        });
        setUploading(false);
        alert('Voorraad bijgewerkt!');
      }
    });
  };

  return (
    <div className="p-4 border rounded bg-accent">
      <input type="file" accept=".csv" onChange={handleFile} className="mb-2" />
      <button
        onClick={upload}
        disabled={!file || uploading}
        className="px-4 py-2 bg-blue-600 text-secondary rounded hover:bg-blue-700"
      >
        {uploading ? 'Uploaden...' : 'Importeer CSV'}
      </button>
    </div>
  );
}