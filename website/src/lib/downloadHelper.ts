// Copyright 2025 Lee Boonstra
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * Direct GitHub Release download links and fallback handlers for ZenDev Desktop.
 */

export const ZENDEV_RELEASE_CONFIG = {
  version: '2.5.3',
  setupExe: 'https://github.com/zerviatr/NexusHub/releases/download/v2.5.3/ZenDev-Setup-2.5.3.exe',
  portableExe: 'https://github.com/zerviatr/NexusHub/releases/download/v2.5.3/ZenDev-Portable-2.5.3.exe',
  fallbackLatestRelease: 'https://github.com/zerviatr/NexusHub/releases/latest',
  repoUrl: 'https://github.com/zerviatr/NexusHub'
} as const;

/**
 * Initiates a direct binary download from GitHub Releases with automatic
 * error recovery falling back to the latest release page.
 *
 * @param type - The package type to download ('setup' for NSIS, 'portable' for standalone exe)
 */
export function triggerDirectDownload(type: 'setup' | 'portable' = 'setup'): void {
  const targetUrl = type === 'setup'
    ? ZENDEV_RELEASE_CONFIG.setupExe
    : ZENDEV_RELEASE_CONFIG.portableExe;

  try {
    const anchor = document.createElement('a');
    anchor.href = targetUrl;
    anchor.setAttribute('download', '');
    anchor.setAttribute('rel', 'noopener noreferrer');
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } catch {
    // If dynamic anchor click fails, redirect to the latest GitHub release page
    window.location.href = ZENDEV_RELEASE_CONFIG.fallbackLatestRelease;
  }
}
