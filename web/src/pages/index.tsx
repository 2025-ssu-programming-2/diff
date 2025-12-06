import * as React from 'react';
import { P } from '@/components/shadcn/typography.tsx';
import PageLayout from '@/components/layouts/page-layout.tsx';
import Upload from '@/components/upload.tsx';
import Wrapper from '@/components/wrapper';
import { useState, useCallback, useMemo, useEffect } from 'react';
import type { Nullish } from '@/types/common.ts';
import { Button } from '@/components/shadcn/button.tsx';
import { Loader, ChevronDown, ChevronUp } from 'lucide-react';
import { parseDiffOutput, type DiffPair, type DiffLine } from '@/utils/diff';
import DiffContainer from '@/components/diff-container';
import { Label } from '@/components/shadcn/label';
import { RadioGroup, RadioGroupItem } from '@/components/shadcn/radio-group';
import { streamDiffJs, streamDiffWasm, type ProgressCallback } from '@/utils/stream-diff';

// 변경사항 앞뒤로 보여줄 컨텍스트 줄 수
const CONTEXT_LINES = 3;
// 숨길 최소 줄 수 (이보다 적으면 그냥 표시)
const MIN_HIDDEN_LINES = 5;
// 한 번에 렌더링할 최대 라인 수
const MAX_VISIBLE_LINES = 500;
// 더 보기 시 추가할 라인 수
const LOAD_MORE_LINES = 300;

// Hunk 타입: 변경사항 그룹 또는 숨겨진 컨텍스트
type DiffHunk = {
  id: string;
  type: 'changes' | 'hidden';
  startIndex: number;
  endIndex: number;
  lines: DiffPair[];
};

// 숨겨진 라인들의 펼침 상태
type ExpandedState = Record<string, boolean>;

export type IndexPageProps = Omit<React.ComponentProps<'div'>, 'children'> & {};

