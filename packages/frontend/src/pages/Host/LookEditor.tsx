// packages/frontend/src/pages/host/LookEditor.tsx
'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

export default function LookEditor() {
  const [title, setTitle] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: (data) => fetch('/api/looks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['looks'] });
      navigate('/host/looks');
    }
  });

  const handleSave = () => {
    mutation.mutate({ title, images, products, published: false });
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Nieuwe Look</h1>
      <input
        type="text"
        placeholder="Titel"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full p-2 border mb-4"
      />
      <button
        onClick={handleSave}
        className="bg-black text-white px-4 py-2"
      >
        Opslaan
      </button>
    </div>
  );
}