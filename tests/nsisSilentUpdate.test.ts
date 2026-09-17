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

describe('Milestone M8: NSIS Silent Background Update & v2.5.2 Release Verification', () => {
  const rootDir = path.resolve(__dirname, '..');
  const srcTauriDir = path.join(rootDir, 'src-tauri');
  const websiteDir = path.join(rootDir, 'website');

  describe('1. Tauri Configuration (src-tauri/tauri.conf.json)', () => {
    const tauriConfPath = path.join(srcTauriDir, 'tauri.conf.json');

    it('exists and is valid JSON', () => {
      expect(fs.existsSync(tauriConfPath)).toBe(true);
      const raw = fs.readFileSync(tauriConfPath, 'utf-8');
      expect(() => JSON.parse(raw)).not.toThrow();
    });

    it('sets version to 2.5.4', () => {
      const config = JSON.parse(fs.readFileSync(tauriConfPath, 'utf-8'));
      expect(config.version).toBe('2.5.4');
    });

    it('configures bundle.windows.nsis.installMode as "currentUser" to prevent UAC elevation', () => {
      const config = JSON.parse(fs.readFileSync(tauriConfPath, 'utf-8'));
      expect(config.bundle).toBeDefined();
      expect(config.bundle.windows).toBeDefined();
      expect(config.bundle.windows.nsis).toBeDefined();
      expect(config.bundle.windows.nsis.installMode).toBe('currentUser');
    });

    it('configures plugins.updater.windows with passive installMode and ["/S"] installerArgs', () => {
      const config = JSON.parse(fs.readFileSync(tauriConfPath, 'utf-8'));
      expect(config.plugins).toBeDefined();
      expect(config.plugins.updater).toBeDefined();
      expect(config.plugins.updater.windows).toBeDefined();
      expect(config.plugins.updater.windows.installMode).toBe('passive');
      expect(config.plugins.updater.windows.installerArgs).toEqual(['/S']);
    });
  });

  describe('2. Rust Updater Backend (src-tauri/src/updater.rs)', () => {
    const updaterPath = path.join(srcTauriDir, 'src', 'updater.rs');

    it('invokes detached silent installer with "/S" flag', () => {
      expect(fs.existsSync(updaterPath)).toBe(true);
      const code = fs.readFileSync(updaterPath, 'utf-8');

      // Must use silent_command to prevent console window popup
      expect(code).toMatch(/crate::process_ext::silent_command\("cmd"\)/);

      // Must pass ["/C", "start", "", path..., "/S"]
      expect(code).toMatch(
        /\.args\(\["\/C",\s*"start",\s*"",\s*path\.to_str\(\)\.unwrap_or_default\(\),\s*"\/S"\]\)/
      );

      // Must preserve sleep delay for clean process handoff
      expect(code).toMatch(/std::thread::sleep\(std::time::Duration::from_millis\(500\)\)/);

      // Must terminate main process to allow file overwrite
      expect(code).toMatch(/std::process::exit\(0\)/);
    });

    it('has zero raw unflagged Command::new invocations in updater.rs', () => {
      const code = fs.readFileSync(updaterPath, 'utf-8');
      expect(code).not.toContain('Command::new');
    });
  });

  describe('3. Repository-wide Version Alignment (v2.5.4)', () => {
    it('verifies root package.json version is 2.5.4', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
      expect(pkg.version).toBe('2.5.4');
    });

    it('verifies root package-lock.json version is 2.5.4', () => {
      const lock = JSON.parse(fs.readFileSync(path.join(rootDir, 'package-lock.json'), 'utf-8'));
      expect(lock.version).toBe('2.5.4');
      expect(lock.packages[''].version).toBe('2.5.4');
    });

    it('verifies src-tauri/Cargo.toml package version is 2.5.4', () => {
      const cargoToml = fs.readFileSync(path.join(srcTauriDir, 'Cargo.toml'), 'utf-8');
      expect(cargoToml).toMatch(/name\s*=\s*"zendev"\s*\r?\nversion\s*=\s*"2\.5\.4"/);
    });

    it('verifies src-tauri/Cargo.lock zendev package version is 2.5.4', () => {
      const cargoLock = fs.readFileSync(path.join(srcTauriDir, 'Cargo.lock'), 'utf-8');
      expect(cargoLock).toMatch(/\[\[package\]\]\r?\nname = "zendev"\r?\nversion = "2\.5\.4"/);
    });

    it('verifies website/package.json version is 2.5.4', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(websiteDir, 'package.json'), 'utf-8'));
      expect(pkg.version).toBe('2.5.4');
    });

    it('verifies website/package-lock.json version is 2.5.4', () => {
      const lock = JSON.parse(fs.readFileSync(path.join(websiteDir, 'package-lock.json'), 'utf-8'));
      expect(lock.version).toBe('2.5.4');
      expect(lock.packages[''].version).toBe('2.5.4');
    });

    it('verifies .github/workflows/release.yml fallback tag is v2.5.4', () => {
      const workflow = fs.readFileSync(path.join(rootDir, '.github', 'workflows', 'release.yml'), 'utf-8');
      expect(workflow).toContain('"v2.5.4"');
    });

    it('verifies website/src/lib/downloadHelper.ts declares version 2.5.4 with valid release URLs', () => {
      const helper = fs.readFileSync(path.join(websiteDir, 'src', 'lib', 'downloadHelper.ts'), 'utf-8');
      expect(helper).toContain("version: '2.5.4'");
      expect(helper).toContain('ZenDev-Setup-2.5.4.exe');
      expect(helper).toContain('ZenDev-Portable-2.5.4.exe');
    });
  });
});
