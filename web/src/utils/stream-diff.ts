import type { WasmDiffResponse, WasmDiffItem } from './diff';
import { diffTextJs } from './algorithm';
import { PerformanceTracker, type PerformanceMetrics, type WasmOverheadTiming } from './performance';
import { processWasmChunkOptimized, getOptimizationStatus } from './wasm-optimized';

// 청크 설정: 라인 수 기준 (500줄씩 처리)
export const CHUNK_SIZE_LINES = 500;

/**
 * 텍스트를 줄 단위로 분리
 */
export function splitLines(text: string): string[] {
  if (!text) return [];

  const lines: string[] = [];
  let current = '';

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '\n') {
      lines.push(current);
      current = '';
    } else {
      current += c;
    }
  }
  lines.push(current);

  return lines;
}

/**
 * 줄 배열을 텍스트로 결합
 */
export function joinLines(lines: string[]): string {
  return lines.join('\n');
}

/**
 * 청크 정보 타입
 */
export interface ChunkInfo {
  index: number;
  startLine: number;
  endLine: number;
  baseLines: string[];
  compareLines: string[];
}

/**
 * 진행 상황 콜백 타입
 */
export type ProgressCallback = (progress: { current: number; total: number; percentage: number }) => void;

/**
 * 스트리밍 Diff 결과 타입 (성능 메트릭 포함)
 */
export interface StreamDiffResult {
  response: WasmDiffResponse;
  metrics: PerformanceMetrics;
}

/**
 * 파일을 청크로 분할
 */
export function splitIntoChunks(
  baseLines: string[],
  compareLines: string[],
  chunkSize: number = CHUNK_SIZE_LINES,
): ChunkInfo[] {
  const chunks: ChunkInfo[] = [];
  const maxLines = Math.max(baseLines.length, compareLines.length);

  for (let i = 0; i < maxLines; i += chunkSize) {
    const startLine = i;
    const endLine = Math.min(i + chunkSize, maxLines);

    chunks.push({
      index: chunks.length,
      startLine,
      endLine,
      baseLines: baseLines.slice(startLine, endLine),
      compareLines: compareLines.slice(startLine, endLine),
    });
  }

  return chunks;
}

/**
 * 이벤트 루프 양보 (UI 반응성 유지)
 */
function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

/**
 * JS 모드: 청크 단위 스트리밍 diff 처리 (성능 측정 포함)
 */
export async function streamDiffJs(
  baseText: string,
  compareText: string,
  onProgress?: ProgressCallback,
): Promise<StreamDiffResult> {
  const tracker = new PerformanceTracker('js');
  tracker.start();

  // 파일 크기 기록
  tracker.setFileSizes(new Blob([baseText]).size, new Blob([compareText]).size);

  // 청크 분할 시작
  tracker.startPhase('chunkSplit');
  const baseLines = splitLines(baseText);
  const compareLines = splitLines(compareText);

  // 작은 파일은 직접 처리
  if (baseLines.length <= CHUNK_SIZE_LINES && compareLines.length <= CHUNK_SIZE_LINES) {
    tracker.endPhase('chunkSplit');
    tracker.setChunkCount(1);

    if (onProgress) {
      onProgress({ current: 1, total: 1, percentage: 100 });
    }

    // Diff 연산 시작
    tracker.startPhase('diffProcess');
    const chunkStart = performance.now();
    const response = diffTextJs(baseText, compareText);
    const chunkDuration = performance.now() - chunkStart;
    tracker.recordChunkTime(0, chunkDuration);
    tracker.endPhase('diffProcess');

    const metrics = tracker.finalize();
    return { response, metrics };
  }

  const chunks = splitIntoChunks(baseLines, compareLines);
  tracker.endPhase('chunkSplit');
  tracker.setChunkCount(chunks.length);

  const allRows: WasmDiffItem[] = [];

  console.log(`[JS] 총 ${chunks.length}개 청크로 분할하여 처리 시작`);

  // Diff 연산 시작
  tracker.startPhase('diffProcess');

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    // 진행 상황 보고
    if (onProgress) {
      onProgress({
        current: i + 1,
        total: chunks.length,
        percentage: Math.round(((i + 1) / chunks.length) * 100),
      });
    }

    // 청크를 텍스트로 변환하고 diff 수행
    const chunkBaseText = joinLines(chunk.baseLines);
    const chunkCompareText = joinLines(chunk.compareLines);

    const chunkStart = performance.now();
    const result = diffTextJs(chunkBaseText, chunkCompareText);
    const chunkDuration = performance.now() - chunkStart;
    tracker.recordChunkTime(i, chunkDuration);

    // 결과 병합
    allRows.push(...result.rows);

    // UI 반응성을 위해 이벤트 루프 양보
    await yieldToMain();
  }

  tracker.endPhase('diffProcess');

  console.log(`[JS] 처리 완료: ${allRows.length}개 행`);

  const response = { rows: allRows };
  const metrics = tracker.finalize();

  return { response, metrics };
}