export default function IndexPage({ className, ...props }: IndexPageProps) {
  const [files, setFiles] = useState<Nullish<File[]>>(null);
  const [diffView, setDiffView] = useState<Nullish<DiffPair[]>>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'cpp' | 'js'>('cpp');
  const [execTime, setExecTime] = useState<number | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number; percentage: number } | null>(null);
  const [expandedHunks, setExpandedHunks] = useState<ExpandedState>({});
  const [maxVisibleLines, setMaxVisibleLines] = useState(MAX_VISIBLE_LINES);

  // 진행 상황 콜백
  const onProgress: ProgressCallback = useCallback((progressInfo) => {
    setProgress(progressInfo);
  }, []);

  // diffView를 Hunk로 분할 (변경사항 + 컨텍스트 기반)
  const hunks = useMemo((): DiffHunk[] => {
    if (!diffView || diffView.length === 0) return [];

    const result: DiffHunk[] = [];
    let i = 0;

    while (i < diffView.length) {
      const current = diffView[i];

      // 변경사항 찾기 (change, add, delete)
      if (current.type !== 'same') {
        // 변경 시작점 찾기 (앞쪽 컨텍스트 포함)
        const contextStart = Math.max(0, i - CONTEXT_LINES);

        // 이전 hunk와 겹치는지 확인
        if (result.length > 0) {
          const lastHunk = result[result.length - 1];
          if (lastHunk.type === 'hidden' && lastHunk.endIndex >= contextStart) {
            // 숨겨진 영역이 컨텍스트와 겹치면 숨겨진 영역 축소 또는 제거
            if (lastHunk.startIndex >= contextStart) {
              // 완전히 겹침 - 숨겨진 hunk 제거
              result.pop();
            } else {
              // 부분적으로 겹침 - 숨겨진 영역 축소
              lastHunk.endIndex = contextStart - 1;
              lastHunk.lines = diffView.slice(lastHunk.startIndex, lastHunk.endIndex + 1);
              if (lastHunk.lines.length < MIN_HIDDEN_LINES) {
                // 너무 적으면 그냥 제거하고 changes에 포함
                result.pop();
              }
            }
          }
        }

        // 연속된 변경사항 찾기
        let changeEnd = i;
        while (changeEnd < diffView.length && diffView[changeEnd].type !== 'same') {
          changeEnd++;
        }

        // 뒤쪽 컨텍스트 포함
        const contextEnd = Math.min(diffView.length - 1, changeEnd + CONTEXT_LINES - 1);

        // 실제 시작점 결정 (이전 hunk 이후부터)
        let actualStart = contextStart;
        if (result.length > 0) {
          const lastHunk = result[result.length - 1];
          actualStart = Math.max(contextStart, lastHunk.endIndex + 1);
        }

        result.push({
          id: `changes-${actualStart}`,
          type: 'changes',
          startIndex: actualStart,
          endIndex: contextEnd,
          lines: diffView.slice(actualStart, contextEnd + 1),
        });

        i = contextEnd + 1;
      } else {
        // 같은 줄들의 시작
        const sameStart = i;
        while (i < diffView.length && diffView[i].type === 'same') {
          i++;
        }
        const sameEnd = i - 1;

        // 이전 hunk의 끝 이후부터 시작
        let actualStart = sameStart;
        if (result.length > 0) {
          const lastHunk = result[result.length - 1];
          actualStart = Math.max(sameStart, lastHunk.endIndex + 1);
        }

        if (actualStart <= sameEnd) {
          const lineCount = sameEnd - actualStart + 1;
          if (lineCount >= MIN_HIDDEN_LINES) {
            // 숨김 처리
            result.push({
              id: `hidden-${actualStart}`,
              type: 'hidden',
              startIndex: actualStart,
              endIndex: sameEnd,
              lines: diffView.slice(actualStart, sameEnd + 1),
            });
          } else {
            // 너무 적으면 그냥 표시 (이전 changes에 합침 또는 새 changes 생성)
            if (result.length > 0 && result[result.length - 1].type === 'changes') {
              const lastHunk = result[result.length - 1];
              lastHunk.endIndex = sameEnd;
              lastHunk.lines = diffView.slice(lastHunk.startIndex, sameEnd + 1);
            } else {
              result.push({
                id: `changes-${actualStart}`,
                type: 'changes',
                startIndex: actualStart,
                endIndex: sameEnd,
                lines: diffView.slice(actualStart, sameEnd + 1),
              });
            }
          }
        }
      }
    }

    return result;
  }, [diffView]);

  // 변경사항 통계
  const changeStats = useMemo(() => {
    if (!diffView) return { added: 0, deleted: 0, changed: 0 };
    return diffView.reduce(
      (acc, pair) => {
        if (pair.type === 'add') acc.added++;
        else if (pair.type === 'delete') acc.deleted++;
        else if (pair.type === 'change') acc.changed++;
        return acc;
      },
      { added: 0, deleted: 0, changed: 0 },
    );
  }, [diffView]);

  // 표시할 Hunks와 라인 수 계산 (maxVisibleLines 제한)
  const { visibleHunks, totalVisibleLines, hasMoreLines, remainingLines } = useMemo(() => {
    if (hunks.length === 0) {
      return { visibleHunks: [], totalVisibleLines: 0, hasMoreLines: false, remainingLines: 0 };
    }

    const result: DiffHunk[] = [];
    let lineCount = 0;
    let i = 0;

    while (i < hunks.length && lineCount < maxVisibleLines) {
      const hunk = hunks[i];
      const hunkLineCount = hunk.lines.length;

      if (lineCount + hunkLineCount <= maxVisibleLines) {
        // 전체 hunk 포함
        result.push(hunk);
        lineCount += hunkLineCount;
      } else {
        // 부분적으로 포함 (hunk를 자르기)
        const remainingCapacity = maxVisibleLines - lineCount;
        if (remainingCapacity > 0) {
          result.push({
            ...hunk,
            id: `${hunk.id}-partial`,
            endIndex: hunk.startIndex + remainingCapacity - 1,
            lines: hunk.lines.slice(0, remainingCapacity),
          });
          lineCount += remainingCapacity;
        }
        break;
      }
      i++;
    }

    // 전체 라인 수 계산
    const totalLines = hunks.reduce((sum, h) => sum + h.lines.length, 0);
    const remaining = totalLines - lineCount;

    return {
      visibleHunks: result,
      totalVisibleLines: lineCount,
      hasMoreLines: remaining > 0,
      remainingLines: remaining,
    };
  }, [hunks, maxVisibleLines]);

  // 더 보기 핸들러
  const handleLoadMore = useCallback(() => {
    setMaxVisibleLines((prev) => prev + LOAD_MORE_LINES);
  }, []);

  // Hunk 펼치기/접기
  const toggleHunk = useCallback((hunkId: string) => {
    setExpandedHunks((prev) => ({
      ...prev,
      [hunkId]: !prev[hunkId],
    }));
  }, []);

  // 모두 펼치기
  const expandAll = useCallback(() => {
    const allExpanded: ExpandedState = {};
    hunks.forEach((hunk) => {
      if (hunk.type === 'hidden') {
        allExpanded[hunk.id] = true;
      }
    });
    setExpandedHunks(allExpanded);
  }, [hunks]);

  // 모두 접기
  const collapseAll = useCallback(() => {
    setExpandedHunks({});
  }, []);

  // diffView가 변경되면 상태 초기화
  useEffect(() => {
    if (diffView) {
      setExpandedHunks({});
      setMaxVisibleLines(MAX_VISIBLE_LINES);
    }
  }, [diffView]);

  const handleCompare = async () => {
    if (!files || files.length < 2) {
      console.error('2개의 파일이 필요합니다');
      return;
    }

    try {
      setLoading(true);
      setExecTime(null);
      setProgress(null);

      // 파일 읽기
      const baseText = await files[0].text();
      const changedText = await files[1].text();

      console.log(
        `파일 크기: Base=${(baseText.length / 1024).toFixed(2)}KB, Compare=${(changedText.length / 1024).toFixed(2)}KB`,
      );

      const startTime = performance.now();

      // 스트리밍 처리를 사용한 diff 연산
      const result =
        mode === 'cpp'
          ? await streamDiffWasm({ baseText, compareText: changedText, onProgress })
          : await streamDiffJs(baseText, changedText, onProgress);

      const endTime = performance.now();
      setExecTime((endTime - startTime) / 1000);

      if (result) {
        const diffData = parseDiffOutput(result);
        console.log('파싱된 diffData:', diffData);
        setDiffView(diffData);
      } else {
        setDiffView(null);
      }
    } catch (e) {
      console.error('호출 실패:', e);
      setDiffView(null);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const handleModeChange = (val: 'cpp' | 'js') => {
    setMode(val);
    setFiles(null);
    setDiffView(null);
    setExecTime(null);
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
          <RadioGroup
            value={mode}
            onValueChange={(val) => handleModeChange(val as 'cpp' | 'js')}
            className="mb-4 flex justify-start gap-4"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="cpp" id="mode-cpp" />
              <Label htmlFor="mode-cpp" className="cursor-pointer font-medium text-slate-700">
                C++로 비교하기
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="js" id="mode-js" />
              <Label htmlFor="mode-js" className="cursor-pointer font-medium text-slate-700">
                JS로 비교하기
              </Label>
            </div>
          </RadioGroup>
          <Upload files={files} onChange={setFiles} />
          {files && (
            <Button variant="outline" className="h-[46px] w-full" onClick={handleCompare} disabled={loading}>
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader className="animate-spin" />
                  {progress ? (
                    <span className="text-sm">
                      청크 처리 중... {progress.current}/{progress.total} ({progress.percentage}%)
                    </span>
                  ) : (
                    <span className="text-sm">준비 중...</span>
                  )}
                </div>
              ) : (
                '비교 시작!'
              )}
            </Button>
          )}
        </div>

        <DiffContainer loading={loading}>
          {diffView && diffView.length > 0 && (
            <Wrapper
              title={
                execTime !== null
                  ? `검출 결과 (${mode === 'cpp' ? 'C++' : 'JS'}: ${execTime.toFixed(3)}초 수행함)`
                  : '검출 결과'
              }
            >
              <div className="w-full py-4">
                {/* 변경사항 통계 */}
                <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
                  <span className="text-slate-600">
                    {totalVisibleLines.toLocaleString()} / {diffView.length.toLocaleString()}행 표시 중:
                  </span>
                  {changeStats.added > 0 && (
                    <span className="rounded bg-green-100 px-2 py-0.5 text-green-700">
                      +{changeStats.added.toLocaleString()} 추가
                    </span>
                  )}
                  {changeStats.deleted > 0 && (
                    <span className="rounded bg-red-100 px-2 py-0.5 text-red-700">
                      -{changeStats.deleted.toLocaleString()} 삭제
                    </span>
                  )}
                  {changeStats.changed > 0 && (
                    <span className="rounded bg-yellow-100 px-2 py-0.5 text-yellow-700">
                      ~{changeStats.changed.toLocaleString()} 수정
                    </span>
                  )}
                  <div className="ml-auto flex gap-2">
                    <Button variant="ghost" size="sm" onClick={expandAll} className="text-xs">
                      모두 펼치기
                    </Button>
                    <Button variant="ghost" size="sm" onClick={collapseAll} className="text-xs">
                      모두 접기
                    </Button>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-slate-300 font-mono text-sm shadow-sm">
                  {/* 헤더 행: Line | Before | After */}
                  <div className="flex border-b-2 border-slate-300 bg-slate-100 font-semibold">
                    <div className="flex w-16 shrink-0 flex-col justify-center border-r border-slate-300 bg-slate-50 px-2 py-2 text-xs text-slate-600">
                      Line
                    </div>
                    <div className="flex-1 border-r border-slate-300 px-4 py-2 text-slate-700">Base</div>
                    <div className="flex-1 px-4 py-2 text-slate-700">Compare</div>
                  </div>

                  {/* Hunk 기반 렌더링 (maxVisibleLines 제한) */}
                  {visibleHunks.map((hunk) => {
                    // 숨겨진 영역
                    if (hunk.type === 'hidden') {
                      const isExpanded = expandedHunks[hunk.id];
                      const hiddenCount = hunk.lines.length;

                      if (isExpanded) {
                        // 펼쳐진 상태: 라인들 표시 + 접기 버튼
                        return (
                          <div key={hunk.id}>
                            <button
                              onClick={() => toggleHunk(hunk.id)}
                              className="flex w-full items-center justify-center gap-2 border-b border-slate-200 bg-slate-50 py-1 text-xs text-slate-500 hover:bg-slate-100"
                            >
                              <ChevronUp className="h-3 w-3" />
                              {hiddenCount.toLocaleString()}줄 접기
                            </button>
                            {hunk.lines.map((pair, idx) => (
                              <DiffRow key={`${hunk.id}-${idx}`} pair={pair} />
                            ))}
                          </div>
                        );
                      }

                      // 접힌 상태: 펼치기 버튼
                      return (
                        <button
                          key={hunk.id}
                          onClick={() => toggleHunk(hunk.id)}
                          className="flex w-full items-center justify-center gap-2 border-b border-slate-200 bg-blue-50 py-2 text-xs text-blue-600 hover:bg-blue-100"
                        >
                          <ChevronDown className="h-3 w-3" />
                          {hiddenCount.toLocaleString()}줄 숨겨짐 - 클릭하여 펼치기
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      );
                    }

                    // 변경사항 영역
                    return (
                      <div key={hunk.id}>
                        {hunk.lines.map((pair, idx) => (
                          <DiffRow key={`${hunk.id}-${idx}`} pair={pair} />
                        ))}
                      </div>
                    );
                  })}
                </div>

                {/* 더 보기 버튼 */}
                {hasMoreLines && (
                  <div className="mt-4 flex justify-center">
                    <Button variant="outline" onClick={handleLoadMore} className="flex items-center gap-2">
                      <ChevronDown className="h-4 w-4" />
                      {remainingLines.toLocaleString()}줄 더 보기
                    </Button>
                  </div>
                )}

                {/* 모두 표시됨 */}
                {!hasMoreLines && diffView.length > MAX_VISIBLE_LINES && (
                  <div className="mt-4 text-center text-sm text-slate-500">
                    ✓ 모든 {diffView.length.toLocaleString()}행을 표시했습니다
                  </div>
                )}
              </div>
            </Wrapper>
          )}
        </DiffContainer>
      </div>
    </PageLayout>
  );
}

