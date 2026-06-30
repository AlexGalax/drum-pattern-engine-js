import js from '@eslint/js';

const G = (...n) => Object.fromEntries(n.map((k) => [k, 'readonly']));

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: G(
        'Math',
        'Set',
        'Map',
        'Array',
        'Object',
        'Uint8Array',
        'DataView',
        'atob',
        'console',
        'String',
        'JSON',
        'parseInt',
        'parseFloat',
        'isNaN',
        'self',
      ),
    },
    // Google JS/TS Style Guide — enforceable subset.
    // https://google.github.io/styleguide/jsguide.html
    rules: {
      'no-unused-vars': ['warn', {argsIgnorePattern: '^_'}],
      'no-var': 'error',
      'prefer-const': 'error',
      'one-var': ['error', 'never'],
      eqeqeq: ['error', 'always', {null: 'ignore'}],
      'guard-for-in': 'error',
      'no-throw-literal': 'error',
      'no-new-wrappers': 'error',
      'no-array-constructor': 'error',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
    },
  },
];
