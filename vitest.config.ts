import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: [
      'node_modules',
      'dist',
      'out',
      '.agents',
      'tests/challengerReverify.test.ts',
      'tests/ipc.test.ts',
      'tests/netDispatcherAdversarial.test.ts',
      'tests/pdfService.test.ts',
      'tests/securityHardening.test.ts'
    ],
  },
})
