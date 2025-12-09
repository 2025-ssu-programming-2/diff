import { cn } from '@/utils/shadcn';
import * as React from 'react';
import { Skeleton } from '@/components/shadcn/skeleton';

type DiffContainerProps = React.ComponentProps<'div'> & {
  loading: boolean;
};

export default function DiffContainer({ children, className, loading, ...props }: DiffContainerProps) {
  return (
    <div className={cn('flex h-36 w-full flex-col gap-4', className)} {...props}>
      {loading ? (
        <div className="flex w-full flex-col gap-4">
          <Skeleton className="h-[30px] w-[580px]" />
          <Skeleton className="h-[30px] w-[380px]" />
          <Skeleton className="h-[30px] w-[480px]" />
          <Skeleton className="h-[30px] w-[180px]" />
          <Skeleton className="h-[30px] w-[80px]" />
          <Skeleton className="h-[30px] w-[480px]" />
          <Skeleton className="h-[30px] w-[380px]" />
        </div>
      ) : (
        children
      )}
    </div>
  );
}
