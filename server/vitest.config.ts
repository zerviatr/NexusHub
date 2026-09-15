import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/routes/**/*.ts',
        'src/middleware/**/*.ts',
      ],
      exclude: [
        'src/landingPageHtml.ts',
        'src/adminDashboardHtml.ts',
      ],
    },
  },
})
