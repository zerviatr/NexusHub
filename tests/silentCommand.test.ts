import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Windows Silent Command Execution Static Analysis', () => {
  const srcTauriSrc = path.resolve(__dirname, '../src-tauri/src');

  function getRsFiles(dir: string): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...getRsFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.rs')) {
        files.push(fullPath);
      }
    }
    return files;
  }

  it('verifies src-tauri/src/process_ext.rs defines CREATE_NO_WINDOW (0x08000000)', () => {
    const processExtPath = path.join(srcTauriSrc, 'process_ext.rs');
    expect(fs.existsSync(processExtPath)).toBe(true);

    const content = fs.readFileSync(processExtPath, 'utf-8');
    expect(content).toMatch(/0x0800_0000|0x08000000/);
    expect(content).toContain('creation_flags');
    expect(content).toContain('std_command');
    expect(content).toContain('tokio_command');
    expect(content).toContain('silent_command');
    expect(content).toContain('silent_async_command');
  });

  it('validates no raw unflagged Command::new exists in src-tauri/src/', () => {
    const files = getRsFiles(srcTauriSrc).filter(
      (f) => !f.endsWith('process_ext.rs') && !f.includes('tests')
    );

    const violations: { file: string; line: number; text: string }[] = [];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      // Strip block comments, line comments, and string literals
      const stripped = content
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '')
        .replace(/r#".*?"#/gs, '""')
        .replace(/"[^"\r\n\\]*(?:\\.[^"\r\n\\]*)*"/g, '""');

      const lines = stripped.split('\n');
      lines.forEach((line, idx) => {
        if (line.includes('Command::new')) {
          // Check subsequent lines up to semicolon
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

          if (!isFlagged) {
            violations.push({
              file: path.relative(path.resolve(__dirname, '..'), file),
              line: idx + 1,
              text: line.trim()
            });
          }
        }
      });
    }

    expect(
      violations,
      `Detected raw unflagged Command::new call sites: ${JSON.stringify(violations, null, 2)}`
    ).toEqual([]);
  });
});