/**
 * WASM 모듈 사용 가능 여부 확인
 */
function isWasmModuleReady(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const module = (window as any).Module;
  return !!(module && module._diff_text && module.HEAPU8 && module._malloc && module._free);
}

/**
 * 최적화 모드 사용 가능 여부 확인
 */
function isOptimizedModeAvailable(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const module = (window as any).Module;
  return !!(module && module.HEAPU8 && module._malloc);
}

/**
 * WASM 모드: SharedArrayBuffer를 사용한 청크 단위 스트리밍 diff 처리
 */
export interface WasmStreamDiffOptions {
  baseText: string;
  compareText: string;
  onProgress?: ProgressCallback;
}

/**
 * WASM 청크 처리 결과 (타이밍 정보 포함)
 */
interface WasmChunkResult {
  response: WasmDiffResponse;
  pureAlgorithmTime: number; // 순수 C++ 알고리즘 실행 시간
  overhead: WasmOverheadTiming; // WASM 오버헤드
}

/**
 * WASM 단일 청크 처리 (타임아웃 포함, 세부 타이밍 측정)
 */
function processWasmChunk(baseText: string, compareText: string, timeoutMs: number = 30000): Promise<WasmChunkResult> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('WASM 청크 처리 타임아웃'));
    }, timeoutMs);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const module = (window as any).Module;

      if (!module) {
        clearTimeout(timeoutId);
        reject(new Error('WASM Module not loaded'));
        return;
      }

      // 1. 메모리 할당 시간 측정
      const memAllocStart = performance.now();
      const baseTextPtr = module.allocateUTF8(baseText);
      const changedTextPtr = module.allocateUTF8(compareText);
      const memAllocTime = performance.now() - memAllocStart;

      if (!baseTextPtr || !changedTextPtr) {
        clearTimeout(timeoutId);
        if (baseTextPtr) module._free(baseTextPtr);
        if (changedTextPtr) module._free(changedTextPtr);
        reject(new Error('메모리 할당 실패'));
        return;
      }

      try {
        // 2. 순수 C++ 알고리즘 실행 시간 측정
        const algorithmStart = performance.now();
        const resultPtr = module._diff_text(baseTextPtr, changedTextPtr);
        const pureAlgorithmTime = performance.now() - algorithmStart;

        if (resultPtr) {
          // 3. 문자열 변환 시간 측정
          const strConvertStart = performance.now();
          const resultStr = module.UTF8ToString(resultPtr);
          const strConvertTime = performance.now() - strConvertStart;

          // 4. JSON 파싱 시간 측정
          const jsonParseStart = performance.now();
          const response = JSON.parse(resultStr);
          const jsonParseTime = performance.now() - jsonParseStart;

          clearTimeout(timeoutId);
          resolve({
            response,
            pureAlgorithmTime,
            overhead: {
              memoryAlloc: memAllocTime,
              stringConvert: strConvertTime,
              jsonParse: jsonParseTime,
            },
          });
        } else {
          clearTimeout(timeoutId);
          reject(new Error('diff_text 반환한 포인터가 유효하지 않습니다'));
        }
      } finally {
        // 메모리 해제 (오버헤드에 포함하지 않음 - 결과 반환 후 수행)
        if (baseTextPtr) module._free(baseTextPtr);
        if (changedTextPtr) module._free(changedTextPtr);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    }
  });
}

/**
 * WASM 모드 스트리밍 diff (최적화된 메모리 접근 사용)
 */
