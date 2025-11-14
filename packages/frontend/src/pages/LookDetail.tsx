// packages/frontend/src/pages/LookDetail.tsx
'use client';

import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

export default function LookDetail() {
  const { id } = useParams();
  const { data: look } = useQuery({
    queryKey: ['look', id],
    queryFn: () => fetch(`/api/looks/${id}`).then(r => r.json())
  });

  if (!look) return <p>Loading...</p>;

  return (
    <div className="container mx-auto p-6">
      <img src={look.images[0]} className="w-full h-96 object-cover rounded mb-6" />
      <h1 className="text-3xl font-bold">{look.title}</h1>
      <div className="grid grid-cols-4 gap-4 mt-6">
        {look.products.map((p: any) => (
          <div key={p._id} className="border p-4 rounded">
            <img src={p.images[0]} className="w-full h-40 object-cover" />
            <h3 className="font-bold text-sm mt-2">{p.title}</h3>
            <p className="text-gray-600">€{p.price}</p>
            <button className="mt-2 w-full bg-black text-white py-1 text-sm">
              Add to Cart
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}