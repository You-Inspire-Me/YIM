'use client';

import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

export default function LookDetail() {
  const { id } = useParams();
  const { data: look, isLoading } = useQuery({
    queryKey: ['public-look', id],
    queryFn: () => fetch(`/api/looks/${id}`).then(r => r.json()),
    enabled: !!id
  });

  if (isLoading) return <p className="p-6 text-center">Laden...</p>;
  if (!look) return <p className="p-6 text-center">Look niet gevonden</p>;

  return (
    <div className="container mx-auto p-6">
      <img
        src={look.images[0] || 'https://via.placeholder.com/400'}
        alt={look.title}
        className="w-full h-96 object-cover rounded-lg mb-6"
      />
      <h1 className="text-3xl font-bold mb-2">{look.title}</h1>
      <p className="text-gray-600 mb-6">{look.description}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {look.products?.map((p: any) => (
          <div key={p.productId} className="border rounded-lg p-4">
            <img src={p.image || 'https://via.placeholder.com/200'} className="w-full h-48 object-cover rounded" />
            <h3 className="font-semibold">{p.title}</h3>
            <p className="text-sm text-gray-600">€{p.price}</p>
            <button className="mt-2 w-full bg-black text-white py-2 rounded">
              In winkelwagen
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}