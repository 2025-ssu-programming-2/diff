# Diff 프로그램 사용 가이드

## 프로그램 소개

이 프로젝트는 **LCS(Longest Common Subsequence) 알고리즘**을 사용하여 두 텍스트 파일의 차이를 빠르게 검출하는 프로그램입니다.

C++로 개발된 고성능 알고리즘을 WASM(WebAssembly)으로 컴파일하여 웹 브라우저에서 실행할 수 있습니다.

## 알고리즘 설명

### LCS (Longest Common Subsequence)
- **시간복잡도**: O(m × n) - m, n은 각 파일의 줄 수
- **공간복잡도**: O(m × n)
- 동적 프로그래밍으로 구현된 최적 알고리즘
- 두 시퀀스의 최장 공통 부분 수열을 찾음

### Diff 결과 유형
- **0**: `same` - 변경되지 않은 라인 (동일)
- **1**: `added` - 추가된 라인 (+ 표시)
- **2**: `deleted` - 삭제된 라인 (- 표시)

## 빌드 및 실행

### 사전 요구사항

- **C++ Compiler**: g++ 또는 clang
- **Emscripten**: WASM 컴파일용 (포함됨)
- **Node.js/npm**: 웹 빌드용
- **Python**: HTTP 서버용 (선택사항)

### 1단계: C++ 빌드

```bash
# macOS / Linux
./build.sh

# Windows (PowerShell)
.\build.ps1
```

빌드 결과:
- `web/dist/main.js` - Emscripten 런타임
- `web/dist/main.wasm` - WebAssembly 바이너리

### 2단계: 웹 빌드

```bash
cd web
npm install
npm run build
```

빌드 결과:
- `dist/` 디렉토리에 최적화된 웹 파일들 생성

### 3단계: 웹 서버 실행

```bash
# Python 내장 HTTP 서버 (포트 8080)
python -m http.server -d web/dist/ 8080

# 또는
cd web/dist
python -m http.server 8080
```

### 4단계: 브라우저에서 접속

```
http://localhost:8080/
```

## 사용 방법

### 웹 인터페이스

1. **파일 선택**: 비교할 두 개의 텍스트 파일을 업로드
   - 첫 번째 파일: 원본 파일
   - 두 번째 파일: 비교할 파일

2. **비교 시작**: "비교 시작!" 버튼 클릭

3. **결과 확인**: 색상으로 구분된 diff 결과 보기
   - 🔴 **빨간색 (deleted)**: 삭제된 라인
   - 🟢 **초록색 (added)**: 추가된 라인
   - ⚫ **회색 (same)**: 동일한 라인

### 테스트 페이지

테스트를 위한 간단한 WASM 테스트 페이지도 제공됩니다:

```
http://localhost:8080/test.html
```

이 페이지는 자동으로 WASM 모듈을 로드하고 샘플 텍스트를 비교합니다.

## 개발 정보

### 파일 구조

```
diff/
├── cpp/
│   ├── src/
│   │   └── main.cpp           # C++ Diff 엔진
│   └── CMakeLists.txt
├── web/
│   ├── src/
│   │   ├── pages/
│   │   │   └── index.tsx       # 메인 페이지
│   │   └── utils/
│   │       └── diff.ts         # WASM 래퍼
│   ├── dist/                   # 빌드 결과
│   ├── index.html              # HTML 템플릿
│   └── package.json
├── .env                        # 빌드 환경 설정
├── build.sh                    # 빌드 스크립트 (macOS/Linux)
└── build.ps1                   # 빌드 스크립트 (Windows)
```

### 핵심 컴포넌트

#### C++ 부분 (`cpp/src/main.cpp`)

```cpp
class DiffEngine {
  // 텍스트를 줄 단위로 저장
  std::vector<std::string> text1, text2;

  // LCS 계산용 DP 테이블
  std::vector<std::vector<int>> dp;

  // 주요 메서드
  void computeLCS();           // DP 테이블 계산
  std::vector<DiffResult> backtrace(); // 역추적
};

// JavaScript에서 호출 가능한 함수들
void parseText(const char* text, bool isFirstText);  // 텍스트 파싱
void runDiff();                                       // Diff 실행
int getResultCount();                                 // 결과 개수
const char* getResultItem(int index);                 // 결과 항목
```

#### JavaScript 부분 (`web/src/utils/diff.ts`)

```typescript
// WASM 모듈 초기화
async function initWasm(): Promise<any>

// 두 텍스트 비교
async function compareDiff(text1: string, text2: string): Promise<DiffItem[]>

// 타입 정의
interface DiffItem {
  type: 'same' | 'added' | 'deleted';
  content: string;
}
```

### 빌드 환경 설정

`.env` 파일에서 WASM에 export할 함수를 지정합니다:

```bash
EXPORTED_FUNCTIONS=["_test_console","_parseText","_runDiff","_getResultCount","_getResultItem"]
EXPORTED_RUNTIME_METHODS=["ccall"]
```

## 테스트

### C++ 직접 테스트

```bash
g++ -std=c++17 test-diff.cpp -o test-diff
./test-diff file1.txt file2.txt
```

출력 예:
```
Total lines: 6

=== Diff Results ===
  Hello World
- This is a test
+ This is modified
  Diff algorithm
  Line 4
+ New line 5
```

### WASM 테스트

브라우저에서 다음 URL에 접속:
```
http://localhost:8080/test.html
```

자동으로 샘플 텍스트를 비교하고 결과를 표시합니다.

## 성능 최적화

### 현재 구현
- **LCS 기반**: 최적의 diff 결과를 보장
- **동적 프로그래밍**: O(m×n) 시간에 계산
- **WASM 컴파일**: 네이티브에 가까운 성능

### 개선 가능 영역
1. **메모리 최적화**: DP 테이블 공간을 O(m) 또는 O(n)으로 축소
2. **알고리즘 개선**: Myers' diff algorithm으로 변경
3. **병렬화**: 멀티스레드로 대용량 파일 처리 가속
4. **증분 처리**: 스트리밍 방식으로 대용량 파일 처리

## 제한사항

- **파일 크기**: 메모리에 따라 제한됨 (일반적으로 MB 단위)
- **줄 길이**: 매우 긴 줄(>1MB)은 성능 저하 가능
- **인코딩**: UTF-8 권장
- **줄 끝**: LF/CRLF 모두 지원

## 문제 해결

### WASM 모듈 로드 오류

**에러**: `Cannot read properties of undefined (reading '_ccall')`

**해결방법**:
1. `main.js`가 `index.html`에서 React 스크립트보다 먼저 로드되는지 확인
2. 브라우저 콘솔에서 `typeof Module`을 확인 (undefined가 아니어야 함)
3. 서버에서 HTTP 헤더가 올바른지 확인 (`Content-Type: application/javascript`)

### 빌드 오류

**에러**: `emscripten not found`

**해결방법**:
```bash
# Emscripten 설치
brew install emscripten  # macOS

# 또는 emsdk 직접 설치
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source emsdk_env.sh
```

## 참고 자료

- [LCS 알고리즘](https://en.wikipedia.org/wiki/Longest_common_subsequence)
- [Emscripten 문서](https://emscripten.org/)
- [WebAssembly](https://webassembly.org/)
- [Git Diff 알고리즘](https://www.gnu.org/software/diffutils/manual/html_node/diff-History.html)

## 라이선스

MIT License (프로젝트의 라이선스에 따름)

## 기여

버그 리포트 및 개선 제안은 GitHub Issues를 통해 해주세요.