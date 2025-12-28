module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: 'lucide-react',
            message: 'Use Icon component from @/components/icons/Icon instead. Direct imports from lucide-react are not allowed.',
          },
          {
            name: '@mui/icons-material',
            message: 'Use Icon component from @/components/icons/Icon instead. We use lucide-react for consistent icon styling.',
          },
        ],
        patterns: [
          {
            group: ['lucide-react/*'],
            message: 'Use Icon component from @/components/icons/Icon instead.',
          },
        ],
      },
    ],
  },
  overrides: [
    {
      // Allow lucide-react imports only in Icon.tsx
      files: ['src/components/icons/Icon.tsx'],
      rules: {
        'no-restricted-imports': 'off',
      },
    },
  ],
}



