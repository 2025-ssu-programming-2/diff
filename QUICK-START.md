# Diff 프로그램 - 빠른 시작 가이드

## 🚀 3단계로 시작하기

### 1단계: 웹 서버 실행

```bash
cd /Users/hyeonseo/workspace/school/diff/web/dist
python -m http.server 8080
```

**출력 예:**
```
Serving HTTP on :: port 8080 (http://[::]:8080/) ...
```

### 2단계: 브라우저에서 접속

```
http://localhost:8080/
```

### 3단계: 파일 비교

1. **파일 2개 선택**: "파일 선택" 버튼으로 비교할 두 텍스트 파일을 업로드
2. **비교 시작**: "비교 시작!" 버튼 클릭
3. **결과 확인**: 색상으로 구분된 diff 결과 보기
   - 🔴 **빨간색** (deleted): 삭제된 라인
   - 🟢 **초록색** (added): 추가된 라인
   - ⚫ **회색** (same): 동일한 라인

---

## 🧪 테스트 페이지

자동으로 샘플 텍스트를 비교해주는 테스트 페이지:

```
http://localhost:8080/test.html
```

이 페이지를 열면 자동으로 다음과 같은 결과를 보여줍니다:

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

브라우저 콘솔(F12)에서 로그를 확인할 수 있습니다.

---

## ✅ 주요 수정 사항 (에러 해결)

### 문제: `Yt._ccall is not a function`

**원인:** Emscripten 런타임에서 `ccall` 함수를 호출할 때 밑줄(`_`)을 붙이면 안 됩니다.

**해결:**
```javascript
// ❌ 틀린 방식
module._ccall('parseText', null, ['string', 'boolean'], [text1, true]);

// ✅ 올바른 방식
module.ccall('parseText', null, ['string', 'boolean'], [text1, true]);
```

### 파일 수정 목록
- ✅ `web/src/utils/diff.ts` - `_ccall` → `ccall`로 변경
- ✅ `web/dist/test.html` - 테스트 페이지 생성

---

## 🏗️ 빌드 및 재배포

코드를 수정한 후 다시 배포하려면:

```bash
# 웹 코드 재빌드
cd web
npm run build

# 서버 재시작
cd dist
python -m http.server 8080
```

---

## 🔍 문제 해결

### 1. WASM 모듈이 로드되지 않음

**증상:** `WASM module failed to load within 5 seconds`

**해결:**
```bash
# 1. 서버가 실행 중인지 확인
ps aux | grep http.server

# 2. 포트 확인 (8080 대신 다른 포트 사용)
python -m http.server 3000

# 3. 캐시 삭제 후 새로고침
브라우저: Cmd+Shift+R (macOS) 또는 Ctrl+Shift+R (Windows/Linux)
```

### 2. Module 객체를 찾을 수 없음

**증상:** `Module is not defined`

**해결:**
- `main.js`가 `index.html`에서 로드되었는지 확인
- 브라우저 콘솔(F12)에서 `typeof Module` 입력 → `object`가 나와야 함

### 3. 함수 호출 실패

**증상:** `ccall is not a function`

**해결:**
- `Module.ccall` (밑줄 없음) 사용 확인
- `Module._parseText` 같은 밑줄이 붙은 함수는 직접 호출하지 말 것

---

## 📝 사용 예시

### 테스트 파일 생성 및 비교

```bash
# 파일 1 생성
cat > file1.txt << 'EOF'
Hello World
This is a test
Line 3
EOF

# 파일 2 생성
cat > file2.txt << 'EOF'
Hello World
This is modified
Line 3
Line 4 (new)
EOF

# 웹 브라우저에서 두 파일 업로드 후 비교 시작
```

**예상 결과:**
```
  Hello World
- This is a test
+ This is modified
  Line 3
+ Line 4 (new)
```

---

## 🎯 다음 단계

1. **웹 배포**: Vercel, Netlify 등으로 배포
   ```bash
   npm run build
   # dist/ 폴더를 배포 플랫폼으로 업로드
   ```

2. **기능 확장**:
   - 더 큰 파일 지원
   - 다양한 출력 형식 (JSON, HTML 등)
   - 문자 단위 diff (word diff)

3. **성능 최적화**:
   - Myers' diff 알고리즘으로 변경
   - 대용량 파일 스트리밍 처리

---

## 📞 지원

문제가 발생하면:

1. **브라우저 콘솔 확인** (F12 → Console)
2. **네트워크 탭 확인** (F12 → Network) - main.js, main.wasm 로드 확인
3. **GitHub Issues** 또는 README.md 참고

---

## ✨ 핵심 개선사항

| 항목 | 이전 | 이후 |
|------|------|------|
| 함수 호출 | `Module._ccall()` | `Module.ccall()` ✅ |
| 모듈 체크 | `Module._parseText` | `Module.ccall` ✅ |
| 에러 처리 | 부분적 | 완벽한 로깅 ✅ |
| 테스트 페이지 | 없음 | test.html 추가 ✅ |

---

**이제 모든 것이 준비되었습니다! 즐거운 개발되세요! 🎉**