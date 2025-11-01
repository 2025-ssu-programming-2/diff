# diff
## 개요
이 프로젝트는 숭실대학교 2025년 2학기 미디어경영학과 프로그래밍2 수업의 기말고사 프로젝트입니다. <br />
C++, WASM을 사용하여 고속으로 대용량 텍스트 파일의 다른 부분(diff)를 찾아내어 보기좋게 제공합니다.

## (팀명)
- 최강재, 팀장
- 류현서
- 임소연

## 환경설정
### emsdk 설치
**표준 설치 방법**
1. emsdk repository 복제
```shell
$ git clone https://github.com/emscripten-core/emsdk.git
$ cd emsdk
```
2. emsdk 최신 버전 설치
```shell
$ ./emsdk install latest
```
3. emsdk 활성화
```shell
$ ./emsdk activate latest
```
4. 현재 Shell에서 emsdk 환경변수 설정
```shell
$ source ./emsdk_env.sh # for Linux, macOS
$ emsdk_env.bat # for Windows
```
**macOS**
1. homebrew 이용
```shell
$ brew install emscripten
```

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
TBD.

## 성능 최적화 시도
TBD.