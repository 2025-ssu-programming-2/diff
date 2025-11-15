export type DiffType = 'same' | 'added' | 'deleted';

export interface DiffItem {
  type: DiffType;
  content: string;
}

let wasmModule: any = null;
let wasmInitPromise: Promise<any> | null = null;

// WASM 모듈 초기화
export async function initWasm() {
  if (wasmModule) return wasmModule;
  if (wasmInitPromise) return wasmInitPromise;

  wasmInitPromise = new Promise((resolve, reject) => {
    let resolved = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const checkModule = () => {
      try {
        // @ts-ignore - Emscripten에서 주입하는 전역 Module 객체
        const ModuleGlobal = (globalThis as any).Module;

        console.log('Checking Module:', {
          isDefined: typeof ModuleGlobal !== 'undefined',
          hasParseText: ModuleGlobal && typeof ModuleGlobal._parseText !== 'undefined',
          moduleKeys: ModuleGlobal ? Object.keys(ModuleGlobal).slice(0, 10) : []
        });

        if (ModuleGlobal && typeof ModuleGlobal._parseText === 'function') {
          wasmModule = ModuleGlobal;
          console.log('WASM Module successfully initialized');
          resolved = true;
          clearTimeout(timeoutId);
          resolve(wasmModule);
        } else {
          setTimeout(checkModule, 100);
        }
      } catch (error) {
        console.error('Error checking module:', error);
        setTimeout(checkModule, 100);
      }
    };

    // timeout 설정 (5초)
    timeoutId = setTimeout(() => {
      if (!resolved) {
        reject(new Error('WASM module failed to load within 5 seconds'));
      }
    }, 5000);

    checkModule();
  }).catch((error) => {
    console.error('Failed to load WASM module:', error);
    wasmInitPromise = null;
    throw error;
  });

  return wasmInitPromise;
}

/**
 * 두 텍스트를 비교하여 diff 결과를 반환
 * @param text1 비교할 첫 번째 텍스트
 * @param text2 비교할 두 번째 텍스트
 * @returns DiffItem 배열
 */
export async function compareDiff(text1: string, text2: string): Promise<DiffItem[]> {
  if (!wasmModule) {
    wasmModule = await initWasm();
  }

  try {
    // WASM 함수 호출: 첫 번째 텍스트 파싱
    wasmModule.ccall('parseText', null, ['string', 'boolean'], [text1, true]);

    // WASM 함수 호출: 두 번째 텍스트 파싱
    wasmModule.ccall('parseText', null, ['string', 'boolean'], [text2, false]);

    // Diff 계산 실행
    wasmModule.ccall('runDiff', null, [], []);

    // 결과 개수 조회
    const resultCount = wasmModule.ccall('getResultCount', 'number', [], []);

    // 결과 항목 추출
    const diffResults: DiffItem[] = [];
    for (let i = 0; i < resultCount; i++) {
      const resultStr = wasmModule.ccall('getResultItem', 'string', ['number'], [i]);
      const [typeStr, ...contentParts] = resultStr.split('|');
      const type = typeStr === '0' ? 'same' : typeStr === '1' ? 'added' : 'deleted';
      const content = contentParts.join('|'); // '|'을 포함하는 내용 처리

      diffResults.push({ type, content });
    }

    return diffResults;
  } catch (error) {
    console.error('Diff comparison failed:', error);
    throw error;
  }
}

/**
 * DiffItem 배열을 HTML 형식으로 변환
 */
export function diffToHtml(diffs: DiffItem[]): string {
  return diffs
    .map((item) => {
      const escapedContent = escapeHtml(item.content);
      switch (item.type) {
        case 'same':
          return `<div class="diff-same">${escapedContent}</div>`;
        case 'added':
          return `<div class="diff-added">+ ${escapedContent}</div>`;
        case 'deleted':
          return `<div class="diff-deleted">- ${escapedContent}</div>`;
        default:
          return '';
      }
    })
    .join('');
}

/**
 * HTML 특수 문자 이스케이프
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}