import type { WasmDiffResponse } from './diff';
import type { WasmOverheadTiming } from './performance';

// WASM 모듈 타입 정의
interface WasmModule {
  _diff_text: (basePtr: number, comparePtr: number) => number;
  _malloc: (size: number) => number;
  _free: (ptr: number) => void;
  HEAPU8: Uint8Array;
  UTF8ToString: (ptr: number) => string;
  allocateUTF8: (str: string) => number;
}

// 메모리 풀 관리 (재사용을 통한 malloc/free 오버헤드 감소)
interface MemoryPool {
  baseBuffer: number;
  baseBufferSize: number;
  compareBuffer: number;
  compareBufferSize: number;
}

let memoryPool: MemoryPool | null = null;

/**
 * WASM 모듈 가져오기
 */
function getWasmModule(): WasmModule | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const module = (window as any).Module as WasmModule;
  if (!module || !module._diff_text || !module.HEAPU8) {
    return null;
  }
  return module;
}

/**
 * 메모리 풀 초기화 또는 확장
 */
function ensureMemoryPool(module: WasmModule, baseSize: number, compareSize: number): MemoryPool {
  // 기존 풀이 충분하면 재사용
  if (memoryPool && memoryPool.baseBufferSize >= baseSize && memoryPool.compareBufferSize >= compareSize) {
    return memoryPool;
  }

  // 기존 메모리 해제
  if (memoryPool) {
    module._free(memoryPool.baseBuffer);
    module._free(memoryPool.compareBuffer);
  }

  // 새 버퍼 크기 (여유 있게 1.5배)
  const newBaseSize = Math.ceil(baseSize * 1.5);
  const newCompareSize = Math.ceil(compareSize * 1.5);

  memoryPool = {
    baseBuffer: module._malloc(newBaseSize),
    baseBufferSize: newBaseSize,
    compareBuffer: module._malloc(newCompareSize),
    compareBufferSize: newCompareSize,
  };

  return memoryPool;
}

/**
 * WASM 메모리에서 직접 문자열 읽기 (UTF8ToString 대체)
 */
function readStringFromWasm(module: WasmModule, ptr: number): string {
  const heap = module.HEAPU8;
  let end = ptr;

  // null terminator 찾기
  while (heap[end] !== 0) {
    end++;
  }

  // Uint8Array 슬라이스로 직접 디코딩
  const bytes = heap.subarray(ptr, end);
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(bytes);
}

/**
 * 최적화된 WASM 청크 처리 결과
 */
export interface OptimizedWasmResult {
  response: WasmDiffResponse;
  pureAlgorithmTime: number;
  overhead: WasmOverheadTiming;
}

/**
 * 최적화된 WASM 청크 처리
 * - 메모리 풀 재사용으로 malloc/free 오버헤드 감소
 * - TextEncoder/TextDecoder로 직접 메모리 접근
 */
export async function processWasmChunkOptimized(baseText: string, compareText: string): Promise<OptimizedWasmResult> {
  const module = getWasmModule();

  if (!module) {
    throw new Error('WASM Module not loaded');
  }

  // 1. 메모리 준비 시간 측정
  const memAllocStart = performance.now();

  // UTF-8 인코딩된 바이트 크기 계산 (null terminator 포함)
  const encoder = new TextEncoder();
  const baseBytes = encoder.encode(baseText);
  const compareBytes = encoder.encode(compareText);

  const baseSize = baseBytes.length + 1; // +1 for null terminator
  const compareSize = compareBytes.length + 1;

  // 메모리 풀 확보 (재사용)
  const pool = ensureMemoryPool(module, baseSize, compareSize);

  // WASM 메모리에 직접 쓰기
  module.HEAPU8.set(baseBytes, pool.baseBuffer);
  module.HEAPU8[pool.baseBuffer + baseBytes.length] = 0;

  module.HEAPU8.set(compareBytes, pool.compareBuffer);
  module.HEAPU8[pool.compareBuffer + compareBytes.length] = 0;

  const memAllocTime = performance.now() - memAllocStart;

  // 2. 순수 C++ 알고리즘 실행 시간 측정
  const algorithmStart = performance.now();
  const resultPtr = module._diff_text(pool.baseBuffer, pool.compareBuffer);
  const pureAlgorithmTime = performance.now() - algorithmStart;

  if (!resultPtr) {
    throw new Error('diff_text returned null pointer');
  }

  // 3. 문자열 변환 시간 측정
  const strConvertStart = performance.now();
  const resultStr = readStringFromWasm(module, resultPtr);
  const strConvertTime = performance.now() - strConvertStart;

  // 4. JSON 파싱 시간 측정
  const jsonParseStart = performance.now();
  const response = JSON.parse(resultStr) as WasmDiffResponse;
  const jsonParseTime = performance.now() - jsonParseStart;

  return {
    response,
    pureAlgorithmTime,
    overhead: {
      memoryAlloc: memAllocTime,
      stringConvert: strConvertTime,
      jsonParse: jsonParseTime,
    },
  };
}

/**
 * 메모리 풀 해제 (페이지 언로드 시 호출)
 */
export function releaseMemoryPool(): void {
  if (memoryPool) {
    const module = getWasmModule();
    if (module) {
      module._free(memoryPool.baseBuffer);
      module._free(memoryPool.compareBuffer);
    }
    memoryPool = null;
  }
}

/**
 * SharedArrayBuffer 지원 여부 확인
 */
export function isSharedArrayBufferSupported(): boolean {
  try {
    // SharedArrayBuffer는 특정 CORS 헤더가 필요
    // Cross-Origin-Opener-Policy: same-origin
    // Cross-Origin-Embedder-Policy: require-corp
    return typeof SharedArrayBuffer !== 'undefined' && crossOriginIsolated;
  } catch {
    return false;
  }
}

/**
 * 현재 최적화 상태 정보
 */
export function getOptimizationStatus(): {
  memoryPoolActive: boolean;
  poolBaseSize: number;
  poolCompareSize: number;
  sharedArrayBufferSupported: boolean;
} {
  return {
    memoryPoolActive: memoryPool !== null,
    poolBaseSize: memoryPool?.baseBufferSize ?? 0,
    poolCompareSize: memoryPool?.compareBufferSize ?? 0,
    sharedArrayBufferSupported: isSharedArrayBufferSupported(),
  };
}
