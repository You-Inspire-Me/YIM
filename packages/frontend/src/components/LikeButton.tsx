import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { useAuth } from '../context/AuthContext';
import { endpoints } from '../lib/api';

interface LikeButtonProps {
  type: 'Look' | 'Product' | 'Creator';
  id: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const LikeButton = ({ type, id, className = '', size = 'md' }: LikeButtonProps): JSX.Element => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isLiked, setIsLiked] = useState(false);

  // Check initial like status
  const { data: wishlistData } = useQuery({
    queryKey: ['user-wishlist'],
    queryFn: async () => {
      const response = await endpoints.user.wishlist.get();
      return response.data.items || [];
    },
    enabled: !!user
  });

  useEffect(() => {
    if (wishlistData) {
      const liked = wishlistData.some(
        (item: any) => item.type === type && item._id === id
      );
      setIsLiked(liked);
    }
  }, [wishlistData, type, id]);

  const likeMutation = useMutation({
    mutationFn: async () => {
      return endpoints.user.wishlist.toggle({ type, id });
    },
    onSuccess: (response) => {
      setIsLiked(response.data.isLiked);
      toast.success(
        response.data.isLiked
          ? 'Toegevoegd aan verlanglijst'
          : 'Verwijderd uit verlanglijst',
        { duration: 2000 }
      );
      void queryClient.invalidateQueries({ queryKey: ['user-wishlist'] });
    },
    onError: () => {
      toast.error('Kon niet liken');
    }
  });

  const handleClick = (e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error('Log in om items te bewaren');
      return;
    }
    likeMutation.mutate();
  };

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  if (!user) {
    return <></>;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`rounded-full p-2 transition-all hover:scale-110 ${
        isLiked
          ? 'bg-primary/10 text-primary'
          : 'bg-white/90 text-muted hover:bg-white hover:text-primary'
      } ${className}`}
      aria-label={isLiked ? 'Verwijder uit verlanglijst' : 'Voeg toe aan verlanglijst'}
    >
      <Heart
        className={`${sizeClasses[size]} ${isLiked ? 'fill-current' : ''}`}
      />
    </button>
  );
};

export default LikeButton;