export async function streamDiffWasm(options: WasmStreamDiffOptions): Promise<StreamDiffResult> {
  const { baseText, compareText, onProgress } = options;

  const tracker = new PerformanceTracker('cpp');
  tracker.start();

  // 파일 크기 기록
  tracker.setFileSizes(new Blob([baseText]).size, new Blob([compareText]).size);

  // WASM 모듈 준비 확인
  if (!isWasmModuleReady()) {
    console.warn('WASM 모듈이 준비되지 않았습니다. JS 모드로 폴백합니다.');
    return streamDiffJs(baseText, compareText, onProgress);
  }

  // 최적화 모드 사용 가능 여부 확인
  const useOptimized = isOptimizedModeAvailable();
  const optimizationStatus = getOptimizationStatus();

  console.log(`[WASM] 최적화 모드: ${useOptimized ? '활성화' : '비활성화'}`);
  console.log(`[WASM] 메모리 풀: ${optimizationStatus.memoryPoolActive ? '활성' : '비활성'}`);
  console.log(`[WASM] SharedArrayBuffer: ${optimizationStatus.sharedArrayBufferSupported ? '지원' : '미지원'}`);

  // 청크 분할 시작
  tracker.startPhase('chunkSplit');
  const baseLines = splitLines(baseText);
  const compareLines = splitLines(compareText);

  // 작은 파일은 직접 WASM 호출
  if (baseLines.length <= CHUNK_SIZE_LINES && compareLines.length <= CHUNK_SIZE_LINES) {
    tracker.endPhase('chunkSplit');
    tracker.setChunkCount(1);

    if (onProgress) {
      onProgress({ current: 1, total: 1, percentage: 100 });
    }

    tracker.startPhase('diffProcess');
    try {
      const chunkStart = performance.now();

      // 최적화된 버전 사용 (메모리 풀 + 직접 메모리 접근)
      const result = useOptimized
        ? await processWasmChunkOptimized(baseText, compareText)
        : await processWasmChunk(baseText, compareText);

      const chunkDuration = performance.now() - chunkStart;

      // 순수 알고리즘 시간과 오버헤드 기록
      tracker.recordChunkTime(0, chunkDuration, result.pureAlgorithmTime);
      tracker.recordWasmOverhead(result.overhead);
      tracker.endPhase('diffProcess');

      const metrics = tracker.finalize();
      return { response: result.response, metrics };
    } catch (error) {
      const chunkStart = performance.now();
      const response = diffTextJs(baseText, compareText);
      const chunkDuration = performance.now() - chunkStart;
      tracker.recordChunkTime(0, chunkDuration, chunkDuration);
      tracker.endPhase('diffProcess');

      const metrics = tracker.finalize();
      return { response, metrics };
    }
  }

  // 청크 분할
  const chunks = splitIntoChunks(baseLines, compareLines);
  tracker.endPhase('chunkSplit');
  tracker.setChunkCount(chunks.length);

  const allRows: WasmDiffItem[] = [];

  console.log(`[WASM] 총 ${chunks.length}개 청크로 분할하여 처리 시작`);

  // Diff 연산 시작
  tracker.startPhase('diffProcess');

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    // 진행 상황 보고
    if (onProgress) {
      onProgress({
        current: i + 1,
        total: chunks.length,
        percentage: Math.round(((i + 1) / chunks.length) * 100),
      });
    }

    // 청크를 텍스트로 변환
    const chunkBaseText = joinLines(chunk.baseLines);
    const chunkCompareText = joinLines(chunk.compareLines);

    try {
      const chunkStart = performance.now();

      // 최적화된 버전 사용 (메모리 풀 재사용)
      const result = useOptimized
        ? await processWasmChunkOptimized(chunkBaseText, chunkCompareText)
        : await processWasmChunk(chunkBaseText, chunkCompareText);

      const chunkDuration = performance.now() - chunkStart;

      // 순수 알고리즘 시간과 오버헤드 기록
      tracker.recordChunkTime(i, chunkDuration, result.pureAlgorithmTime);
      tracker.recordWasmOverhead(result.overhead);
      allRows.push(...result.response.rows);
    } catch (error) {
      // 실패한 청크는 JS로 처리
      console.debug(`청크 ${i + 1} WASM 처리 실패, JS로 폴백:`, error);
      const chunkStart = performance.now();
      const fallbackResult = diffTextJs(chunkBaseText, chunkCompareText);
      const chunkDuration = performance.now() - chunkStart;
      tracker.recordChunkTime(i, chunkDuration, chunkDuration);
      allRows.push(...fallbackResult.rows);
    }

    // UI 반응성을 위해 이벤트 루프 양보
    await yieldToMain();
  }

  tracker.endPhase('diffProcess');

  console.log(`[WASM] 처리 완료: ${allRows.length}개 행`);

  const response = { rows: allRows };
  const metrics = tracker.finalize();

  return { response, metrics };
}
