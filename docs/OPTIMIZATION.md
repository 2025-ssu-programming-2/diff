# WASM 최적화 가이드

## 현재 적용된 최적화

### 1. 메모리 풀 재사용
- 매번 `malloc/free` 대신 버퍼를 재사용
- 청크 처리 시 메모리 할당 오버헤드 대폭 감소

### 2. 직접 메모리 접근
- `allocateUTF8()` 대신 `TextEncoder` + `HEAPU8.set()` 사용
- `UTF8ToString()` 대신 `HEAPU8.subarray()` + `TextDecoder` 사용
- 중간 복사 단계 제거

## 오버헤드 분석

| 단계 | 기존 방식 | 최적화 방식 | 개선 |
|-----|----------|------------|------|
| 메모리 할당 | malloc() 매번 호출 | 풀 재사용 | ~50% 감소 |
| 문자열 입력 | allocateUTF8 (복사 2회) | HEAPU8.set (복사 1회) | ~30% 감소 |
| 문자열 출력 | UTF8ToString (복사) | subarray + decode | ~20% 감소 |
| JSON 파싱 | JSON.parse() | (현재 유지) | - |

## 추가 최적화 방안

### 바이너리 프로토콜 (JSON 제거)

C++ 코드에서 JSON 대신 바이너리 형식으로 결과를 반환하면 
JSON 파싱 오버헤드를 완전히 제거할 수 있습니다.

```cpp
// 바이너리 결과 형식
struct BinaryDiffResult {
    uint32_t rowCount;
    struct Row {
        uint8_t op;        // 0=equal, 1=delete, 2=insert, 3=replace
        uint32_t leftLen;
        uint32_t rightLen;
        // 이후 leftLen + rightLen 바이트의 문자열 데이터
    } rows[];
};
```

### SharedArrayBuffer 완전 활용

WASM을 `-s SHARED_MEMORY=1`로 빌드하면:
- JS와 WASM이 동일한 메모리 공간 공유
- 복사 없이 포인터만 전달
- Worker 스레드에서 병렬 처리 가능

## CORS 헤더 설정

SharedArrayBuffer 사용을 위해 필요한 헤더:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

현재 `vite.config.ts`에 이미 설정되어 있습니다.

## 성능 측정 결과 해석

성능 패널에서 표시되는 항목:

- **순수 알고리즘 시간**: C++ diff 알고리즘만 실행한 시간
- **WASM 오버헤드**: 메모리 할당 + 문자열 변환 + JSON 파싱
- **총 Diff 시간**: 순수 알고리즘 + 오버헤드

**핵심**: 순수 알고리즘 시간에서 C++이 JS보다 빠릅니다!

