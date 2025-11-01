# Emscripten 컴파일러
EMCC = emcc

# C++ 소스 파일
CPP_SOURCES = src/main.cpp src/utils.cpp

# 컴파일 옵션 (O3: 최적화, -sWASM=1: WASM 생성, -sEXPORTED_FUNCTIONS: 함수 노출)
# Embind 사용 시: --bind
CFLAGS = -O3 -sWASM=1 --bind -o dist/module.js

# 빌드 타겟
all: build

# 'build' 명령 실행 시: dist 디렉터리 생성, C++ 컴파일, public 파일 복사
build:
	@mkdir -p dist                # dist 폴더 생성
	$(EMCC) $(CPP_SOURCES) $(CFLAGS) # C++ 컴파일 -> dist/module.js, dist/module.wasm 생성
	@cp public/* dist/            # public 폴더의 파일들을 dist로 복사

# 'clean' 명령 실행 시: dist 폴더 삭제
clean:
	@rm -rf dist

# 'run' 명령 실행 시: 로컬 서버 실행
run:
	@echo "로컬 서버 실행 (예: python3 -m http.server 8000 --directory dist)"
	@python3 -m http.server 8000 --directory dist