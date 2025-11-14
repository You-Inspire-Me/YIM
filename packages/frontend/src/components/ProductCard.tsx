import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';

import { useCart } from '../context/CartContext';
import { Product } from '../types';
import LikeButton from './LikeButton';
import Button from './ui/Button';

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps): JSX.Element => {
  const { addItem } = useCart();

  const handleAddToCart = (): void => {
    addItem({
      productId: product._id,
      title: product.title,
      price: product.price,
      image: product.images[0],
      quantity: 1
    });
  };

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-border dark:bg-primary">
      <Link to={`/products/${product._id}`} className="relative block aspect-[4/5] overflow-hidden">
        <img
          src={product.images[0]}
          alt={product.title}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute top-3 right-3 opacity-0 transition-opacity group-hover:opacity-100">
          <LikeButton type="Product" id={product._id} size="sm" />
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <Link
            to={`/products/${product._id}`}
            className="text-lg font-semibold text-black transition hover:text-primary dark:text-secondary"
          >
            {product.title}
          </Link>
          <p className="mt-1 text-sm text-muted dark:text-muted line-clamp-2">{product.description}</p>
        </div>
        <div className="mt-auto flex items-center justify-between">
          <span className="text-lg font-semibold text-primary">€ {product.price.toFixed(2)}</span>
          <Button size="sm" onClick={handleAddToCart} aria-label={`Voeg ${product.title} toe aan winkelwagen`}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Voeg toe
          </Button>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
