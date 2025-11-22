import * as React from 'react';
import { P } from '@/components/shadcn/typography.tsx';
import PageLayout from '@/components/layouts/page-layout.tsx';
import Upload from '@/components/upload.tsx';
import { useState } from 'react';
import type { Nullish } from '@/types/common.ts';
import { Button } from '@/components/shadcn/button.tsx';

declare const Module: {
  _diff_text?: (text1Ptr: number, text2Ptr: number) => number;
  UTF8ToString?: (ptr: number) => string;
  allocateUTF8?: (str: string) => number;
  _free?: (ptr: number) => void;
};

export type IndexPageProps = Omit<React.ComponentProps<'div'>, 'children'> & {};

export default function IndexPage({ className, ...props }: IndexPageProps) {
  const [files, setFiles] = useState<Nullish<File[]>>(null);

  const handleCompare = () => {
    try {
      const baseText = "Hello";
      const changedText = "World";

      // 문자열을 WASM 메모리에 할당
      const baseTextPtr = Module.allocateUTF8?.(baseText);
      const changedTextPtr = Module.allocateUTF8?.(changedText);

      if (!baseTextPtr || !changedTextPtr) {
        console.error('메모리 할당 실패');
        return;
      }

      // _diff_text 호출 (반환값은 포인터)
      const resultPtr = Module._diff_text?.(baseTextPtr, changedTextPtr);

      if (resultPtr) {
        // 반환된 포인터를 문자열로 변환
        const result = Module.UTF8ToString?.(resultPtr);
        console.log('diff_text 결과:');
        console.log(result);
      } else {
        console.log('diff_text 반환한 포인터가 유효하지 않습니다');
      }

      // 할당한 메모리 해제
      Module._free?.(baseTextPtr);
      Module._free?.(changedTextPtr);
    } catch (e) {
      console.error('호출 실패:', e);
    }
  };

  return (
    <PageLayout
      title={
        <div className="flex w-full flex-col justify-center">
          <div className="flex items-center gap-7 text-[120px] leading-[95px] font-black italic">
            Diff
            <img src="/assets/v.png" alt="high-voltage" className="w-20" />
          </div>
          <P className="text-[30px] font-thin tracking-wider">고속 텍스트 파일 차이 검출기</P>
        </div>
      }
      className={className}
      {...props}
    >
      <Upload files={files} onChange={setFiles} />
      {files && (
        <Button variant="outline" className="h-[46px] w-full" onClick={handleCompare}>
          비교 시작!
        </Button>
      )}
    </PageLayout>
  );
}
