import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, it } from 'vitest';
import { maxPublicMethods } from './max-public-methods.js';

RuleTester.describe = describe;
RuleTester.it = it;

const methods = (count, modifier = '') =>
  Array.from({ length: count }, (_, i) => `${modifier} m${i}() {}`).join('\n');

const ruleTester = new RuleTester({ languageOptions: { parser: tseslint.parser } });

ruleTester.run('max-public-methods', maxPublicMethods, {
  valid: [
    { code: `class A { ${methods(10)} }` },
    { code: `class A { constructor() {} ${methods(10)} }` },
    { code: `class A { ${methods(10)} ${methods(5, 'private')} }` },
    { code: `class A { ${methods(10)} #hidden() {} }` },
    { code: `class A { ${methods(3)} }`, options: [3] },
  ],
  invalid: [
    { code: `class A { ${methods(11)} }`, errors: [{ messageId: 'tooMany' }] },
    { code: `const A = class { ${methods(4)} }`, options: [3], errors: [{ messageId: 'tooMany' }] },
    { code: `class A { ${methods(11, 'public')} }`, errors: [{ messageId: 'tooMany' }] },
  ],
});
