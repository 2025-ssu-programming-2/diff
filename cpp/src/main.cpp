// ------------------------------------------------------------
// Myers 알고리즘(줄 단위 diff) + 간단 문자 단위 변경 위치
// ------------------------------------------------------------
// diff_text_impl(baseText, changedText):
//   - baseText / changedText : 전체 텍스트 (줄 사이에 '\n')
//   - 반환값: JSON 문자열 (const char*)
//       {
//         "rows": [
//           {
//             "op": "equal" | "delete" | "insert" | "replace",
//             "left":  "원본 한 줄(없으면 빈 문자열)",
//             "right": "수정본 한 줄(없으면 빈 문자열)",
//             // op == "replace" 일 때만 유효 (문자 단위 변경 위치)
//             "left_start":  정수 (0 이상) 또는 -1,
//             "left_end":    정수 (0 이상) 또는 -1,  // [start, end) 구간
//             "right_start": 정수 (0 이상) 또는 -1,
//             "right_end":   정수 (0 이상) 또는 -1
//           },
//           ...
//         ]
//       }
//
//   - WASM 에서는 extern "C" 로 감싼 diff_text() 를 호출하면 됨
// ------------------------------------------------------------

#include <string>
#include <vector>
#include <unordered_map>
#include <algorithm>
#include <cstdio>   // printf

using namespace std;

// ------------------------------------------------------------
// 줄 단위 diff 결과를 담는 구조체
// ------------------------------------------------------------
struct Edit {
    char op;    // ' ' (같은 줄), '-' (삭제), '+' (추가)
    string text;
};

// ------------------------------------------------------------
// unordered_map<int, int> 에서 값 꺼내기 (없으면 기본값)
// ------------------------------------------------------------
int getOrDefault(const unordered_map<int, int>& m, int key, int defaultValue) {
    auto it = m.find(key);
    if (it == m.end()) return defaultValue;
    return it->second;
}

// ------------------------------------------------------------
// C 문자열(전체 텍스트)을 '\n' 기준으로 잘라서 줄 벡터로 변환
//   예) "Hello\nWorld" -> ["Hello", "World"]
// ------------------------------------------------------------
vector<string> splitLines(const char* text) {
    vector<string> lines;
    if (!text) {
        return lines;
    }

    string current;
    for (const char* p = text; *p != '\0'; ++p) {
        if (*p == '\n') {
            lines.push_back(current); // 지금까지 모은 글자들을 한 줄로 추가
            current.clear();
        } else {
            current.push_back(*p);
        }
    }
    // 마지막 줄 추가 (마지막에 '\n' 이 없더라도 한 줄로 취급)
    lines.push_back(current);

    return lines;
}

// ------------------------------------------------------------
// Myers 알고리즘: 두 줄 목록 a, b 에 대한 줄 단위 diff
// ------------------------------------------------------------
vector<Edit> myersDiff(const vector<string>& a, const vector<string>& b) {
    int n = static_cast<int>(a.size());
    int m = static_cast<int>(b.size());

    int maxD = n + m;
    vector<unordered_map<int, int>> trace; // 각 D에서의 V(k -> x)

    unordered_map<int, int> v;
    v[0] = 0;

    if (n == 0 && m == 0) {
        return {};
    }

    bool finished = false;
    int finalD = 0;

    for (int d = 0; d <= maxD; ++d) {
        unordered_map<int, int> newV;

        for (int k = -d; k <= d; k += 2) {
            int xStart;

            if (k == -d) {
                xStart = getOrDefault(v, k + 1, 0);         // 아래에서(삽입)
            } else if (k == d) {
                xStart = getOrDefault(v, k - 1, 0) + 1;     // 오른쪽에서(삭제)
            } else {
                int xFromRight = getOrDefault(v, k - 1, 0) + 1; // 삭제
                int xFromDown  = getOrDefault(v, k + 1, 0);     // 삽입
                xStart = (xFromRight > xFromDown) ? xFromRight : xFromDown;
            }

            int yStart = xStart - k;
            int x = xStart;
            int y = yStart;

            // "뱀(snake)" : 같은 줄이 연속되는 구간
            while (x < n && y < m && a[x] == b[y]) {
                ++x;
                ++y;
            }

            newV[k] = x;

            // 끝점(n, m)에 도달했으면 종료
            if (x >= n && y >= m) {
                finished = true;
                finalD = d;
                break;
            }
        }

        trace.push_back(newV);
        v = newV;

        if (finished) break;
    }

    // ---------- 역추적(backtracking) ----------
    int x = n;
    int y = m;
    vector<Edit> edits;

    for (int d = finalD; d > 0; --d) {
        const auto& vPrev = trace[d - 1];

        int k = x - y;
        int vPrevKm1 = getOrDefault(vPrev, k - 1, -1);
        int vPrevKp1 = getOrDefault(vPrev, k + 1, -1);

        int prevK;
        if (k == -d || (k != d && vPrevKm1 < vPrevKp1)) {
            // 아래에서 올라옴 (삽입)
            prevK = k + 1;
        } else {
            // 오른쪽에서 옴 (삭제)
            prevK = k - 1;
        }

        int xStart = getOrDefault(vPrev, prevK, 0);
        int yStart = xStart - prevK;

        // 뱀 구간: 같은 줄들
        while (x > xStart && y > yStart) {
            --x;
            --y;
            edits.push_back({' ', a[x]});
        }

        // 한 칸짜리 편집(삭제 또는 삽입)
        if (xStart < x) {
            --x;
            edits.push_back({'-', a[x]}); // 삭제
        } else if (yStart < y) {
            --y;
            edits.push_back({'+', b[y]}); // 삽입
        }
    }

    // 앞부분에 남은 같은 줄들
    while (x > 0 && y > 0) {
        --x;
        --y;
        edits.push_back({' ', a[x]});
    }

    reverse(edits.begin(), edits.end());
    return edits;
}

