import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
}

const Skeleton = ({ className }: SkeletonProps): JSX.Element => {
  return <div className={clsx('animate-pulse rounded-md bg-accent dark:bg-primary', className)} />;
};

export default Skeleton;
