# diff
[![Netlify Status](https://api.netlify.com/api/v1/badges/ea2c8d19-0f56-4256-81f2-a7dfeef9807a/deploy-status)](https://app.netlify.com/projects/ssu-diff/deploys)

## 프로젝트 개요 및 주요기능
### 개요
이 프로젝트는 숭실대학교 미디어경영학과 2025년 2학기 프로그래밍2 수업의 기말고사 프로젝트입니다. <br />
C++, WASM을 사용하여 고속으로 대용량 텍스트 파일의 다른 부분(diff)를 찾아내어 보기좋게 제공합니다.
### 주요기능
1. **Myers 알고리즘 기반 Diff 연산**
   - 줄 단위 비교: 두 텍스트 파일 간의 추가/삭제/수정된 라인을 탐지
   - 단어 단위 비교: 수정된 줄 내에서 LCS(최장 공통 부분 수열)를 활용하여 변경된 단어를 세밀하게 하이라이팅

2. **WebAssembly(WASM) 기반 고속 처리**
   - C++로 작성된 diff 로직을 Emscripten으로 WASM 컴파일
   - 브라우저에서 네이티브에 가까운 성능으로 대용량 파일 비교 가능

3. **JavaScript 구현 및 성능 비교**
   - 동일한 Myers 알고리즘의 JavaScript 버전 제공
   - C++(WASM) vs JavaScript 수행 시간 비교 기능

4. **대용량 파일 스트리밍 처리**
   - 500줄 단위 청크로 분할하여 메모리 효율적 처리
   - 진행률 표시로 처리 상태 확인
   - UI 반응성을 유지하며 백그라운드 처리

5. **직관적인 웹 UI/UX**
   - 드래그 앤 드롭 방식의 파일 업로드
   - Side-by-side 비교 뷰 (Base vs Compare)
   - 색상으로 구분된 변경사항 (추가: 초록, 삭제: 빨강, 수정: 노랑)
   - 동일 라인 접기/펼치기 기능으로 변경사항에 집중
   - 가상화된 렌더링으로 대용량 결과도 부드럽게 표시

## 팀: "차이점"
- 최강재, 팀장
- 류현서
- 임소연

## 환경설정
### emsdk 설치
**표준 설치 방법**
1. `emsdk` repository 복제
```shell
$ git clone https://github.com/emscripten-core/emsdk.git
$ cd emsdk
```
2. `emsdk` 최신 버전 설치
```shell
$ ./emsdk install latest
```
3. `emsdk` 활성화
```shell
$ ./emsdk activate latest
```
4. 현재 Shell에서 `emsdk` 환경변수 설정
```shell
$ source ./emsdk_env.sh # for Linux, macOS
$ emsdk_env.bat # for Windows
```

**macOS(homebrew)**
```shell
$ brew install emscripten
```

### Bun.js(Web Runtime) 설치
**Windows(PowerShell)**
```shell
$ powershell -c "irm bun.sh/install.ps1 | iex"
```

**macOS**
```shell
$ curl -fsSL https://bun.sh/install | bash
```

### (선택) CMake 설치
**Windows(PowerShell)**
```shell
$ winget install Kitware.CMake
```

**macOS(homebrew)**
```shell
$ brew install cmake
```

## 빌드 및 실행
### .env 작성
프로젝트 환경 변수를 `.env`에서 관리하고 있습니다. <br />
`.env`내 환경 변수를 작성해주세요.

```shell
EXPORTED_FUNCTIONS=["_example_function"] # 공개할 함수를 작성
EXPORTED_RUNTIME_METHODS=["ccall"] # Runtime에서 사용할 Method를 작성
```

### C++ 코드 빌드
**Windows(PowerShell)**
```shell
# 단독 실행
$ .\build.ps1
```

**Linux / macOS**
```shell
$ ./build.sh
$ sh build.sh
```

**CLion IDE** <br />
보통 CLion과 같은 IDE(통합개발환경)를 설치하여 사용하면 `CMake`와 같은 빌드 도구들이 같이 설치되고 활용됩니다.
1. Project 열기
2. `cmake-build-debug`폴더가 생겼는지 확인, 없다면 로딩 대기
3. 우측 상단 `Build`(망치 아이콘) 클릭
   1. ![build](./docs/build.png)
   2. ![hammer](./docs/hammer.png)
4. `Build` 성공 확인. `public/` 하위에 `main.js`, `main.wasm`파일이 생겨야 합니다.
![build_result](./docs/build-result.png)

### Web 환경설정 및 코드 빌드
1. `web/` 으로 이동해주세요.
```
$ cd web
```
2. 의존성 패키지를 설치해주세요.
```shell
$ bun install
```
3. 빌드
dist/ 이름으로 빌드 결과가 생성됩니다. <br />
자동으로 post-build.ts 코드가 실행됩니다. ROOT로 빌드의 결과를 복사합니다.
```shell
$ bun run build 
# rolldown-vite v7.2.2 building client environment for production...
# ✓ 1714 modules transformed.
# dist/index.html                 0.68 kB │ gzip:  0.43 kB
# dist/assets/index-bFXQOtsH.css  34.90 kB │ gzip:  7.60 kB
# dist/assets/index-CTF6wdsv.js   261.75 kB │ gzip: 82.02 kB
# ✓ built in 179ms
# Start 'post-build' process...
# Copy ./dist to /.diff-app...
# Done!
```

### 실행
`8080`Port로 Serving됩니다. <br />
```shell
$ bun dev # or bun run dev
# ROLLDOWN-VITE v7.2.2  ready in 198 ms
#
# ➜  Local:   http://localhost:3000/
# ➜  Network: use --host to expose
# ➜  press h + enter to show help
```

### 결과
[/.diff-app](https://github.com/2025-ssu-programming-2/diff/tree/develop/.diff-app) 에서 빌드 결과를 확인하실 수 있습니다.

## 역할 분담
- 최강재(팀장)
  - diff 서브 로직 개발
  - C++ ↔ JS간 통신 로직 구성 및 개발, JS 로직 개발
  - 버전 관리
  - 인프라 관리
  - CI/CD 설계 및 개발
  - Web UI/UX 개발
- 류현서(팀원)
  - diff 메인 로직 개발
  - diff 프로젝트 의존성 관리
  - diff 프로젝트 테스트 개발
- 임소연(팀원)
  - diff 메인 로직 개발
  - 발표자료 구성 및 작성
  - C++ ↔ JS간 Report 구성 및 테스트

## 개발 중 어려웠던 점과 해결 방법

### 1. 대용량 파일 처리 시 메모리 부족 및 브라우저 응답 불가 문제
#### 문제 상황
초기 개발 단계에서 50MB 이상의 대용량 텍스트 파일을 업로드하여 diff 연산을 수행할 경우, 브라우저의 메모리 사용량이 급격히 증가하여 **메모리 부족(Out of Memory)** 오류가 발생하거나, 연산 중 **브라우저가 응답하지 않는(Unresponsive)** 현상이 빈번하게 발생하였습니다. 이는 전체 파일을 메모리에 한 번에 로드하고 diff 연산을 단일 작업으로 처리했기 때문입니다.

#### 해결 방법: 청크(Chunk) 기반 스트리밍 처리
이 문제를 해결하기 위해 **청크 단위 분할 처리 기법**을 도입하였습니다. 구체적인 구현 내용은 다음과 같습니다:

1. **텍스트 분할**: 입력된 텍스트 파일을 500줄 단위의 청크로 분할합니다.
2. **순차적 비동기 처리**: 각 청크에 대해 diff 연산을 순차적으로 수행하되, `setTimeout`을 활용한 이벤트 루프 양보(yield)를 통해 브라우저의 UI 반응성을 유지합니다.
3. **결과 병합**: 각 청크의 diff 결과를 순서대로 병합하여 최종 결과를 생성합니다.
4. **진행률 표시**: 사용자에게 현재 처리 상태를 실시간으로 표시하여 UX를 개선합니다.

```typescript
// 청크 설정: 500줄 단위로 분할하여 메모리 효율적 처리
export const CHUNK_SIZE_LINES = 500;

// 이벤트 루프 양보를 통한 UI 반응성 유지
function yieldToMain(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
```

이 방식을 통해 대용량 파일도 안정적으로 처리할 수 있게 되었으며, 처리 중에도 사용자가 UI와 상호작용할 수 있는 환경을 구축하였습니다.

---

### 2. C++ 코드의 WASM 빌드와 JavaScript 연동의 복잡성
#### 문제 상황
본 프로젝트는 고성능 diff 연산을 위해 C++로 작성된 Myers 알고리즘을 **Emscripten**을 통해 WebAssembly(WASM)로 컴파일하여 사용합니다. 그러나 개발 과정에서 다음과 같은 어려움이 있었습니다:

1. C++ 소스 코드 수정 후 매번 Emscripten으로 WASM 빌드를 수행해야 함
2. 빌드 결과물(`main.js`, `main.wasm`)을 웹 프로젝트의 `public/` 디렉토리로 수동 복사해야 함
3. React+Vite 기반의 프론트엔드 애플리케이션에서 WASM 모듈을 `<script>` 태그로 로드하고, 전역 객체(`window.Module`)를 통해 함수를 호출해야 하는 번거로움

이러한 반복적인 수작업은 개발 생산성을 저하시키고, 실수로 인한 빌드 오류를 유발할 가능성이 높았습니다.

#### 해결 방법: 자동화된 빌드 스크립트 구성
이 문제를 해결하기 위해 **Shell 스크립트(`build.sh`)**를 작성하여 전체 빌드 과정을 자동화하였습니다:

**1단계: C++ → WASM 빌드 (`build.sh`)**
CLI 환경에서 아래 명령어 하나로 Emscripten 빌드가 수행되며, 결과물이 자동으로 `web/public/` 디렉토리에 생성됩니다:

```bash
$ sh build.sh
```

내부적으로는 다음과 같은 Emscripten 빌드 명령이 실행됩니다:
```bash
emcc cpp/src/main.cpp -o web/public/main.js \
  -s EXPORTED_FUNCTIONS="[\"_diff_text\",\"_malloc\",\"_free\"]" \
  -s EXPORTED_RUNTIME_METHODS="[\"ccall\",\"cwrap\",\"allocateUTF8\",\"UTF8ToString\"]" \
  -s ALLOW_MEMORY_GROWTH=1
```

`build.sh` 스크립트의 주요 기능은 다음과 같습니다:
- **환경 변수 로드**: `.env` 파일에서 빌드 설정을 읽어 유연한 구성 가능
- **진행률 표시**: 빌드 진행 상황을 시각적으로 표시하여 개발자 경험 향상
- **크로스 플랫폼 지원**: Windows(`build.ps1`)와 Unix 계열(`build.sh`) 모두 지원

**2단계: 웹 애플리케이션 빌드 및 배포 준비 (`bun run build`)**
웹 프로젝트 빌드 시, `post-build.ts` 스크립트가 자동으로 실행되어 빌드 결과물을 프로젝트 루트로 복사합니다:
```bash
$ cd web
$ bun run build
```

`package.json`의 build 스크립트는 다음과 같이 구성되어 있습니다:
```json
{
  "scripts": {
    "build": "tsc -b && vite build && bun post-build.ts"
  }
}
```

빌드 과정은 순차적으로 진행됩니다:
1. **TypeScript 컴파일** (`tsc -b`): 타입 검사 및 컴파일 수행
2. **Vite 빌드** (`vite build`): 프로덕션용 번들링 수행, `dist/` 디렉토리에 결과 생성
3. **Post-build 처리** (`bun post-build.ts`): `dist/` 디렉토리를 프로젝트 루트의 `/.diff-app/` 디렉토리로 복사

이러한 자동화된 빌드 파이프라인을 통해 개발자는 복잡한 빌드 과정을 신경 쓰지 않고, 단 두 개의 명령어(`sh build.sh` → `bun run build`)만으로 C++ 코드 수정부터 배포 가능한 웹 애플리케이션 생성까지의 전 과정을 완료할 수 있습니다.

## 성능 최적화 시도
### 1. 대용량 Diff 결과의 UI 렌더링 최적화
#### 문제 상황
35만 줄에 달하는 대용량 텍스트 파일의 diff 결과를 한 번에 DOM에 렌더링하려고 시도했을 때, 브라우저가 심각하게 버벅이거나 완전히 멈추는 현상이 발생하였습니다. 이는 React가 수십만 개의 DOM 노드를 한꺼번에 생성하고 관리해야 하기 때문입니다.

#### 해결 방법: 점진적 로딩 및 가상화 기법 적용
이 문제를 해결하기 위해 다음과 같은 최적화 기법들을 적용하였습니다:

**1. 점진적 로딩 (Incremental Loading)**
한 번에 모든 데이터를 렌더링하지 않고, 초기에는 500줄만 표시한 후 사용자가 "더 보기" 버튼을 클릭할 때마다 300줄씩 추가로 로드합니다:

```typescript
// 한 번에 렌더링할 최대 라인 수
const MAX_VISIBLE_LINES = 500;
// 더 보기 시 추가할 라인 수
const LOAD_MORE_LINES = 300;

// 더 보기 핸들러
const handleLoadMore = useCallback(() => {
  setMaxVisibleLines((prev) => prev + LOAD_MORE_LINES);
}, []);
```

**2. Hunk 기반 렌더링 및 동일 라인 접기**
변경된 부분(Hunk)과 동일한 부분을 구분하여, 변경이 없는 연속된 줄들은 기본적으로 접어서 숨깁니다. 사용자가 필요할 때만 펼쳐볼 수 있어 초기 렌더링 부하를 크게 줄였습니다:

```typescript
// 변경사항 앞뒤로 보여줄 컨텍스트 줄 수
const CONTEXT_LINES = 3;
// 숨길 최소 줄 수 (이보다 적으면 그냥 표시)
const MIN_HIDDEN_LINES = 5;
```

**3. React.memo를 활용한 컴포넌트 메모이제이션**
각 Diff 행(Row) 컴포넌트를 `React.memo`로 감싸 불필요한 리렌더링을 방지하였습니다:

```typescript
// 개별 Diff 행 컴포넌트 (성능 최적화)
const DiffRow = React.memo(function DiffRow({ pair }: { pair: DiffPair }) {
  // ... 렌더링 로직
});
```

이러한 최적화를 통해 수십만 줄의 diff 결과도 부드럽게 렌더링할 수 있게 되었습니다.

---

### 2. C++ 알고리즘 레벨의 메모리 및 성능 최적화
#### 최적화 내용
C++ 코드에서도 다양한 성능 최적화 기법을 적용하였습니다:

**1. 해시 기반 자료구조 활용**
Myers 알고리즘의 역추적(backtracking) 과정에서 `std::unordered_map`을 사용하여 O(1) 시간 복잡도로 값을 조회합니다:

```cpp
// unordered_map<int, int>에서 값 꺼내기 (없으면 기본값)
int getOrDefault(const unordered_map<int, int>& m, int key, int defaultValue) {
    auto it = m.find(key);
    if (it == m.end()) return defaultValue;
    return it->second;
}
```

**2. 문자열 메모리 사전 할당**
JSON 이스케이프 처리 시 `reserve()`를 사용하여 문자열의 메모리를 미리 할당함으로써, 문자열 확장 시 발생하는 반복적인 재할당을 방지하였습니다:

```cpp
string escapeJson(const string& s) {
    string out;
    out.reserve(s.size());  // 메모리 사전 할당
    // ... 이스케이프 처리
    return out;
}
```

**3. 정적 변수를 활용한 재할당 방지**
WASM 함수 호출 시 반환되는 결과 문자열을 `static` 변수로 선언하여, 매 호출마다 새로운 메모리를 할당하는 오버헤드를 제거하였습니다:

```cpp
const char* diff_text_impl(const char* baseText, const char* changedText) {
    // static으로 만들어야 함수가 끝난 뒤에도 포인터가 유효함
    static string result;
    result.clear();
    // ... diff 연산 및 JSON 생성
    return result.c_str();
}
```

이러한 최적화를 통해 C++ 코드의 실행 속도와 메모리 효율성을 모두 향상시킬 수 있었습니다.

## 레이턴시 (Latency)
| 항목 | CPP |  JS |
|-----|-----|-----|
|텍스트 파일 청크(Chunk) 처리|1ms|1ms|
|텍스트 파일 차이점(Different) 처리|1ms|1ms|

## P.S.
### [Git-flow](https://techblog.woowahan.com/2553/) 전략으로 Branch를 관리합니다.
**Branches**
- `master`: Static site를 배포하기 위한 브랜치
- `develop`: 개발된 내용들의 집합
- `hotfix`: 배포된 내용을 급하게 수정할 때 사용하기 위한 브랜치, `master`에서 분기해주세요.
- `feature/`: 가장 작은 단위 개발 내용, `develop`에서 분기해주세요.
- `refactor/`: 가장 작은 단위의 개선 내용, `develop`에서 분기해주세요.
- `chore/`: Build와 관련된 수정 및 개선 내용, `develop`에서 분기해주세요.
- `docs/`: 문서 수정 및 추가 내용, `develop`에서 분기해주세요.

**Commits**
- `feature:`: 가장 작은 단위 개발 내용
- `refactor:`: 가장 작은 단위의 개선 내용
- `chore:`: Build와 관련된 수정 및 개선 내용
- `hotfix:`: `hotfix` 브랜치에서의 작업 내용
- `docs:`: 문서 수정 및 추가 내용