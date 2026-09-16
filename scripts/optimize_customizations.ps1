# Copyright 2025 Lee Boonstra
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

$ErrorActionPreference = "Stop"

# 1. Projedeki mukerrer kural dosyalarini kaldir
$workspaceRulesDir = "c:\Users\futbo\Desktop\AI Projeleri\NexusHub\.agents\rules"
$duplicateRules = @(
    "code-rules.md",
    "core-protocol.md",
    "design-rules.md",
    "quick-reference.md",
    "request-routing.md",
    "universal-rules.md"
)

foreach ($rule in $duplicateRules) {
    $targetPath = Join-Path $workspaceRulesDir $rule
    if (Test-Path $targetPath) {
        Write-Host "Mukerrer kural kaldirildi: $rule"
        Remove-Item -Path $targetPath -Force
    }
}

# 2. vibes-plug eklentisinde tutulacak yuksek oncelikli beceriler
$keepSkills = @(
    "accessibility-testing-expert",
    "ai-llm-integration-expert",
    "ai-prompt-engineering-expert",
    "anti-slop",
    "app-analyzer-optimizer",
    "autonomous-tdd-debugger",
    "design-system-architect",
    "desktop-electron-expert",
    "e2e-testing-expert",
    "error-resilience-expert",
    "form-validation-expert",
    "gemini-agent-booster",
    "hig",
    "modern-css-native-expert",
    "performance-web-vitals",
    "production-ready-hardener",
    "senior-frontend",
    "state-management-expert",
    "svg-animation-motion-expert",
    "tailwind-expert",
    "tanstack-query-expert",
    "tauri-expert",
    "typescript-expert",
    "ui-ux-pro-max",
    "website-design-cloner"
)

$vibesSkillsDir = "C:\Users\futbo\.gemini\config\plugins\vibes-plug\skills"
$archiveDir = "C:\Users\futbo\.gemini\config\plugins\vibes-plug\skills_archived"

if (-not (Test-Path $archiveDir)) {
    New-Item -ItemType Directory -Path $archiveDir | Out-Null
}

$allVibesSkills = Get-ChildItem -Path $vibesSkillsDir -Directory

$archivedCount = 0
foreach ($dir in $allVibesSkills) {
    $skillName = $dir.Name
    if ($keepSkills -notcontains $skillName) {
        $destPath = Join-Path $archiveDir $skillName
        Move-Item -Path $dir.FullName -Destination $destPath -Force
        $archivedCount++
    }
}

Write-Host "Toplam arsivlenen vibes-plug beceri sayisi: $archivedCount"
Write-Host "Aktif tutulan vibes-plug beceri sayisi: $($keepSkills.Count)"