// ------------------------------------------------------------
// JSON 문자열에서 필요한 문자들을 이스케이프
//   - "  -> \"
//   - \  -> \\
//   - 줄바꿈, 탭 등은 \n, \t 등으로 변환
// ------------------------------------------------------------
string escapeJson(const string& s) {
    string out;
    out.reserve(s.size());

    for (char c : s) {
        switch (c) {
            case '\"': out += "\\\""; break;
            case '\\': out += "\\\\"; break;
            case '\b': out += "\\b"; break;
            case '\f': out += "\\f"; break;
            case '\n': out += "\\n"; break;
            case '\r': out += "\\r"; break;
            case '\t': out += "\\t"; break;
            default:
                out += c;
                break;
        }
    }
    return out;
}

// ------------------------------------------------------------
// 한 줄 안에서 "어디가 달라졌는지" 구간만 대략 잡는 함수
//
// 아이디어:
//   1) 앞에서부터 같은 부분은 그대로 스킵 (공통 prefix)
//   2) 뒤에서부터 같은 부분도 스킵 (공통 suffix)
//   3) 남은 가운데 부분이 "바뀐 구간"
//
// 반환:
//   left_start, left_end  : oldLine 에서 바뀐 구간 [start, end)
//   right_start, right_end: newLine 에서 바뀐 구간 [start, end)
// ------------------------------------------------------------
void computeChangeRange(const string& oldLine, const string& newLine,
                        int& left_start, int& left_end,
                        int& right_start, int& right_end) {
    size_t n = oldLine.size();
    size_t m = newLine.size();

    size_t start = 0;
    while (start < n && start < m && oldLine[start] == newLine[start]) {
        ++start;
    }

    size_t endOld = n;
    size_t endNew = m;
    while (endOld > start && endNew > start &&
           oldLine[endOld - 1] == newLine[endNew - 1]) {
        --endOld;
        --endNew;
    }

    left_start  = static_cast<int>(start);
    left_end    = static_cast<int>(endOld);
    right_start = static_cast<int>(start);
    right_end   = static_cast<int>(endNew);
}

