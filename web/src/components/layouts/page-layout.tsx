import * as React from 'react';
import { cn } from '@/utils/shadcn.ts';
import BaseLayout from '@/components/layouts/base-layout.tsx';
import { Separator } from '@/components/shadcn/separator.tsx';

export type PageLayoutProps = Omit<React.ComponentProps<'div'>, 'title'> & {
  title?: string | React.ReactNode;
};

export default function PageLayout({ children, className, title, ...props }: PageLayoutProps) {
  return (
    <BaseLayout>
      <div className={cn('pt-10', className)} {...props}>
        {title && (
          <>
            <div id="title-container" className="w-full">
              {typeof title === 'string' ? <span className="text-6xl font-black">{title}</span> : title}
            </div>
            <Separator className="mt-4" />
          </>
        )}

        <div id="children-container" className="mt-6">
          {children}
        </div>
      </div>
    </BaseLayout>
  );
}
