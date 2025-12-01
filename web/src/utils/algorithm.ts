import type { WasmDiffResponse, WasmDiffItem, WordToken } from '@/utils/diff';

// ------------------------------------------------------------
// 줄 단위 diff 결과를 담는 구조체
// ------------------------------------------------------------
interface Edit {
  op: ' ' | '-' | '+'; // ' ' (equal), '-' (delete), '+' (insert)
  text: string;
}

// ------------------------------------------------------------
// 문자열을 '\n' 기준으로 잘라서 줄 배열로 변환
// ------------------------------------------------------------
function splitLines(text: string): string[] {
  if (!text) {
    return [];
  }
  // C++ splitLines logic: splits by \n, keeps accumulating.
  // However, JS split('\n') is slightly different regarding trailing newlines compared to the C++ manual loop.
  // The C++ loop:
  // "A\nB" -> ["A", "B"]
  // "A\nB\n" -> ["A", "B", ""]
  // Let's match the C++ logic exactly.
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

// ------------------------------------------------------------
// Myers 알고리즘: 줄 단위 diff
// ------------------------------------------------------------
function myersDiff(a: string[], b: string[]): Edit[] {
  const n = a.length;
  const m = b.length;
  const maxD = n + m;

  // trace stores the 'v' map for each 'd'.
  // v maps k to x.
  const trace: Array<Map<number, number>> = [];

  let v = new Map<number, number>();
  v.set(0, 0);

  if (n === 0 && m === 0) {
    return [];
  }

  let finished = false;
  let finalD = 0;

  for (let d = 0; d <= maxD; d++) {
    const newV = new Map<number, number>();

    // k loops from -d to d step 2
    for (let k = -d; k <= d; k += 2) {
      let xStart: number;

      // The logic:
      // if k == -d, we must have come from k+1 (down/insert)
      // if k == d, we must have come from k-1 (right/delete)
      // otherwise, pick max of k-1 (right) and k+1 (down)

      // Note: In C++, getOrDefault returns 0 if not found.
      // Here, we use `v.get(...) ?? 0`.

      if (k === -d) {
        xStart = v.get(k + 1) ?? 0;
      } else if (k === d) {
        xStart = (v.get(k - 1) ?? 0) + 1;
      } else {
        const xFromRight = (v.get(k - 1) ?? 0) + 1;
        const xFromDown = v.get(k + 1) ?? 0;
        xStart = xFromRight > xFromDown ? xFromRight : xFromDown;
      }

      const yStart = xStart - k;
      let x = xStart;
      let y = yStart;

      // Snake: skip equal lines
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }

      newV.set(k, x);

      if (x >= n && y >= m) {
        finished = true;
        finalD = d;
        break;
      }
    }

    trace.push(newV);
    v = newV;

    if (finished) break;
  }

  // Backtracking
  let x = n;
  let y = m;
  const edits: Edit[] = [];

  for (let d = finalD; d > 0; d--) {
    const vPrev = trace[d - 1];
    const k = x - y;

    // Retrieve previous k values (default to -1 if not found, though usually should exist or logic handles it)
    // In C++: getOrDefault(vPrev, k - 1, -1);
    const vPrevKm1 = vPrev.get(k - 1) ?? -1;
    const vPrevKp1 = vPrev.get(k + 1) ?? -1;

    let prevK: number;
    if (k === -d || (k !== d && vPrevKm1 < vPrevKp1)) {
      prevK = k + 1; // Down (Insert)
    } else {
      prevK = k - 1; // Right (Delete)
    }

    const xStart = vPrev.get(prevK) ?? 0;
    const yStart = xStart - prevK;

    // Snake (equal lines)
    while (x > xStart && y > yStart) {
      x--;
      y--;
      edits.push({ op: ' ', text: a[x] });
    }

    // Single step edit
    if (xStart < x) {
      x--;
      edits.push({ op: '-', text: a[x] }); // Delete
    } else if (yStart < y) {
      y--;
      edits.push({ op: '+', text: b[y] }); // Insert
    }
  }

  // Remaining snake at the beginning
  while (x > 0 && y > 0) {
    x--;
    y--;
    edits.push({ op: ' ', text: a[x] });
  }

  return edits.reverse();
}

// ------------------------------------------------------------
// 공백(스페이스) 기준으로 "단어"들을 잘라내는 함수
// ------------------------------------------------------------
function splitWordsBySpace(line: string): string[] {
  const result: string[] = [];
  let word = '';

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === ' ') {
      if (word.length > 0) {
        result.push(word);
        word = '';
      }
    } else {
      word += c;
    }
  }
  if (word.length > 0) {
    result.push(word);
  }
  return result;
}

// ------------------------------------------------------------
// 한 줄(oldLine, newLine)에 대해 "단어 단위 diff" 를 계산
// ------------------------------------------------------------
function makeWordTokens(oldLine: string, newLine: string): WordToken[] {
  const a = splitWordsBySpace(oldLine);
  const b = splitWordsBySpace(newLine);

  const n = a.length;
  const m = b.length;

  // LCS DP
  // dp[i][j]
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack
  let i = n;
  let j = m;
  const revTokens: WordToken[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      revTokens.push({ op: 'equal', left: a[i - 1], right: b[j - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      // Insert (only in right)
      revTokens.push({ op: 'insert', left: '', right: b[j - 1] });
      j--;
    } else if (i > 0) {
      // Delete (only in left)
      revTokens.push({ op: 'delete', left: a[i - 1], right: '' });
      i--;
    }
  }

  return revTokens.reverse();
}

// ------------------------------------------------------------
// 메인 JS diff 함수
// ------------------------------------------------------------
export function diffTextJs(baseText: string, changedText: string): WasmDiffResponse {
  const baseLines = splitLines(baseText);
  const changedLines = splitLines(changedText);

  const edits = myersDiff(baseLines, changedLines);

  const resultRows: WasmDiffItem[] = [];

  for (let i = 0; i < edits.length; i++) {
    const e = edits[i];

    if (e.op === ' ') {
      resultRows.push({
        op: 'equal',
        left: e.text,
        right: e.text,
        left_start: -1,
        left_end: -1,
        right_start: -1,
        right_end: -1,
        tokens: [],
      });
    } else if (e.op === '-') {
      // Check if next is '+'
      if (i + 1 < edits.length && edits[i + 1].op === '+') {
        const nextE = edits[i + 1];
        const tokens = makeWordTokens(e.text, nextE.text);

        resultRows.push({
          op: 'replace',
          left: e.text,
          right: nextE.text,
          left_start: -1,
          left_end: -1,
          right_start: -1,
          right_end: -1,
          tokens: tokens,
        });
        i++; // Skip next
      } else {
        resultRows.push({
          op: 'delete',
          left: e.text,
          right: '',
          left_start: -1,
          left_end: -1,
          right_start: -1,
          right_end: -1,
          tokens: [],
        });
      }
    } else if (e.op === '+') {
      resultRows.push({
        op: 'insert',
        left: '',
        right: e.text,
        left_start: -1,
        left_end: -1,
        right_start: -1,
        right_end: -1,
        tokens: [],
      });
    }
  }

  return { rows: resultRows };
}
