declare const Module: {
  /**
   * WASM 메모리에 할당된 두 개의 텍스트 포인터를 받아 diff 결과를 반환합니다.
   * 반환값은 JSON 문자열이 저장된 메모리 주소(포인터)입니다.
   */
  _diff_text: (text1Ptr: number, text2Ptr: number) => number;

  /**
   * 지정된 크기(바이트)만큼 메모리를 할당하고, 할당된 메모리의 시작 주소(포인터)를 반환합니다.
   */
  _malloc: (size: number) => number;

  /**
   * 할당된 메모리를 해제합니다.
   */
  _free: (ptr: number) => void;

  /**
   * C 함수를 직접 호출합니다.
   * @param ident 호출할 C 함수의 이름 (예: 'diff_text', '_diff_text' 아님)
   * @param returnType 반환 타입 ('number', 'string', 'boolean', null 중 하나)
   * @param argTypes 인자 타입들의 배열 (예: ['number', 'string'])
   * @param args 인자 값들의 배열
   * @param opts 옵션 객체 (선택 사항)
   */
  ccall: (ident: string, returnType: string | null, argTypes: string[], args: unknown[], opts?: unknown) => unknown;

  /**
   * C 함수를 자바스크립트 함수처럼 래핑하여 반환합니다.
   * @param ident 래핑할 C 함수의 이름
   * @param returnType 반환 타입
   * @param argTypes 인자 타입들의 배열
   * @param opts 옵션 객체
   */
  cwrap: (
    ident: string,
    returnType: string | null,
    argTypes: string[],
    opts?: unknown,
  ) => (...args: unknown[]) => unknown;

  /**
   * WASM 힙 메모리(HEAPU8)에 있는 null-terminated UTF8 문자열을 자바스크립트 문자열로 변환합니다.
   * @param ptr 문자열의 시작 주소
   * @param maxBytesToRead 읽을 최대 바이트 수 (선택 사항)
   * @param ignoreNul true일 경우 null 문자에서 멈추지 않음 (선택 사항)
   */
  UTF8ToString: (ptr: number, maxBytesToRead?: number, ignoreNul?: boolean) => string;

  /**
   * 자바스크립트 문자열을 받아 WASM 힙에 새로운 메모리를 할당하고 UTF8로 인코딩하여 복사합니다.
   * 반환값은 할당된 메모리의 포인터입니다. 사용 후 _free()로 해제해야 합니다.
   * (내부적으로 stringToNewUTF8을 호출합니다)
   */
  allocateUTF8: (str: string) => number;

  /**
   * WASM 힙 메모리에 대한 Uint8Array 뷰
   * SharedArrayBuffer와 함께 사용할 때 직접 메모리 접근에 활용
   */
  HEAPU8: Uint8Array;

  /**
   * WASM 힙 메모리에 대한 Int8Array 뷰
   */
  HEAP8: Int8Array;

  /**
   * WASM 힙 메모리에 대한 Uint32Array 뷰
   */
  HEAPU32: Uint32Array;

  /**
   * WASM 힙 메모리에 대한 Int32Array 뷰
   */
  HEAP32: Int32Array;

  /**
   * 자바스크립트 문자열을 WASM 힙 메모리의 특정 위치에 UTF8로 인코딩하여 씁니다.
   * @param str 인코딩할 문자열
   * @param outPtr 출력 위치 (WASM 힙의 포인터)
   * @param maxBytesToWrite 최대 쓰기 바이트 수
   * @returns 실제로 쓴 바이트 수
   */
  stringToUTF8: (str: string, outPtr: number, maxBytesToWrite: number) => number;

  /**
   * 문자열을 UTF8로 인코딩했을 때의 바이트 길이를 반환합니다.
   * @param str 길이를 계산할 문자열
   * @returns UTF8 인코딩 시 바이트 수 (null terminator 제외)
   */
  lengthBytesUTF8: (str: string) => number;
};
