import * as React from 'react';
import { P } from '@/components/shadcn/typography.tsx';
import PageLayout from '@/components/layouts/page-layout.tsx';
import Upload from '@/components/upload.tsx';
import Wrapper from '@/components/wrapper';
import { useState } from 'react';
import type { Nullish } from '@/types/common.ts';
import { Button } from '@/components/shadcn/button.tsx';
import { Loader } from 'lucide-react';

declare const Module: {
  _diff_text?: (text1Ptr: number, text2Ptr: number) => number;
  UTF8ToString?: (ptr: number) => string;
  allocateUTF8?: (str: string) => number;
  _free?: (ptr: number) => void;
};

export type IndexPageProps = Omit<React.ComponentProps<'div'>, 'children'> & {};

type WordToken = {
  op: 'equal' | 'delete' | 'insert';
  left: string;
  right: string;
};

type WasmDiffItem = {
  op: 'equal' | 'delete' | 'insert' | 'replace';
  left: string;
  right: string;
  left_start: number;
  left_end: number;
  right_start: number;
  right_end: number;
  tokens: WordToken[];
};

type WasmDiffResponse = {
  rows: WasmDiffItem[];
};

type DiffLine = {
  type: 'same' | 'change' | 'add' | 'delete';
  content: string;
  lineNum: number | null;
  charStart?: number;
  charEnd?: number;
  tokens?: WordToken[];
};

type DiffPair = {
  type: 'same' | 'change' | 'add' | 'delete';
  before: DiffLine | null;
  after: DiffLine | null;
};

