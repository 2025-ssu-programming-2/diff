import * as React from 'react';
import { useMemo } from 'react';
import { type PerformanceMetrics, formatDuration, formatBytes, calculatePercentage } from '@/utils/performance';
import { Clock, Zap, FileText, Layers, BarChart3, TrendingUp, TrendingDown, Minus, Cpu, Timer } from 'lucide-react';

interface PerformancePanelProps {
  metrics: PerformanceMetrics | null;
  className?: string;
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  color?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

function MetricCard({ icon, label, value, subValue, color = 'default' }: MetricCardProps) {
  const colorClasses = {
    default: 'from-slate-500 to-slate-600',
    success: 'from-emerald-500 to-emerald-600',
    warning: 'from-amber-500 to-amber-600',
    danger: 'from-rose-500 to-rose-600',
    info: 'from-sky-500 to-sky-600',
  };

  const bgColorClasses = {
    default: 'bg-slate-50 border-slate-200',
    success: 'bg-emerald-50 border-emerald-200',
    warning: 'bg-amber-50 border-amber-200',
    danger: 'bg-rose-50 border-rose-200',
    info: 'bg-sky-50 border-sky-200',
  };

  return (
    <div className={`rounded-xl border ${bgColorClasses[color]} p-4 transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
          {subValue && <p className="mt-0.5 text-xs text-slate-500">{subValue}</p>}
        </div>
        <div className={`rounded-lg bg-gradient-to-br ${colorClasses[color]} p-2 text-white shadow-sm`}>{icon}</div>
      </div>
    </div>
  );
}

interface TimelineBarProps {
  phases: Array<{ name: string; duration: number; color: string }>;
  totalTime: number;
}

function TimelineBar({ phases, totalTime }: TimelineBarProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <BarChart3 className="h-4 w-4" />
        실행 시간 분포
      </h4>
      <div className="mb-2 flex h-8 overflow-hidden rounded-lg">
        {phases.map((phase, idx) => {
          const percentage = calculatePercentage(phase.duration, totalTime);
          if (percentage < 0.5) return null;

          return (
            <div
              key={idx}
              className={`${phase.color} flex items-center justify-center text-xs font-medium text-white transition-all hover:brightness-110`}
              style={{ width: `${Math.max(percentage, 2)}%` }}
              title={`${phase.name}: ${formatDuration(phase.duration)} (${percentage.toFixed(1)}%)`}
            >
              {percentage > 8 && `${percentage.toFixed(0)}%`}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 text-xs">
        {phases.map((phase, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <div className={`h-2.5 w-2.5 rounded-full ${phase.color}`} />
            <span className="text-slate-600">{phase.name}</span>
            <span className="font-mono font-medium text-slate-800">{formatDuration(phase.duration)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ChunkPerformanceChartProps {
  chunkTimings: Array<{ index: number; duration: number }>;
}

function ChunkPerformanceChart({ chunkTimings }: ChunkPerformanceChartProps) {
  if (chunkTimings.length <= 1) return null;

  const maxDuration = Math.max(...chunkTimings.map((c) => c.duration));
  const avgDuration = chunkTimings.reduce((a, b) => a + b.duration, 0) / chunkTimings.length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Layers className="h-4 w-4" />
        청크별 처리 시간
        <span className="ml-auto text-xs font-normal text-slate-500">{chunkTimings.length}개 청크</span>
      </h4>
      {/* 가로 스크롤 가능한 컨테이너 */}
      <div className="scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 overflow-x-auto pb-2">
        <div
          className="flex h-24 items-end gap-0.5"
          style={{ minWidth: `${Math.max(chunkTimings.length * 8, 100)}px` }}
        >
          {chunkTimings.map((chunk, idx) => {
            const heightPercent = (chunk.duration / maxDuration) * 100;
            const isAboveAvg = chunk.duration > avgDuration;

            return (
              <div
                key={idx}
                className={`w-[6px] shrink-0 rounded-t transition-all hover:scale-x-150 hover:opacity-80 ${
                  isAboveAvg ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ height: `${Math.max(heightPercent, 5)}%` }}
                title={`청크 ${chunk.index + 1}: ${formatDuration(chunk.duration)}`}
              />
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>청크 1</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            평균 이하
          </span>
          <span className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-amber-400" />
            평균 이상
          </span>
        </div>
        <span>청크 {chunkTimings.length}</span>
      </div>
    </div>
  );
}

/**
 * WASM 오버헤드 분석 패널 (C++ 모드 전용)
 */
interface WasmOverheadPanelProps {
  metrics: PerformanceMetrics;
}

function WasmOverheadPanel({ metrics }: WasmOverheadPanelProps) {
  if (metrics.mode !== 'cpp' || metrics.wasmOverhead === 0) return null;

  const overheadPercent = calculatePercentage(metrics.wasmOverhead, metrics.totalDiffTime);
  const purePercent = calculatePercentage(metrics.pureAlgorithmTime, metrics.totalDiffTime);

  return (
    <div className="overflow-hidden rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="border-b border-blue-200 bg-blue-100/50 px-4 py-3">
        <h4 className="flex items-center gap-2 text-sm font-bold text-blue-800">
          <Cpu className="h-4 w-4" />
          C++ 순수 알고리즘 성능 분석
        </h4>
        <p className="mt-1 text-xs text-blue-600">WASM 호출 오버헤드를 제외한 순수 C++ 알고리즘 실행 시간</p>
      </div>

      {/* 시각적 비교 바 */}
      <div className="p-4">
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-700">Diff 연산 시간 구성</span>
            <span className="font-mono text-xs text-slate-500">{formatDuration(metrics.totalDiffTime)}</span>
          </div>
          <div className="flex h-6 overflow-hidden rounded-lg border border-slate-200">
            <div
              className="flex items-center justify-center bg-gradient-to-r from-blue-500 to-blue-600 text-xs font-bold text-white"
              style={{ width: `${purePercent}%` }}
              title={`순수 C++ 알고리즘: ${formatDuration(metrics.pureAlgorithmTime)}`}
            >
              {purePercent > 20 && `${purePercent.toFixed(0)}%`}
            </div>
            <div
              className="flex items-center justify-center bg-gradient-to-r from-orange-400 to-orange-500 text-xs font-medium text-white"
              style={{ width: `${overheadPercent}%` }}
              title={`WASM 오버헤드: ${formatDuration(metrics.wasmOverhead)}`}
            >
              {overheadPercent > 20 && `${overheadPercent.toFixed(0)}%`}
            </div>
          </div>
          <div className="mt-2 flex justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              <span className="text-slate-600">순수 C++ 알고리즘</span>
              <span className="font-mono font-bold text-blue-700">{formatDuration(metrics.pureAlgorithmTime)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-orange-400" />
              <span className="text-slate-600">WASM 오버헤드</span>
              <span className="font-mono font-medium text-orange-600">{formatDuration(metrics.wasmOverhead)}</span>
            </div>
          </div>
        </div>

        {/* 오버헤드 세부 내역 */}
        <div className="rounded-lg border border-slate-200 bg-white/70 p-3">
          <h5 className="mb-2 text-xs font-semibold text-slate-600">WASM 오버헤드 세부 내역</h5>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-slate-50 p-2">
              <p className="text-[10px] text-slate-500">메모리 할당</p>
              <p className="font-mono text-sm font-semibold text-slate-700">
                {formatDuration(metrics.memoryAllocTime)}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-2">
              <p className="text-[10px] text-slate-500">문자열 변환</p>
              <p className="font-mono text-sm font-semibold text-slate-700">
                {formatDuration(metrics.stringConvertTime)}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-2">
              <p className="text-[10px] text-slate-500">JSON 파싱</p>
              <p className="font-mono text-sm font-semibold text-slate-700">{formatDuration(metrics.jsonParseTime)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DetailedMetricsTableProps {
  metrics: PerformanceMetrics;
}

function DetailedMetricsTable({ metrics }: DetailedMetricsTableProps) {
  const isCppMode = metrics.mode === 'cpp';

  const rows = [
    { category: '파일 입출력', name: '파일 읽기', value: metrics.fileReadTime, icon: <FileText className="h-3 w-3" /> },
    { category: '전처리', name: '청크 분할', value: metrics.chunkSplitTime, icon: <Layers className="h-3 w-3" /> },
    { category: 'Diff 연산', name: '전체 Diff 처리', value: metrics.totalDiffTime, icon: <Zap className="h-3 w-3" /> },
    ...(isCppMode
      ? [
          {
            category: 'Diff 연산',
            name: '⚡ 순수 알고리즘 시간',
            value: metrics.pureAlgorithmTime,
            icon: <Cpu className="h-3 w-3" />,
            highlight: true,
          },
          {
            category: 'Diff 연산',
            name: 'WASM 오버헤드',
            value: metrics.wasmOverhead,
            icon: <Timer className="h-3 w-3" />,
          },
        ]
      : []),
    { category: 'Diff 연산', name: '평균 청크 처리', value: metrics.avgChunkTime, icon: <Minus className="h-3 w-3" /> },
    {
      category: 'Diff 연산',
      name: '최소 청크 처리',
      value: metrics.minChunkTime,
      icon: <TrendingDown className="h-3 w-3" />,
    },
    {
      category: 'Diff 연산',
      name: '최대 청크 처리',
      value: metrics.maxChunkTime,
      icon: <TrendingUp className="h-3 w-3" />,
    },
    { category: '후처리', name: '결과 파싱', value: metrics.parseTime, icon: <BarChart3 className="h-3 w-3" /> },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Clock className="h-4 w-4" />
          상세 타이밍 정보
        </h4>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map((row, idx) => (
          <div
            key={idx}
            className={`flex items-center px-4 py-2.5 transition-colors hover:bg-slate-50 ${
              (row as { highlight?: boolean }).highlight ? 'bg-blue-50 hover:bg-blue-100' : ''
            }`}
          >
            <div className="flex w-24 items-center gap-1.5 text-xs text-slate-500">
              {row.icon}
              {row.category}
            </div>
            <div
              className={`flex-1 text-sm ${(row as { highlight?: boolean }).highlight ? 'font-semibold text-blue-700' : 'text-slate-700'}`}
            >
              {row.name}
            </div>
            <div
              className={`font-mono text-sm font-semibold ${(row as { highlight?: boolean }).highlight ? 'text-blue-700' : 'text-slate-800'}`}
            >
              {formatDuration(row.value)}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-300 bg-slate-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">총 실행 시간</span>
          <span className="font-mono text-lg font-bold text-slate-900">{formatDuration(metrics.totalTime)}</span>
        </div>
      </div>
    </div>
  );
}

export default function PerformancePanel({ metrics, className }: PerformancePanelProps) {
  if (!metrics) return null;

  const isCppMode = metrics.mode === 'cpp';

  const phases = useMemo(
    () =>
      isCppMode
        ? [
            { name: '파일 읽기', duration: metrics.fileReadTime, color: 'bg-sky-500' },
            { name: '청크 분할', duration: metrics.chunkSplitTime, color: 'bg-violet-500' },
            { name: '순수 C++ 알고리즘', duration: metrics.pureAlgorithmTime, color: 'bg-blue-500' },
            { name: 'WASM 오버헤드', duration: metrics.wasmOverhead, color: 'bg-orange-400' },
            { name: '파싱', duration: metrics.parseTime, color: 'bg-amber-500' },
          ]
        : [
            { name: '파일 읽기', duration: metrics.fileReadTime, color: 'bg-sky-500' },
            { name: '청크 분할', duration: metrics.chunkSplitTime, color: 'bg-violet-500' },
            { name: 'Diff 연산', duration: metrics.totalDiffTime, color: 'bg-emerald-500' },
            { name: '파싱', duration: metrics.parseTime, color: 'bg-amber-500' },
          ],
    [metrics, isCppMode],
  );

  const modeLabel = isCppMode ? 'C++ (WASM)' : 'JavaScript';
  const throughput =
    metrics.totalTime > 0
      ? ((metrics.fileSizeBase + metrics.fileSizeCompare) / 1024 / (metrics.totalTime / 1000)).toFixed(2)
      : '0';

  // 순수 알고리즘 기준 처리량 (C++ 모드에서만)
  const pureThroughput =
    isCppMode && metrics.pureAlgorithmTime > 0
      ? ((metrics.fileSizeBase + metrics.fileSizeCompare) / 1024 / (metrics.pureAlgorithmTime / 1000)).toFixed(2)
      : null;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`rounded-lg px-3 py-1.5 text-sm font-bold text-white shadow-sm ${
              isCppMode
                ? 'bg-gradient-to-r from-blue-600 to-blue-700'
                : 'bg-gradient-to-r from-yellow-500 to-yellow-600'
            }`}
          >
            {modeLabel}
          </div>
          <span className="text-sm text-slate-500">
            {new Date(metrics.timestamp).toLocaleString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </span>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">처리량</p>
          <p className="font-mono text-lg font-bold text-slate-800">{throughput} KB/s</p>
          {pureThroughput && (
            <p className="text-xs text-blue-600">
              순수 알고리즘: <span className="font-mono font-bold">{pureThroughput} KB/s</span>
            </p>
          )}
        </div>
      </div>

      {/* 주요 메트릭 카드 */}
      <div className={`grid gap-3 ${isCppMode ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'}`}>
        <MetricCard
          icon={<Clock className="h-4 w-4" />}
          label="총 실행 시간"
          value={formatDuration(metrics.totalTime)}
          color="info"
        />
        {isCppMode && (
          <MetricCard
            icon={<Cpu className="h-4 w-4" />}
            label="⚡ 순수 알고리즘"
            value={formatDuration(metrics.pureAlgorithmTime)}
            subValue="C++ 코어 성능"
            color="success"
          />
        )}
        <MetricCard
          icon={<Zap className="h-4 w-4" />}
          label={isCppMode ? 'Diff (오버헤드 포함)' : 'Diff 연산'}
          value={formatDuration(metrics.totalDiffTime)}
          subValue={`${metrics.chunkCount}개 청크`}
          color={isCppMode ? 'warning' : 'success'}
        />
        <MetricCard
          icon={<FileText className="h-4 w-4" />}
          label="파일 크기"
          value={formatBytes(metrics.fileSizeBase + metrics.fileSizeCompare)}
          subValue={`${formatBytes(metrics.fileSizeBase)} + ${formatBytes(metrics.fileSizeCompare)}`}
          color="default"
        />
        <MetricCard
          icon={<Layers className="h-4 w-4" />}
          label="처리 라인"
          value={metrics.totalLines.toLocaleString()}
          subValue={`+${metrics.addedLines} -${metrics.deletedLines} ~${metrics.changedLines}`}
          color="default"
        />
      </div>

      {/* WASM 오버헤드 분석 패널 (C++ 모드 전용) */}
      <WasmOverheadPanel metrics={metrics} />

      {/* 타임라인 바 */}
      <TimelineBar phases={phases} totalTime={metrics.totalTime} />

      {/* 청크 성능 차트 */}
      <ChunkPerformanceChart chunkTimings={metrics.chunkTimings} />

      {/* 상세 타이밍 테이블 */}
      <DetailedMetricsTable metrics={metrics} />
    </div>
  );
}
