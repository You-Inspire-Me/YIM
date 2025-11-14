import Skeleton from './ui/Skeleton';

const ProductCardSkeleton = (): JSX.Element => (
  <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white dark:border-border dark:bg-primary">
    <Skeleton className="aspect-[4/5] w-full" />
    <div className="flex flex-1 flex-col gap-3 p-5">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="mt-auto h-10 w-full" />
    </div>
  </div>
);

export default ProductCardSkeleton;
