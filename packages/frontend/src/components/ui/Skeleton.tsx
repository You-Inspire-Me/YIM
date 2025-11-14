import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
}

const Skeleton = ({ className }: SkeletonProps): JSX.Element => {
  return <div className={clsx('animate-pulse rounded-md bg-gray-200 dark:bg-gray-800', className)} />;
};

export default Skeleton;