// ------------------------------------------------------------
// 실제 diff 로직: baseText / changedText 를 받아 JSON 문자열 생성
// ------------------------------------------------------------
const char* diff_text_impl(const char* baseText, const char* changedText) {
    // 1) C 문자열을 줄 벡터로 변환
    vector<string> baseLines    = splitLines(baseText);
    vector<string> changedLines = splitLines(changedText);

    // 2) Myers 알고리즘으로 줄 단위 diff
    vector<Edit> edits = myersDiff(baseLines, changedLines);

    // 3) JSON 문자열 만들기
    //    static 으로 만들어야, 함수가 끝난 뒤에도 포인터가 유효함
    static string result;
    result.clear();

    result += "{\n  \"rows\": [\n";

    bool firstRow = true;

    for (size_t i = 0; i < edits.size(); ++i) {
        const Edit& e = edits[i];

        string opName;     // "equal", "delete", "insert", "replace"
        string leftText;   // 기준 텍스트 한 줄
        string rightText;  // 변경 텍스트 한 줄

        int leftStart  = -1;
        int leftEnd    = -1;
        int rightStart = -1;
        int rightEnd   = -1;

        if (e.op == ' ') {
            // 양쪽에 같은 줄
            opName   = "equal";
            leftText = e.text;
            rightText = e.text;
        } else if (e.op == '-') {
            // 삭제된 줄. 바로 뒤에 '+' 가 있으면 "수정된 줄"로 취급
            if (i + 1 < edits.size() && edits[i + 1].op == '+') {
                opName   = "replace";
                leftText = e.text;
                rightText = edits[i + 1].text;

                // 한 줄 안에서 어디가 바뀌었는지 대략적인 구간 계산
                computeChangeRange(leftText, rightText,
                                   leftStart, leftEnd,
                                   rightStart, rightEnd);

                // 다음 '+' 항목은 이미 처리했으므로 건너뛰기
                ++i;
            } else {
                opName   = "delete";
                leftText = e.text;
                rightText = ""; // 오른쪽에는 해당 줄 없음
            }
        } else if (e.op == '+') {
            // 추가된 줄
            opName   = "insert";
            leftText = "";          // 왼쪽에는 해당 줄 없음
            rightText = e.text;
        }

        if (!firstRow) {
            result += ",\n";
        }
        firstRow = false;

        string leftEsc  = escapeJson(leftText);
        string rightEsc = escapeJson(rightText);

        // 한 줄(row)을 JSON 객체로 추가
        result += "    {";
        result += "\"op\":\"" + opName + "\",";
        result += "\"left\":\"" + leftEsc + "\",";
        result += "\"right\":\"" + rightEsc + "\",";
        result += "\"left_start\":" + to_string(leftStart) + ",";
        result += "\"left_end\":"   + to_string(leftEnd) + ",";
        result += "\"right_start\":" + to_string(rightStart) + ",";
        result += "\"right_end\":"   + to_string(rightEnd);
        result += "}";
    }

    result += "\n  ]\n}";

    // result.c_str() 는 static string 이라 diff_text_impl 이 끝나도 유효
    return result.c_str();
}

// ------------------------------------------------------------
// WASM에서 호출할 함수 (C 스타일 이름)
//   - 실제 로직은 diff_text_impl 에 있음
// ------------------------------------------------------------
extern "C" {
    const char* diff_text(const char* baseText, const char* changedText) {
        return diff_text_impl(baseText, changedText);
    }
}

// ------------------------------------------------------------
// 테스트용 main (네이티브에서 실행 시)
//   WASM 빌드할 때는 이 main 은 빼고 컴파일하면 됨
// ------------------------------------------------------------
int main() {
    printf("===== Test 1: Simple Addition =====\n");
    const char* base1 = "Hello\nWorld";
    const char* changed1 = "Hello\nHappy\nWorld";

    const char* result1 = diff_text_impl(base1, changed1);
    printf("Base:\n%s\n\n", base1);
    printf("Changed:\n%s\n\n", changed1);
    printf("Diff Result:\n%s\n\n", result1);

    printf("===== Test 2: Line Deletion =====\n");
    const char* base2 = "Line1\nLine2\nLine3\nLine4";
    const char* changed2 = "Line1\nLine3\nLine4";

    const char* result2 = diff_text_impl(base2, changed2);
    printf("Base:\n%s\n\n", base2);
    printf("Changed:\n%s\n\n", changed2);
    printf("Diff Result:\n%s\n\n", result2);

    printf("===== Test 3: Mixed Changes =====\n");
    const char* base3 = "First\nSecond\nThird";
    const char* changed3 = "First\nSecond Modified\nThird\nFourth";

    const char* result3 = diff_text_impl(base3, changed3);
    printf("Base:\n%s\n\n", base3);
    printf("Changed:\n%s\n\n", changed3);
    printf("Diff Result:\n%s\n\n", result3);

    printf("===== Test 4: Completely Different =====\n");
    const char* base4 = "Old Content\nOld Line 2";
    const char* changed4 = "New Content\nNew Line 2\nNew Line 3";

    const char* result4 = diff_text_impl(base4, changed4);
    printf("Base:\n%s\n\n", base4);
    printf("Changed:\n%s\n\n", changed4);
    printf("Diff Result:\n%s\n\n", result4);

    return 0;
}
