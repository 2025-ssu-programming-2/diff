export interface TimingEntry {
  name: string;
  duration: number; // ms
  startTime: number;
  endTime: number;
}

export interface ChunkTiming {
  index: number;
  duration: number; // ms (전체 처리 시간)
  pureTime: number; // ms (순수 알고리즘 시간, 오버헤드 제외)
}

export interface WasmOverheadTiming {
  memoryAlloc: number; // 메모리 할당 시간
  stringConvert: number; // 문자열 변환 시간
  jsonParse: number; // JSON 파싱 시간
}

export interface PerformanceMetrics {
  // 파일 관련
  fileReadTime: number; // 파일 읽기 시간 (ms)
  fileSizeBase: number; // Base 파일 크기 (bytes)
  fileSizeCompare: number; // Compare 파일 크기 (bytes)

  // 청크 관련
  chunkSplitTime: number; // 청크 분할 시간 (ms)
  chunkCount: number; // 총 청크 수
  chunkTimings: ChunkTiming[]; // 각 청크별 처리 시간

  // Diff 연산
  totalDiffTime: number; // 전체 Diff 연산 시간 (ms)
  avgChunkTime: number; // 평균 청크 처리 시간 (ms)
  minChunkTime: number; // 최소 청크 처리 시간 (ms)
  maxChunkTime: number; // 최대 청크 처리 시간 (ms)

  // 순수 알고리즘 시간 (WASM 오버헤드 제외)
  pureAlgorithmTime: number; // 순수 알고리즘 실행 시간 (ms)
  avgPureChunkTime: number; // 평균 순수 청크 처리 시간 (ms)

  // WASM 오버헤드 (C++ 모드에서만 유효)
  wasmOverhead: number; // 총 WASM 오버헤드 (ms)
  memoryAllocTime: number; // 메모리 할당 시간 (ms)
  stringConvertTime: number; // 문자열 변환 시간 (ms)
  jsonParseTime: number; // JSON 파싱 시간 (ms)

  // 파싱 관련
  parseTime: number; // 결과 파싱 시간 (ms)

  // 전체
  totalTime: number; // 전체 실행 시간 (ms)

  // 결과
  totalLines: number; // 전체 라인 수
  addedLines: number; // 추가된 라인 수
  deletedLines: number; // 삭제된 라인 수
  changedLines: number; // 수정된 라인 수

  // 메타 정보
  mode: 'cpp' | 'js';
  timestamp: number;
}

export class PerformanceTracker {
  private timings: Map<string, TimingEntry> = new Map();
  private chunkTimings: ChunkTiming[] = [];
  private wasmOverheadTimings: WasmOverheadTiming[] = [];
  private startTime: number = 0;
  private metrics: Partial<PerformanceMetrics> = {};

  constructor(mode: 'cpp' | 'js') {
    this.metrics.mode = mode;
    this.metrics.timestamp = Date.now();
  }

  /**
   * 전체 측정 시작
   */
  start(): void {
    this.startTime = performance.now();
    this.timings.clear();
    this.chunkTimings = [];
    this.wasmOverheadTimings = [];
  }

  /**
   * 특정 단계 시작
   */
  startPhase(name: string): void {
    this.timings.set(name, {
      name,
      duration: 0,
      startTime: performance.now(),
      endTime: 0,
    });
  }

  /**
   * 특정 단계 종료
   */
  endPhase(name: string): number {
    const entry = this.timings.get(name);
    if (entry) {
      entry.endTime = performance.now();
      entry.duration = entry.endTime - entry.startTime;
      return entry.duration;
    }
    return 0;
  }

  /**
   * 청크 처리 시간 기록 (순수 알고리즘 시간 포함)
   */
  recordChunkTime(index: number, duration: number, pureTime?: number): void {
    this.chunkTimings.push({
      index,
      duration,
      pureTime: pureTime ?? duration, // pureTime이 없으면 duration과 동일 (JS 모드)
    });
  }

