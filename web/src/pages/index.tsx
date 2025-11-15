import * as React from 'react';
import { P } from '@/components/shadcn/typography.tsx';
import PageLayout from '@/components/layouts/page-layout.tsx';
import Upload from '@/components/upload.tsx';
import { useState } from 'react';
import type { Nullish } from '@/types/common.ts';
import { Button } from '@/components/shadcn/button.tsx';
import { compareDiff, type DiffItem, initWasm } from '@/utils/diff.ts';

export type IndexPageProps = Omit<React.ComponentProps<'div'>, 'children'> & {};

export default function IndexPage({ className, ...props }: IndexPageProps) {
  const [files, setFiles] = useState<Nullish<File[]>>(null);
  const [diffResult, setDiffResult] = useState<Nullish<DiffItem[]>>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Nullish<string>>(null);

  const handleCompare = async () => {
    if (!files || files.length !== 2) {
      setError('파일을 2개 선택해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // WASM 모듈 초기화
      await initWasm();

      // 파일 읽기
      const text1 = await files[0].text();
      const text2 = await files[1].text();

      // Diff 비교
      const result = await compareDiff(text1, text2);
      setDiffResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '비교 중 오류가 발생했습니다.');
      setDiffResult(null);
    } finally {
      setIsLoading(false);
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
        <Button
          variant="outline"
          className="h-[46px] w-full"
          onClick={handleCompare}
          disabled={isLoading}
        >
          {isLoading ? '비교 중...' : '비교 시작!'}
        </Button>
      )}
      {error && <div className="mt-4 p-4 bg-red-100 text-red-800 rounded">{error}</div>}
      {diffResult && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">비교 결과</h2>
          <div className="bg-gray-100 p-4 rounded max-h-96 overflow-y-auto font-mono text-sm">
            {diffResult.map((item, idx) => (
              <div
                key={idx}
                className={`py-1 ${
                  item.type === 'same'
                    ? 'text-gray-600'
                    : item.type === 'added'
                      ? 'bg-green-200 text-green-800'
                      : 'bg-red-200 text-red-800'
                }`}
              >
                {item.type === 'added' && '+ '}
                {item.type === 'deleted' && '- '}
                {item.content}
              </div>
            ))}
          </div>
        </div>
      )}
    </PageLayout>
  );
}
