import * as React from 'react';
import { H1, P } from '@/components/shadcn/typography.tsx';
import PageLayout from '@/components/layouts/page-layout.tsx';

export type IndexPageProps = Omit<React.ComponentProps<'div'>, 'children'> & {};

export default function IndexPage({ className, ...props }: IndexPageProps) {
  return (
    <PageLayout
      title={
        <div className="flex w-full flex-col items-center justify-center gap-4">
          <P className="text-[120px] leading-[95px] font-black italic">Diff</P>
          <P className="text-[30px] font-thin tracking-wider">텍스트 파일 차이 검출기</P>
        </div>
      }
      className={className}
      {...props}
    >
      <H1>Hello!</H1>
    </PageLayout>
  );
}
