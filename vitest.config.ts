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
      'tests/securityHardening.test.ts',
      'tests/adversarialActivityJournal.stress.test.ts',
      'tests/fileOrganizer.test.ts',
      'tests/memorySweep.test.ts',
      'tests/netDispatcher.test.ts',
      'tests/netDispatcherIPC.test.ts',
      'tests/netDispatcherSecurity.test.ts',
      'tests/vaultCrypto.test.ts',
      'tests/activityJournalIPC.test.ts',
      'tests/e2e/**'
    ],
  },
})
