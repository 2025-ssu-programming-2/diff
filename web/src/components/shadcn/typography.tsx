import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/shadcn.ts';

const headingVariants = cva('scroll-m-20 tracking-tight', {
  variants: {
    element: {
      h1: 'text-4xl font-extrabold text-balance',
      h2: 'text-3xl font-semibold',
      h3: 'text-2xl font-semibold',
      h4: 'text-xl font-semibold',
    },
  },
});

export type HeadingElements = Pick<React.JSX.IntrinsicElements, 'h1' | 'h2' | 'h3' | 'h4'>;
export type HeadingProps<Element extends keyof HeadingElements> = React.ComponentProps<Element> &
  VariantProps<typeof headingVariants> & {};

function H1({ children, className, ...props }: HeadingProps<'h1'>) {
  return (
    <h1 className={cn(headingVariants({ element: 'h1' }), className)} {...props}>
      {children}
    </h1>
  );
}

function H2({ children, className, ...props }: HeadingProps<'h2'>) {
  return (
    <h2 className={cn(headingVariants({ element: 'h2' }), className)} {...props}>
      {children}
    </h2>
  );
}

function H3({ children, className, ...props }: HeadingProps<'h3'>) {
  return (
    <h3 className={cn(headingVariants({ element: 'h3' }), className)} {...props}>
      {children}
    </h3>
  );
}

function H4({ children, className, ...props }: HeadingProps<'h4'>) {
  return (
    <h4 className={cn(headingVariants({ element: 'h4' }), className)} {...props}>
      {children}
    </h4>
  );
}

const paragraphVariants = cva('', {
  variants: {
    element: {
      p: 'leading-7',
      span: 'leading-7',
      blockquote: 'border-l-2 pl-6 italic',
      inlineCode: 'bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold',
      lead: 'text-muted-foreground text-xl',
      large: 'text-lg font-semibold',
      small: 'text-sm leading-none font-medium',
      muted: 'text-muted-foreground text-sm',
    },
  },
});

export type ParagraphElements = Pick<React.JSX.IntrinsicElements, 'p' | 'span' | 'blockquote' | 'code' | 'small'>;
export type ParagraphProps<Element extends keyof ParagraphElements> = React.ComponentProps<Element> &
  VariantProps<typeof paragraphVariants> & {};

function P({ children, className, ...props }: ParagraphProps<'p'>) {
  return (
    <p className={cn(paragraphVariants({ element: 'p' }), className)} {...props}>
      {children}
    </p>
  );
}

function Span({ children, className, ...props }: ParagraphProps<'span'>) {
  return (
    <span className={cn(paragraphVariants({ element: 'span' }), className)} {...props}>
      {children}
    </span>
  );
}

function Blockquote({ children, className, ...props }: ParagraphProps<'blockquote'>) {
  return (
    <blockquote className={cn(paragraphVariants({ element: 'blockquote' }), className)} {...props}>
      {children}
    </blockquote>
  );
}

function InlineCode({ children, className, ...props }: ParagraphProps<'code'>) {
  return (
    <code className={cn(paragraphVariants({ element: 'inlineCode' }), className)} {...props}>
      {children}
    </code>
  );
}

function Lead({ children, className, ...props }: ParagraphProps<'p'>) {
  return (
    <p className={cn(paragraphVariants({ element: 'lead' }), className)} {...props}>
      {children}
    </p>
  );
}

function Large({ children, className, ...props }: ParagraphProps<'span'>) {
  return (
    <span className={cn(paragraphVariants({ element: 'large' }), className)} {...props}>
      {children}
    </span>
  );
}

function Small({ children, className, ...props }: ParagraphProps<'small'>) {
  return (
    <small className={cn(paragraphVariants({ element: 'small' }), className)} {...props}>
      {children}
    </small>
  );
}

function Muted({ children, className, ...props }: ParagraphProps<'span'>) {
  return (
    <span className={cn(paragraphVariants({ element: 'muted' }), className)} {...props}>
      {children}
    </span>
  );
}

export { H1, H2, H3, H4, P, Span, Blockquote, InlineCode, Lead, Large, Small, Muted };
