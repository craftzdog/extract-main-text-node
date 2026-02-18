const eslintPluginPrettier = require('eslint-plugin-prettier/recommended')

module.exports = [
  eslintPluginPrettier,
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'commonjs',
      globals: {
        $: 'readonly',
        jQuery: 'readonly'
      }
    },
    rules: {
      'no-useless-escape': 'off',
      'prettier/prettier': [
        'error',
        {
          trailingComma: 'none',
          singleQuote: true,
          semi: false
        }
      ],
      'prefer-const': 'error',
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ]
    }
  }
]