const parseDiffOutput = (diffOutput: string): DiffPair[] => {
  try {
    const data: WasmDiffResponse = JSON.parse(diffOutput);
    const pairs: DiffPair[] = [];
    let beforeLineNum = 0;
    let afterLineNum = 0;
    let i = 0;

    while (i < data.rows.length) {
      const item = data.rows[i];

      if (item.op === 'equal') {
        // Skip empty equal operations (e.g., final newline-only lines)
        if (item.left !== '' || item.right !== '') {
          pairs.push({
            type: 'same',
            before: {
              type: 'same',
              content: item.left,
              lineNum: beforeLineNum,
            },
            after: {
              type: 'same',
              content: item.right,
              lineNum: afterLineNum,
            },
          });
        }
        beforeLineNum++;
        afterLineNum++;
        i++;
      } else if (item.op === 'replace') {
        pairs.push({
          type: 'change',
          before: {
            type: 'change',
            content: item.left,
            lineNum: beforeLineNum,
            charStart: item.left_start >= 0 ? item.left_start : undefined,
            charEnd: item.left_end >= 0 ? item.left_end : undefined,
            tokens: item.tokens,
          },
          after: {
            type: 'change',
            content: item.right,
            lineNum: afterLineNum,
            charStart: item.right_start >= 0 ? item.right_start : undefined,
            charEnd: item.right_end >= 0 ? item.right_end : undefined,
            tokens: item.tokens,
          },
        });
        beforeLineNum++;
        afterLineNum++;
        i++;
      } else if (item.op === 'delete') {
        // delete 다음에 insert가 있으면 쌍으로 묶기
        if (i + 1 < data.rows.length && data.rows[i + 1].op === 'insert') {
          const nextItem = data.rows[i + 1];
          pairs.push({
            type: 'change',
            before: {
              type: 'change',
              content: item.left,
              lineNum: beforeLineNum,
            },
            after: {
              type: 'change',
              content: nextItem.right,
              lineNum: afterLineNum,
            },
          });
          beforeLineNum++;
          afterLineNum++;
          i += 2;
        } else {
          // delete만 있는 경우: after는 null (라인 번호를 표시하지 않음)
          pairs.push({
            type: 'delete',
            before: {
              type: 'delete',
              content: item.left,
              lineNum: beforeLineNum,
            },
            after: null,
          });
          beforeLineNum++;
          i++;
        }
      } else if (item.op === 'insert') {
        // insert만 있는 경우 (앞의 delete와 쌍을 이루지 않음)
        pairs.push({
          type: 'add',
          before: null,
          after: {
            type: 'add',
            content: item.right,
            lineNum: afterLineNum,
          },
        });
        afterLineNum++;
        i++;
      } else {
        // 나머지 op (empty lines 등): 무시
        i++;
      }
    }

    return pairs;
  } catch (e) {
    console.error('JSON 파싱 실패:', e);
    console.error('Raw output:', diffOutput);
    return [];
  }
};

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
      const baseTextPtr = Module.allocateUTF8?.(baseText);
      const changedTextPtr = Module.allocateUTF8?.(changedText);

      if (!baseTextPtr || !changedTextPtr) {
        console.error('메모리 할당 실패');
        setLoading(false);
        return;
      }

      // _diff_text 호출 (반환값은 포인터)
      const resultPtr = Module._diff_text?.(baseTextPtr, changedTextPtr);

      if (resultPtr) {
        // 반환된 포인터를 문자열로 변환
        const result = Module.UTF8ToString?.(resultPtr);
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
      if (baseTextPtr) Module._free?.(baseTextPtr);
      if (changedTextPtr) Module._free?.(changedTextPtr);
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

        {diffView && diffView.length > 0 && (
          <Wrapper title="검출 결과">
            <div className="w-full py-4">
              <div className="overflow-hidden rounded-lg border border-slate-300 font-mono text-sm shadow-sm">
                {/* 헤더 행: Line | Before | After */}
                <div className="flex border-b-2 border-slate-300 bg-slate-100 font-semibold">
                  <div className="flex w-16 flex-shrink-0 flex-col justify-center border-r border-slate-300 bg-slate-50 px-2 py-2 text-xs text-slate-600">
                    Line
                  </div>
                  <div className="flex-1 border-r border-slate-300 px-4 py-2 text-slate-700">Before</div>
                  <div className="flex-1 px-4 py-2 text-slate-700">After</div>
                </div>

                {/* 데이터 행들: 각 pair마다 한 행 */}
                {diffView.map((pair, idx) => {
                  const beforeLine = pair.before;
                  const afterLine = pair.after;

                  // 토큰 기반 렌더링 함수
                  const renderWithTokens = (line: DiffLine | null, isLeft: boolean) => {
                    if (!line) return '';

                    // tokens이 있으면 토큰 기반으로 렌더링
                    if (line.tokens && line.tokens.length > 0) {
                      const elements: (React.ReactNode)[] = [];
                      const contentStr = line.content;
                      let contentIdx = 0;

                      line.tokens.forEach((token, tokenIdx) => {
                        const isDeleted = isLeft && token.op === 'delete';
                        const isInserted = !isLeft && token.op === 'insert';
                        const isEqual = token.op === 'equal';

                        let wordContent = '';
                        let element: React.ReactNode = null;

                        if (isEqual) {
                          wordContent = token[isLeft ? 'left' : 'right'];
                          element = <span key={tokenIdx}>{wordContent}</span>;
                        } else if (isDeleted) {
                          wordContent = token.left;
                          element = (
                            <span key={tokenIdx} className="bg-red-300 font-semibold">
                              {wordContent}
                            </span>
                          );
                        } else if (isInserted) {
                          wordContent = token.right;
                          element = (
                            <span key={tokenIdx} className="bg-green-300 font-semibold">
                              {wordContent}
                            </span>
                          );
                        }
                        // token.op === 'delete' && !isLeft, 또는 token.op === 'insert' && isLeft: 표시 안함

                        if (element) {
                          // 원본 content에서 현재 단어를 찾아서 앞의 띄어쓰기 포함
                          const wordPos = contentStr.indexOf(wordContent, contentIdx);
                          if (wordPos >= 0 && wordPos > contentIdx) {
                            // 단어 앞에 있는 모든 문자(주로 스페이스) 추가
                            elements.push(contentStr.substring(contentIdx, wordPos));
                            contentIdx = wordPos + wordContent.length;
                          }
                          elements.push(element);
                          contentIdx = Math.max(contentIdx, wordPos + wordContent.length);
                        }
                      });

                      // 남은 부분 (단어 뒤의 띄어쓰기 등)
                      if (contentIdx < contentStr.length) {
                        elements.push(contentStr.substring(contentIdx));
                      }

                      return <>{elements}</>;
                    }

                    return line.content;
                  };

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
                        <pre className={`m-0 ${beforeTextColor}`}>
                          {beforeLine ? renderWithTokens(beforeLine, true) : ''}
                        </pre>
                      </div>

                      {/* After 열 */}
                      <div
                        className={`flex-1 p-2 ${afterBgColor} hover:bg-opacity-80 overflow-auto break-words whitespace-pre-wrap transition-colors`}
                      >
                        <pre className={`m-0 ${afterTextColor}`}>
                          {afterLine ? renderWithTokens(afterLine, false) : ''}
                        </pre>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Wrapper>
        )}
      </div>
    </PageLayout>
  );
}
