import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/shadcn.ts';
import { Separator } from '@/components/shadcn/separator.tsx';

const wrapperVariants = cva('w-full');

export type WrapperProps = Omit<React.ComponentProps<'div'>, 'title'> &
  VariantProps<typeof wrapperVariants> & {
    title?: string | React.ReactNode;
  };

export default function Wrapper({ children, className, title, ...props }: WrapperProps) {
  return (
    <div className={cn(cn(wrapperVariants(), className))} {...props}>
      {title && (
        <>
          <div id="title-container" className="w-full">
            {typeof title === 'string' ? <span className="text-xl font-semibold">{title}</span> : title}
          </div>
          <Separator className="mt-2" />
        </>
      )}
      {children}
    </div>
  );
}