// 개별 Diff 행 컴포넌트 (성능 최적화)
const DiffRow = React.memo(function DiffRow({ pair }: { pair: DiffPair }) {
  const beforeLine = pair.before;
  const afterLine = pair.after;

  // 토큰 기반 렌더링 함수
  const renderWithTokens = (line: DiffLine | null, isLeft: boolean) => {
    if (!line) return '';

    // tokens이 있으면 토큰 기반으로 렌더링
    if (line.tokens && line.tokens.length > 0) {
      const elements: React.ReactNode[] = [];
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

        if (element) {
          const wordPos = contentStr.indexOf(wordContent, contentIdx);
          if (wordPos >= 0 && wordPos > contentIdx) {
            elements.push(contentStr.substring(contentIdx, wordPos));
            contentIdx = wordPos + wordContent.length;
          }
          elements.push(element);
          contentIdx = Math.max(contentIdx, wordPos + wordContent.length);
        }
      });

      if (contentIdx < contentStr.length) {
        elements.push(contentStr.substring(contentIdx));
      }

      return <>{elements}</>;
    }

    return line.content;
  };

  // 스타일 결정
  const beforeBgColor = pair.type === 'delete' ? 'bg-red-50' : pair.type === 'change' ? 'bg-yellow-50' : 'bg-white';
  const beforeTextColor =
    pair.type === 'delete' ? 'text-red-900' : pair.type === 'change' ? 'text-yellow-900' : 'text-slate-700';

  const afterBgColor = pair.type === 'add' ? 'bg-green-50' : pair.type === 'change' ? 'bg-yellow-50' : 'bg-white';
  const afterTextColor =
    pair.type === 'add' ? 'text-green-900' : pair.type === 'change' ? 'text-yellow-900' : 'text-slate-700';

  // 라인 번호
  let displayLineNum = '';
  if (afterLine && afterLine.lineNum !== null) {
    displayLineNum = String(afterLine.lineNum + 1);
  }

  return (
    <div className="flex border-b border-slate-200 last:border-b-0">
      {/* 라인 번호 열 */}
      <div className="w-16 shrink-0 border-r border-slate-200 bg-slate-50 px-2 py-1 text-right text-xs text-slate-400 select-none">
        {displayLineNum}
      </div>

      {/* Base 열 */}
      <div
        className={`flex-1 border-r border-slate-200 px-2 py-1 ${beforeBgColor} overflow-auto wrap-break-word whitespace-pre-wrap`}
      >
        <pre className={`m-0 ${beforeTextColor}`}>{beforeLine ? renderWithTokens(beforeLine, true) : ''}</pre>
      </div>

      {/* Compare 열 */}
      <div className={`flex-1 px-2 py-1 ${afterBgColor} overflow-auto wrap-break-word whitespace-pre-wrap`}>
        <pre className={`m-0 ${afterTextColor}`}>{afterLine ? renderWithTokens(afterLine, false) : ''}</pre>
      </div>
    </div>
  );
});
