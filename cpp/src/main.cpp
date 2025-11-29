// ------------------------------------------------------------
// Myers 알고리즘(줄 단위 diff) + "띄어쓰기 기준 단어 단위 diff"
// ------------------------------------------------------------
// diff_text_impl(baseText, changedText):
//
// {
//   "rows": [
//     {
//       "op": "equal",
//       "left": "Hello",
//       "right": "Hello"
//     },
//     {
//       "op": "insert",
//       "left": "",
//       "right": "Happy"
//     },
//     {
//       "op": "equal",
//       "left": "World",
//       "right": "World"
//     },
//     {
//       "op": "replace",
//       "left": "Second",
//       "right": "Second Modified",
//       "tokens": [
//         {"op": "equal",  "left": "Second",  "right": "Second"},
//         {"op": "insert", "left": "",        "right": "Modified"}
//       ]
//     }
//   ]
// }
//
//   - WASM 에서는 extern "C" 로 감싼 diff_text() 를 호출하면 됨
// ------------------------------------------------------------

#include <string>
#include <vector>
#include <unordered_map>
#include <algorithm>

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
// Myers 알고리즘: 줄 단위 diff
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
// 공백(스페이스) 기준으로 "단어"들을 잘라내는 함수
//   "Second Modified" -> ["Second", "Modified"]
// ------------------------------------------------------------
vector<string> splitWordsBySpace(const string& line) {
    vector<string> result;
    string word;

    for (char c : line) {
        if (c == ' ') {
            if (!word.empty()) {
                result.push_back(word);
                word.clear();
            }
        } else {
            word.push_back(c);
        }
    }

    if (!word.empty()) {
        result.push_back(word);
    }
    return result;
}

// 단어 단위 정렬 정보를 담는 구조체
struct AlignedToken {
    string left;   // 기준 텍스트쪽 단어 (없으면 "")
    string right;  // 변경 텍스트쪽 단어 (없으면 "")
    char op;       // 'M' = match(equal), 'D' = delete(left만), 'I' = insert(right만)
};

// ------------------------------------------------------------
// 한 줄(oldLine, newLine)에 대해 "단어 단위 diff" 를 계산해서
// JSON 배열 형태의 문자열을 만드는 함수
//
// 예)
//   oldLine = "Second"
//   newLine = "Second Modified"
// -> tokens:
//   [
//     {"op":"equal",  "left":"Second", "right":"Second"},
//     {"op":"insert", "left":"",       "right":"Modified"}
//   ]
// ------------------------------------------------------------
string makeWordTokensJSON(const string& oldLine, const string& newLine) {
    vector<string> a = splitWordsBySpace(oldLine);
    vector<string> b = splitWordsBySpace(newLine);

    int n = static_cast<int>(a.size());
    int m = static_cast<int>(b.size());

    // LCS DP: dp[i][j] = a[0..i-1], b[0..j-1] 의 최장 공통 부분 수열 길이
    vector<vector<int>> dp(n + 1, vector<int>(m + 1, 0));

    for (int i = 1; i <= n; ++i) {
        for (int j = 1; j <= m; ++j) {
            if (a[i - 1] == b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = (dp[i - 1][j] > dp[i][j - 1]) ? dp[i - 1][j] : dp[i][j - 1];
            }
        }
    }

    // backtrack 하면서 정렬된 토큰 시퀀스 만들기
    int i = n;
    int j = m;
    vector<AlignedToken> revTokens;

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && a[i - 1] == b[j - 1]) {
            // 같은 단어
            revTokens.push_back({a[i - 1], b[j - 1], 'M'});
            --i; --j;
        } else if (j > 0 && (i == 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            // 오른쪽(새 텍스트)에만 있는 단어 (삽입)
            revTokens.push_back({"", b[j - 1], 'I'});
            --j;
        } else if (i > 0) {
            // 왼쪽(기준 텍스트)에만 있는 단어 (삭제)
            revTokens.push_back({a[i - 1], "", 'D'});
            --i;
        }
    }

    reverse(revTokens.begin(), revTokens.end());

    // JSON 배열 만들기
    string json = "[";
    bool first = true;
    for (const auto& t : revTokens) {
        if (!first) json += ",";
        first = false;

        string opStr;
        if (t.op == 'M') opStr = "equal";
        else if (t.op == 'D') opStr = "delete";
        else opStr = "insert";

        json += "{";
        json += "\"op\":\"" + opStr + "\",";
        json += "\"left\":\"" + escapeJson(t.left) + "\",";
        json += "\"right\":\"" + escapeJson(t.right) + "\"";
        json += "}";
    }
    json += "]";
    return json;
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
        bool hasTokens = false;
        string tokensJson;

        if (e.op == ' ') {
            // 공통 줄
            opName   = "equal";
            leftText = e.text;
            rightText = e.text;
        } else if (e.op == '-') {
            // 삭제된 줄. 바로 뒤에 '+' 가 있으면 "수정된 줄"로 취급
            if (i + 1 < edits.size() && edits[i + 1].op == '+') {
                opName   = "replace";
                leftText = e.text;
                rightText = edits[i + 1].text;

                // 띄어쓰기 기준 단어 단위 diff
                tokensJson = makeWordTokensJSON(leftText, rightText);
                hasTokens = true;

                ++i; // 다음 '+' 항목은 이미 처리했으므로 건너뛰기
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
        result += "\"right\":\"" + rightEsc + "\"";

        // replace 인 경우에만 단어 단위 토큰 정보 추가
        if (hasTokens) {
            result += ",\"tokens\":" + tokensJson;
        }

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
