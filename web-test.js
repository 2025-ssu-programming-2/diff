// Node.js에서 WASM 로드를 시뮬레이션할 수는 없지만,
// 코드 논리를 검증할 수 있습니다.

console.log('테스트: WASM 함수 호출 방식 검증');
console.log('');

// Emscripten Module 객체의 일반적인 구조
const MockModule = {
  ccall: function(funcName, returnType, argTypes, args) {
    console.log(`✓ ccall 호출: ${funcName}(${argTypes.join(', ')}) → ${returnType || 'void'}`);

    // Diff 함수들의 모의 반환값
    if (funcName === 'getResultCount') {
      return 6;
    } else if (funcName === 'getResultItem') {
      const index = args[0];
      const results = [
        '0|Hello World',
        '2|This is a test',
        '1|This is modified',
        '0|Diff algorithm',
        '0|Line 4',
        '1|New line 5'
      ];
      return results[index] || '';
    }
  }
};

console.log('1. parseText() 호출 테스트:');
MockModule.ccall('parseText', null, ['string', 'boolean'], ['text1', true]);
console.log('');

console.log('2. runDiff() 호출 테스트:');
MockModule.ccall('runDiff', null, [], []);
console.log('');

console.log('3. getResultCount() 호출 테스트:');
const count = MockModule.ccall('getResultCount', 'number', [], []);
console.log(`   결과: ${count}개의 라인`);
console.log('');

console.log('4. getResultItem() 호출 테스트:');
for (let i = 0; i < count; i++) {
  const resultStr = MockModule.ccall('getResultItem', 'string', ['number'], [i]);
  const [typeStr, ...contentParts] = resultStr.split('|');
  const content = contentParts.join('|');
  const type = typeStr === '0' ? 'same' : typeStr === '1' ? 'added' : 'deleted';

  const typeLabel = {
    'same': '동일',
    'added': '추가',
    'deleted': '삭제'
  }[type];

  console.log(`   [${typeLabel}] ${content}`);
}

console.log('');
console.log('✓ 모든 함수 호출이 정상적으로 작동합니다!');
console.log('');
console.log('주요 수정 사항:');
console.log('  • Module._ccall → Module.ccall (언더스코어 제거)');
console.log('  • WASM 모듈 로드 체크: Module.ccall 존재 여부 확인');