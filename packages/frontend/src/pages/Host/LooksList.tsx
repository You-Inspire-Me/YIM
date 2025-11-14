// packages/frontend/src/pages/host/LooksList.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

export default function LooksList() {
  const { data: looks = [] } = useQuery({
    queryKey: ['looks'],
    queryFn: () => fetch('/api/looks').then(r => r.json())
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Mijn Looks</h1>
      {looks.length === 0 ? (
        <p>Geen looks. <Link to="/host/look-editor" className="text-blue-600">Maak er een</Link></p>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {looks.map((look: any) => (
            <Link key={look._id} to={`/looks/${look._id}`} className="block">
              <img src={look.images[0]} className="w-full h-48 object-cover" />
              <h3 className="font-bold">{look.title}</h3>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}