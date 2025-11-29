export type WasmDiffItem = {
  op: 'equal' | 'delete' | 'insert' | 'replace';
  left: string;
  right: string;
  left_start: number;
  left_end: number;
  right_start: number;
  right_end: number;
};

export type WasmDiffResponse = {
  rows: WasmDiffItem[];
};

export type DiffLine = {
  type: 'same' | 'change' | 'add' | 'delete';
  content: string;
  lineNum: number | null;
  charStart?: number;
  charEnd?: number;
};

export type DiffPair = {
  type: 'same' | 'change' | 'add' | 'delete';
  before: DiffLine | null;
  after: DiffLine | null;
};

export const parseDiffOutput = (diffOutput: string): DiffPair[] => {
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
          },
          after: {
            type: 'change',
            content: item.right,
            lineNum: afterLineNum,
            charStart: item.right_start >= 0 ? item.right_start : undefined,
            charEnd: item.right_end >= 0 ? item.right_end : undefined,
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
