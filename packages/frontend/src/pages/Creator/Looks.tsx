import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import { endpoints } from '../../lib/api';

interface Look {
  _id: string;
  title: string;
  description: string;
  images: string[];
  products: Array<{
    productId: string;
    title: string;
    price: number;
    image: string;
  }>;
  tags: string[];
  published: boolean;
  createdAt: string;
}


const LooksPage = (): JSX.Element => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ looks: Look[] }>({
    queryKey: ['host-looks'],
    queryFn: async () => {
      const response = await endpoints.creator.looks.list();
      return response.data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => endpoints.creator.looks.delete(id),
    onSuccess: () => {
      toast.success('Look verwijderd');
      void queryClient.invalidateQueries({ queryKey: ['host-looks'] });
    },
    onError: () => {
      toast.error('Verwijderen mislukt');
    }
  });

  const togglePublishedMutation = useMutation({
    mutationFn: (id: string) => endpoints.creator.looks.togglePublished(id),
    onSuccess: (_, id) => {
      toast.success('Status bijgewerkt');
      void queryClient.invalidateQueries({ queryKey: ['host-looks'] });
    },
    onError: () => {
      toast.error('Status bijwerken mislukt');
    }
  });

  const handleDelete = (id: string): void => {
    if (window.confirm('Weet je zeker dat je deze look wilt verwijderen?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold">Looks</h1>
          <p className="mt-2 text-sm text-muted dark:text-muted">
            Beheer je styled outfits en shop the look collecties
          </p>
        </div>
        <Button onClick={() => navigate('/creator/looks/create')} className="inline-flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nieuwe Look
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-xl" />
          ))}
        </div>
      ) : data && data.looks.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data.looks.map((look) => (
            <div
              key={look._id}
              className="group relative overflow-hidden rounded-xl border border-border bg-white shadow-sm transition hover:shadow-lg dark:border-border dark:bg-primary cursor-pointer"
              onClick={() => navigate(`/creator/looks/edit/${look._id}`)}
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <img
src={look.images[0] || 'https://via.placeholder.com/300'}
                  alt={look.title}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
                {!look.published && (
                  <div className="absolute left-2 top-2 rounded-full bg-gray-900/70 px-2 py-1 text-xs font-semibold text-secondary">
                    Concept
                  </div>
                )}
                <div className="absolute right-2 top-2 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePublishedMutation.mutate(look._id);
                    }}
                    className="rounded-full bg-white/90 p-2 shadow-sm transition hover:bg-white dark:bg-primary/90 dark:hover:bg-primary/90"
                    aria-label={look.published ? 'Unpublish' : 'Publish'}
                  >
                    {look.published ? (
                      <EyeOff className="h-4 w-4 text-black dark:text-secondary" />
                    ) : (
                      <Eye className="h-4 w-4 text-black dark:text-secondary" />
                    )}
                  </button>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-black dark:text-secondary">{look.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted dark:text-muted">{look.description}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {look.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-accent px-2 py-0.5 text-xs text-muted dark:bg-primary dark:text-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-muted dark:text-muted">
                    {look.products.length} {look.products.length === 1 ? 'product' : 'producten'}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/creator/looks/edit/${look._id}`);
                      }}
                      className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition hover:bg-accent dark:border-border dark:hover:bg-primary/90"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(look._id);
                      }}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-white p-12 text-center dark:border-border dark:bg-primary">
          <p className="text-muted dark:text-muted">Je hebt nog geen looks aangemaakt.</p>
          <Button onClick={() => navigate('/creator/looks/create')} className="mt-4">
            Maak je eerste look
          </Button>
        </div>
      )}
    </div>
  );
};

export default LooksPage;

