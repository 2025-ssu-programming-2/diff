import * as React from 'react';
import { P } from '@/components/shadcn/typography.tsx';
import PageLayout from '@/components/layouts/page-layout.tsx';
import Upload from '@/components/upload.tsx';
import Wrapper from '@/components/wrapper';
import { useState } from 'react';
import type { Nullish } from '@/types/common.ts';
import { Button } from '@/components/shadcn/button.tsx';
import { Loader } from 'lucide-react';
import { parseDiffOutput, type DiffPair } from '@/utils/diff';
import DiffContainer from '@/components/diff-container';

export type IndexPageProps = Omit<React.ComponentProps<'div'>, 'children'> & {};

export default function IndexPage({ className, ...props }: IndexPageProps) {
  const [files, setFiles] = useState<Nullish<File[]>>(null);
  const [diffView, setDiffView] = useState<Nullish<DiffPair[]>>(null);
  const [loading, setLoading] = useState(false);

  const handleCompare = async () => {
    if (!files || files.length < 2) {
      console.error('2개의 파일이 필요합니다');
      return;
    }

    try {
      setLoading(true);

      // 파일 읽기
      const baseText = await files[0].text();
      const changedText = await files[1].text();

      // 문자열을 WASM 메모리에 할당
      const baseTextPtr = Module.allocateUTF8(baseText);
      const changedTextPtr = Module.allocateUTF8(changedText);

      if (!baseTextPtr || !changedTextPtr) {
        console.error('메모리 할당 실패');
        setLoading(false);
        return;
      }

      // _diff_text 호출 (반환값은 포인터)
      const resultPtr = Module._diff_text(baseTextPtr, changedTextPtr);

      if (resultPtr) {
        // 반환된 포인터를 문자열로 변환
        const result = Module.UTF8ToString(resultPtr);
        console.log('diff 결과 문자열:', result);
        if (result) {
          const diffData = parseDiffOutput(result);
          console.log('파싱된 diffData:', diffData);
          setDiffView(diffData);
        } else {
          console.log('UTF8ToString 실패');
          setDiffView(null);
        }
      } else {
        console.log('diff_text 반환한 포인터가 유효하지 않습니다');
        setDiffView(null);
      }

      // 할당한 메모리 해제
      if (baseTextPtr) Module._free(baseTextPtr);
      if (changedTextPtr) Module._free(changedTextPtr);
    } catch (e) {
      console.error('호출 실패:', e);
      setDiffView(null);
    } finally {
      setLoading(false);
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
      <div className="flex w-full flex-col gap-4">
        <div className="w-full">
          <Upload files={files} onChange={setFiles} />
          {files && (
            <Button variant="outline" className="h-[46px] w-full" onClick={handleCompare} disabled={loading}>
              {loading ? <Loader className="animate-spin" /> : '비교 시작!'}
            </Button>
          )}
        </div>

        <DiffContainer loading={loading}>
          {diffView && diffView.length > 0 && (
            <Wrapper title="검출 결과">
              <div className="w-full py-4">
                <div className="overflow-hidden rounded-lg border border-slate-300 font-mono text-sm shadow-sm">
                  {/* 헤더 행: Line | Before | After */}
                  <div className="flex border-b-2 border-slate-300 bg-slate-100 font-semibold">
                    <div className="flex w-16 flex-shrink-0 flex-col justify-center border-r border-slate-300 bg-slate-50 px-2 py-2 text-xs text-slate-600">
                      Line
                    </div>
                    <div className="flex-1 border-r border-slate-300 px-4 py-2 text-slate-700">Base</div>
                    <div className="flex-1 px-4 py-2 text-slate-700">Compare</div>
                  </div>

                  {/* 데이터 행들: 각 pair마다 한 행 */}
                  {diffView.map((pair, idx) => {
                    const beforeLine = pair.before;
                    const afterLine = pair.after;

                    // 스타일 결정
                    const beforeBgColor =
                      pair.type === 'delete' ? 'bg-red-50' : pair.type === 'change' ? 'bg-yellow-50' : 'bg-white';
                    const beforeTextColor =
                      pair.type === 'delete'
                        ? 'text-red-900'
                        : pair.type === 'change'
                          ? 'text-yellow-900'
                          : 'text-slate-700';

                    const afterBgColor =
                      pair.type === 'add' ? 'bg-green-50' : pair.type === 'change' ? 'bg-yellow-50' : 'bg-white';
                    const afterTextColor =
                      pair.type === 'add'
                        ? 'text-green-900'
                        : pair.type === 'change'
                          ? 'text-yellow-900'
                          : 'text-slate-700';

                    // After 기준으로 라인 번호 결정 (After가 없으면 빈칸)
                    let displayLineNum = '';
                    if (afterLine && afterLine.lineNum !== null) {
                      displayLineNum = String(afterLine.lineNum + 1);
                    }

                    return (
                      <div key={`row-${idx}`} className="flex border-b border-slate-200 last:border-b-0">
                        {/* 라인 번호 열 */}
                        <div className="w-16 flex-shrink-0 border-r border-slate-200 bg-slate-50 px-2 py-2 text-right text-xs text-slate-400 select-none">
                          {displayLineNum}
                        </div>

                        {/* Before 열 */}
                        <div
                          className={`flex-1 border-r border-slate-200 p-2 ${beforeBgColor} hover:bg-opacity-80 overflow-auto break-words whitespace-pre-wrap transition-colors`}
                        >
                          <pre className={`m-0 ${beforeTextColor}`}>{beforeLine?.content || ''}</pre>
                        </div>

                        {/* After 열 */}
                        <div
                          className={`flex-1 p-2 ${afterBgColor} hover:bg-opacity-80 overflow-auto break-words whitespace-pre-wrap transition-colors`}
                        >
                          <pre className={`m-0 ${afterTextColor}`}>{afterLine?.content || ''}</pre>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Wrapper>
          )}
        </DiffContainer>
      </div>
    </PageLayout>
  );
}
