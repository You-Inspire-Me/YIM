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
  initialLiked?: boolean; // For Looks, pass initial liked state
  likesCount?: number; // For Looks, pass likes count
}

const LikeButton = ({ type, id, className = '', size = 'md', initialLiked, likesCount: initialLikesCount }: LikeButtonProps): JSX.Element => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isLiked, setIsLiked] = useState(initialLiked || false);
  const [likesCount, setLikesCount] = useState(initialLikesCount || 0);

  // Check initial like status for non-Look types
  const { data: wishlistData } = useQuery({
    queryKey: ['user-wishlist'],
    queryFn: async () => {
      const response = await endpoints.user.wishlist.get();
      return response.data.items || [];
    },
    enabled: !!user && type !== 'Look'
  });

  useEffect(() => {
    if (type === 'Look') {
      setIsLiked(initialLiked || false);
      setLikesCount(initialLikesCount || 0);
    } else if (wishlistData) {
      const liked = wishlistData.some(
        (item: any) => item.type === type && item._id === id
      );
      setIsLiked(liked);
    }
  }, [wishlistData, type, id, initialLiked, initialLikesCount]);

  const likeMutation = useMutation({
    mutationFn: async () => {
      // Use direct like endpoint for Looks, wishlist for others
      if (type === 'Look') {
        return endpoints.public.likeLook(id);
      }
      return endpoints.user.wishlist.toggle({ type, id });
    },
    onSuccess: (response) => {
      if (type === 'Look') {
        setIsLiked(response.data.liked);
        setLikesCount(response.data.likesCount || 0);
        // Invalidate look queries to update likes count
        void queryClient.invalidateQueries({ queryKey: ['public-look', id] });
        void queryClient.invalidateQueries({ queryKey: ['public-looks'] });
        void queryClient.invalidateQueries({ queryKey: ['host-looks'] });
        toast.success(
          response.data.liked
            ? 'Look geliked'
            : 'Like verwijderd',
          { duration: 2000 }
        );
      } else {
        setIsLiked(response.data.isLiked);
        toast.success(
          response.data.isLiked
            ? 'Toegevoegd aan verlanglijst'
            : 'Verwijderd uit verlanglijst',
          { duration: 2000 }
        );
        void queryClient.invalidateQueries({ queryKey: ['user-wishlist'] });
      }
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
      {type === 'Look' && likesCount > 0 && (
        <span className="ml-1 text-xs">{likesCount}</span>
      )}
    </button>
  );
};

export default LikeButton;

