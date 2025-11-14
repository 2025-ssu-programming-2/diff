import * as React from 'react';
import { cn } from '@/utils/shadcn.ts';

export type BaseLayoutProps = React.ComponentProps<'div'> & {};

export default function BaseLayout({ children, className, ...props }: BaseLayoutProps) {
  return (
    <div className={cn('mx-auto w-full max-w-5xl', className)} {...props}>
      {children}
    </div>
  );
}
