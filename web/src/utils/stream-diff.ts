/**
 * 스트리밍 Diff 유틸리티
 * 대용량 파일을 청크 단위로 처리하여 메모리 효율적인 diff 연산 수행
 */

import type { WasmDiffResponse, WasmDiffItem } from './diff';
import { diffTextJs } from './algorithm';

// 청크 설정: 라인 수 기준 (500줄씩 처리 - 더 작은 청크로 안정성 확보)
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
 * JS 모드: 청크 단위 스트리밍 diff 처리
 */
export async function streamDiffJs(
  baseText: string,
  compareText: string,
  onProgress?: ProgressCallback,
): Promise<WasmDiffResponse> {
  const baseLines = splitLines(baseText);
  const compareLines = splitLines(compareText);

  // 작은 파일은 직접 처리
  if (baseLines.length <= CHUNK_SIZE_LINES && compareLines.length <= CHUNK_SIZE_LINES) {
    if (onProgress) {
      onProgress({ current: 1, total: 1, percentage: 100 });
    }
    return diffTextJs(baseText, compareText);
  }

  const chunks = splitIntoChunks(baseLines, compareLines);
  const allRows: WasmDiffItem[] = [];

  console.log(`[JS] 총 ${chunks.length}개 청크로 분할하여 처리 시작`);

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

    const result = diffTextJs(chunkBaseText, chunkCompareText);

    // 결과 병합
    allRows.push(...result.rows);

    // UI 반응성을 위해 이벤트 루프 양보
    await yieldToMain();
  }

  console.log(`[JS] 처리 완료: ${allRows.length}개 행`);
  return { rows: allRows };
}

/**
 * WASM 모듈 사용 가능 여부 확인
 */
function isWasmModuleReady(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const module = (window as any).Module;
  return !!(module && module._diff_text && module.allocateUTF8 && module.UTF8ToString && module._free);
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
 * WASM 단일 청크 처리 (타임아웃 포함)
 */
function processWasmChunk(baseText: string, compareText: string, timeoutMs: number = 30000): Promise<WasmDiffResponse> {
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

      // 문자열을 WASM 메모리에 할당
      const baseTextPtr = module.allocateUTF8(baseText);
      const changedTextPtr = module.allocateUTF8(compareText);

      if (!baseTextPtr || !changedTextPtr) {
        clearTimeout(timeoutId);
        if (baseTextPtr) module._free(baseTextPtr);
        if (changedTextPtr) module._free(changedTextPtr);
        reject(new Error('메모리 할당 실패'));
        return;
      }

      try {
        // _diff_text 호출
        const resultPtr = module._diff_text(baseTextPtr, changedTextPtr);

        if (resultPtr) {
          const resultStr = module.UTF8ToString(resultPtr);
          clearTimeout(timeoutId);
          resolve(JSON.parse(resultStr));
        } else {
          clearTimeout(timeoutId);
          reject(new Error('diff_text 반환한 포인터가 유효하지 않습니다'));
        }
      } finally {
        // 메모리 해제
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
 * WASM 모드 스트리밍 diff (메인 스레드에서 사용)
 */
export async function streamDiffWasm(options: WasmStreamDiffOptions): Promise<WasmDiffResponse> {
  const { baseText, compareText, onProgress } = options;

  // WASM 모듈 준비 확인
  if (!isWasmModuleReady()) {
    console.warn('WASM 모듈이 준비되지 않았습니다. JS 모드로 폴백합니다.');
    return streamDiffJs(baseText, compareText, onProgress);
  }

  const baseLines = splitLines(baseText);
  const compareLines = splitLines(compareText);

  // 작은 파일은 직접 WASM 호출
  if (baseLines.length <= CHUNK_SIZE_LINES && compareLines.length <= CHUNK_SIZE_LINES) {
    if (onProgress) {
      onProgress({ current: 1, total: 1, percentage: 100 });
    }
    try {
      return await processWasmChunk(baseText, compareText);
    } catch (error) {
      console.error('WASM 처리 실패, JS로 폴백:', error);
      return diffTextJs(baseText, compareText);
    }
  }

  // 청크 분할
  const chunks = splitIntoChunks(baseLines, compareLines);
  const allRows: WasmDiffItem[] = [];

  console.log(`[WASM] 총 ${chunks.length}개 청크로 분할하여 처리 시작`);

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
      // WASM diff 수행 (타임아웃 포함)
      const result = await processWasmChunk(chunkBaseText, chunkCompareText);
      allRows.push(...result.rows);
    } catch (error) {
      console.error(`청크 ${i + 1} WASM 처리 실패, JS로 폴백:`, error);
      // 실패한 청크는 JS로 처리
      const fallbackResult = diffTextJs(chunkBaseText, chunkCompareText);
      allRows.push(...fallbackResult.rows);
    }

    // UI 반응성을 위해 이벤트 루프 양보
    await yieldToMain();
  }

  console.log(`[WASM] 처리 완료: ${allRows.length}개 행`);
  return { rows: allRows };
}