  /**
   * WASM 오버헤드 기록
   */
  recordWasmOverhead(overhead: WasmOverheadTiming): void {
    this.wasmOverheadTimings.push(overhead);
  }

  /**
   * 파일 크기 기록
   */
  setFileSizes(baseSize: number, compareSize: number): void {
    this.metrics.fileSizeBase = baseSize;
    this.metrics.fileSizeCompare = compareSize;
  }

  /**
   * 결과 통계 기록
   */
  setResultStats(totalLines: number, added: number, deleted: number, changed: number): void {
    this.metrics.totalLines = totalLines;
    this.metrics.addedLines = added;
    this.metrics.deletedLines = deleted;
    this.metrics.changedLines = changed;
  }

  /**
   * 청크 수 설정
   */
  setChunkCount(count: number): void {
    this.metrics.chunkCount = count;
  }

  /**
   * 최종 메트릭 계산 및 반환
   */
  finalize(): PerformanceMetrics {
    const totalTime = performance.now() - this.startTime;

    // 청크 통계 계산
    const chunkDurations = this.chunkTimings.map((c) => c.duration);
    const chunkPureTimes = this.chunkTimings.map((c) => c.pureTime);
    const avgChunkTime =
      chunkDurations.length > 0 ? chunkDurations.reduce((a, b) => a + b, 0) / chunkDurations.length : 0;
    const minChunkTime = chunkDurations.length > 0 ? Math.min(...chunkDurations) : 0;
    const maxChunkTime = chunkDurations.length > 0 ? Math.max(...chunkDurations) : 0;

    // 순수 알고리즘 시간 계산
    const pureAlgorithmTime = chunkPureTimes.reduce((a, b) => a + b, 0);
    const avgPureChunkTime = chunkPureTimes.length > 0 ? pureAlgorithmTime / chunkPureTimes.length : 0;

    // WASM 오버헤드 계산
    const totalMemoryAlloc = this.wasmOverheadTimings.reduce((a, b) => a + b.memoryAlloc, 0);
    const totalStringConvert = this.wasmOverheadTimings.reduce((a, b) => a + b.stringConvert, 0);
    const totalJsonParse = this.wasmOverheadTimings.reduce((a, b) => a + b.jsonParse, 0);
    const wasmOverhead = totalMemoryAlloc + totalStringConvert + totalJsonParse;

    return {
      fileReadTime: this.timings.get('fileRead')?.duration ?? 0,
      fileSizeBase: this.metrics.fileSizeBase ?? 0,
      fileSizeCompare: this.metrics.fileSizeCompare ?? 0,
      chunkSplitTime: this.timings.get('chunkSplit')?.duration ?? 0,
      chunkCount: this.metrics.chunkCount ?? 1,
      chunkTimings: this.chunkTimings,
      totalDiffTime: this.timings.get('diffProcess')?.duration ?? 0,
      avgChunkTime,
      minChunkTime,
      maxChunkTime,
      pureAlgorithmTime,
      avgPureChunkTime,
      wasmOverhead,
      memoryAllocTime: totalMemoryAlloc,
      stringConvertTime: totalStringConvert,
      jsonParseTime: totalJsonParse,
      parseTime: this.timings.get('parse')?.duration ?? 0,
      totalTime,
      totalLines: this.metrics.totalLines ?? 0,
      addedLines: this.metrics.addedLines ?? 0,
      deletedLines: this.metrics.deletedLines ?? 0,
      changedLines: this.metrics.changedLines ?? 0,
      mode: this.metrics.mode ?? 'js',
      timestamp: this.metrics.timestamp ?? Date.now(),
    };
  }
}

/**
 * 숫자를 사람이 읽기 쉬운 형태로 포맷
 */
export function formatDuration(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(2)}μs`;
  }
  if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  }
  return `${(ms / 1000).toFixed(3)}s`;
}

/**
 * 바이트를 사람이 읽기 쉬운 형태로 포맷
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes}B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)}KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

/**
 * 퍼센트 계산
 */
export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return (part / total) * 100;
}
