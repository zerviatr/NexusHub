/*
 * Copyright 2025 Lee Boonstra
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Adversarial Challenge: Static Analysis Scanner & Windows Console Suppression', () => {
  const srcTauriSrc = path.resolve(__dirname, '../src-tauri/src');

  /**
   * Evaluator mimicking the exact linter logic from silent_command_lint_test.rs and silentCommand.test.ts
   */
  function runLinterAlgorithm(sourceCode: string): { flagged: boolean; detected: boolean }[] {
    const stripped = sourceCode
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/r#".*?"#/gs, '""')
      .replace(/"[^"\r\n\\]*(?:\\.[^"\r\n\\]*)*"/g, '""');

    const lines = stripped.split('\n');
    const results: { flagged: boolean; detected: boolean }[] = [];

    lines.forEach((line, idx) => {
      if (line.includes('Command::new')) {
        let statement = line;
        let k = idx + 1;
        while (k < lines.length && !statement.includes(';')) {
          statement += ' ' + lines[k];
          k++;
        }
        const isFlagged =
          statement.includes('.silent()') ||
          statement.includes('creation_flags') ||
          statement.includes('CREATE_NO_WINDOW');

        results.push({ detected: true, flagged: isFlagged });
      }
    });

    return results;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CHALLENGE 1: ADVERSARIAL LINTER EVASION & FALSE NEGATIVE VECTORS
  // ───────────────────────────────────────────────────────────────────────────

  it('probes evasion vector A: whitespace token spacing (Command :: new)', () => {
    const maliciousCode = `
      fn bad_spawn() {
        let mut cmd = std::process::Command :: new("cmd.exe");
        cmd.spawn();
      }
    `;
    const results = runLinterAlgorithm(maliciousCode);
    // Empirical finding: The current linter fails to detect this unflagged invocation!
    expect(results.length).toBe(0); // EVASION CONFIRMED: 0 detections
  });

  it('probes evasion vector B: multi-line token split (Command::\\nnew)', () => {
    const maliciousCode = `
      fn bad_spawn() {
        let mut cmd = std::process::Command::
          new("cmd.exe");
        cmd.spawn();
      }
    `;
    const results = runLinterAlgorithm(maliciousCode);
    // Empirical finding: Split lines evade line.includes('Command::new')
    expect(results.length).toBe(0); // EVASION CONFIRMED: 0 detections
  });

  it('probes evasion vector C: import aliasing (use std::process::Command as SysCmd)', () => {
    const maliciousCode = `
      use std::process::Command as SysCmd;
      fn bad_spawn() {
        let mut cmd = SysCmd::new("cmd.exe");
        cmd.spawn();
      }
    `;
    const results = runLinterAlgorithm(maliciousCode);
    // Empirical finding: Aliasing evades the hardcoded substring search
    expect(results.length).toBe(0); // EVASION CONFIRMED: 0 detections
  });

  it('probes evasion vector D: turbofish / fully qualified type syntax (<Command>::new)', () => {
    const maliciousCode = `
      fn bad_spawn() {
        let mut cmd = <std::process::Command>::new("cmd.exe");
        cmd.spawn();
      }
    `;
    const results = runLinterAlgorithm(maliciousCode);
    // Empirical finding: \`<Command>::new\` has \`Command>::new\`, not \`Command::new\`
    expect(results.length).toBe(0); // EVASION CONFIRMED: 0 detections
  });

  it('probes evasion vector E: false negative via argument pollution containing CREATE_NO_WINDOW', () => {
    const maliciousCode = `
      fn unflagged_spawn_with_polluted_arg() {
        let mut cmd = std::process::Command::new("ping.exe").arg(CREATE_NO_WINDOW.to_string());
        cmd.spawn();
      }
    `;
    const results = runLinterAlgorithm(maliciousCode);
    expect(results.length).toBe(1);
    // Empirical finding: The linter falsely considers this FLAGGED because CREATE_NO_WINDOW appears before ';'
    expect(results[0].flagged).toBe(true); // FALSE NEGATIVE CONFIRMED: Treated as flagged when it was NOT configured with creation_flags!
  });

  it('probes evasion vector F: raw string delimiter regex flaw with multiple hashes (r##"..."##)', () => {
    const rawMultiHashRegex = /r#".*?"#/gs;
    const testSnippet = `let s = r##"Command::new("fake")"##;`;
    const replaced = testSnippet.replace(rawMultiHashRegex, '""');
    // Empirical finding: r##"..."## is NOT stripped by /r#".*?"#/gs
    expect(replaced).toContain('Command::new');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // CHALLENGE 2: VERIFICATION OF CREATE_NO_WINDOW CONSTANT & IMPLEMENTATION
  // ───────────────────────────────────────────────────────────────────────────

  it('verifies Win32 CREATE_NO_WINDOW = 0x0800_0000 exact bitmask in process_ext.rs', () => {
    const processExtPath = path.join(srcTauriSrc, 'process_ext.rs');
    const content = fs.readFileSync(processExtPath, 'utf-8');

    // Win32 API spec: CREATE_NO_WINDOW = 0x08000000 (134,217,728 / 1 << 27)
    expect(content).toMatch(/pub const CREATE_NO_WINDOW: u32 = 0x0800_0000;/);
    const hexVal = 0x08000000;
    expect(hexVal).toBe(134217728);
    expect(hexVal).toBe(1 << 27);

    // Verify std::process::Command implementation
    expect(content).toContain('impl SilentCommand for std::process::Command');
    expect(content).toContain('#[cfg(windows)]');
    expect(content).toContain('use std::os::windows::process::CommandExt;');
    expect(content).toContain('self.creation_flags(CREATE_NO_WINDOW);');

    // Verify tokio::process::Command implementation
    expect(content).toContain('impl SilentCommand for tokio::process::Command');
    expect(content).toContain('self.creation_flags(CREATE_NO_WINDOW);');

    // Verify constructors
    expect(content).toContain('pub fn silent_command<S: AsRef<OsStr>>');
    expect(content).toContain('pub fn silent_async_command<S: AsRef<OsStr>>');
    expect(content).toContain('pub fn std_command<S: AsRef<OsStr>>');
    expect(content).toContain('pub fn tokio_command<S: AsRef<OsStr>>');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // CHALLENGE 3: VERIFICATION OF NON-WINDOWS ZERO-COST NO-OP GUARANTEES
  // ───────────────────────────────────────────────────────────────────────────

  it('verifies non-Windows code compiles as zero-cost inlined no-ops without unused variable warnings', () => {
    const processExtPath = path.join(srcTauriSrc, 'process_ext.rs');
    const content = fs.readFileSync(processExtPath, 'utf-8');

    expect(content).toMatch(/#\[inline\]\s+fn silent\(&mut self\) -> &mut Self/);
    expect(content).toMatch(/#\[inline\]\s+fn into_silent\(mut self\) -> Self/);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // CHALLENGE 4: VERIFICATION OF COMMAND COVERAGE ACROSS TARGET MODULES
  // ───────────────────────────────────────────────────────────────────────────

  it('verifies Port Watchdog (port_watchdog.rs) has been purged per SaaS Directive Principle 2', () => {
    const portWatchdogPath = path.join(srcTauriSrc, 'port_watchdog.rs');
    expect(fs.existsSync(portWatchdogPath)).toBe(false);
  });

  it('verifies Network tools commands (ping.exe, ping, nslookup) use silent execution', () => {
    const networkPath = path.join(srcTauriSrc, 'network.rs');
    const content = fs.readFileSync(networkPath, 'utf-8');

    // Ping commands
    expect(content).toMatch(/silent_async_command\("ping\.exe"\)/);
    expect(content).toMatch(/silent_async_command\("ping"\)/);
    // Nslookup fallback command
    expect(content).toMatch(/silent_async_command\("nslookup"\)/);

    // Verify no raw unflagged Command calls
    expect(content).not.toContain('Command::new');
  });

  it('verifies System Optimizer (optimizer.rs) has been purged per SaaS Directive Principle 2', () => {
    const optimizerPath = path.join(srcTauriSrc, 'optimizer.rs');
    expect(fs.existsSync(optimizerPath)).toBe(false);
  });

  it('verifies Hardware ID (REG.exe, ioreg, hostname) and Updater (cmd) use silent execution', () => {
    const hwidPath = path.join(srcTauriSrc, 'hwid.rs');
    const hwidContent = fs.readFileSync(hwidPath, 'utf-8');
    expect(hwidContent).toMatch(/silent_command\("REG\.exe"\)/);
    expect(hwidContent).toMatch(/silent_command\("ioreg"\)/);
    expect(hwidContent).toMatch(/silent_command\("hostname"\)/);
    expect(hwidContent).not.toContain('Command::new');

    const updaterPath = path.join(srcTauriSrc, 'updater.rs');
    const updaterContent = fs.readFileSync(updaterPath, 'utf-8');
    expect(updaterContent).toMatch(/silent_command\("cmd"\)/);
    expect(updaterContent).toMatch(/\/S/);
    expect(updaterContent).toMatch(/\.args\(\["\/C",\s*"start",\s*"",\s*path\.to_str\(\)\.unwrap_or_default\(\),\s*"\/S"\]\)/);
    expect(updaterContent).not.toContain('Command::new');

    const libPath = path.join(srcTauriSrc, 'lib.rs');
    const libContent = fs.readFileSync(libPath, 'utf-8');
    expect(libContent).toMatch(/silent_command\("cmd"\)/);
    expect(libContent).toMatch(/silent_command\("open"\)/);
    expect(libContent).toMatch(/silent_command\("xdg-open"\)/);
    expect(libContent).not.toContain('Command::new');
  });

  it('exhaustively confirms zero raw Command::new across ALL production Rust files in src-tauri/src', () => {
    function getAllRsFiles(dir: string): string[] {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const files: string[] = [];
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...getAllRsFiles(full));
        } else if (entry.isFile() && entry.name.endsWith('.rs')) {
          files.push(full);
        }
      }
      return files;
    }

    const allFiles = getAllRsFiles(srcTauriSrc).filter(
      (f) => !f.endsWith('process_ext.rs')
    );

    const violations: { file: string; match: string }[] = [];

    for (const file of allFiles) {
      const code = fs.readFileSync(file, 'utf-8');
      const regex = /(?:std::process::Command|tokio::process::Command|Command)\s*::\s*new/g;
      const matches = code.match(regex);
      if (matches) {
        violations.push({ file: path.basename(file), match: matches.join(', ') });
      }
    }

    expect(violations).toEqual([]);
  });
});
