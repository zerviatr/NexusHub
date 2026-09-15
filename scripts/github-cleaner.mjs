// Copyright 2026 Lee Boonstra
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

import axios from 'axios'

const REPO_OWNER = 'zerviatr'
const REPO_NAME = 'NexusHub'
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN

if (!TOKEN) {
  console.warn('[GitHub Cleaner] GITHUB_TOKEN environment variable not set. Please supply a valid token.')
}

const client = axios.create({
  baseURL: `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`,
  headers: {
    Authorization: `token ${TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'ZenDev-Cleaner'
  }
})

/**
 * Purges all unexpired build artifacts from GitHub Actions.
 */
export async function purgeWorkflowArtifacts() {
  try {
    const { data } = await client.get('/actions/artifacts')
    console.log(`[Artifacts] Found ${data.total_count} total artifacts.`)
    for (const artifact of data.artifacts || []) {
      await client.delete(`/actions/artifacts/${artifact.id}`)
      console.log(`[DELETED ARTIFACT] ID: ${artifact.id} (${artifact.name})`)
    }
    return data.total_count
  } catch (err) {
    console.error('[Artifacts] Error purging artifacts:', err.message)
    return 0
  }
}

/**
 * Retains only specified tags and deletes obsolete release assets.
 * @param {string[]} keepTags
 */
export async function pruneObsoleteReleases(keepTags = ['v2.4.2', 'v2.4.1', 'v2.4.0']) {
  try {
    const { data: releases } = await client.get('/releases?per_page=100')
    let deleted = 0
    for (const rel of releases) {
      if (!keepTags.includes(rel.tag_name)) {
        await client.delete(`/releases/${rel.id}`)
        console.log(`[DELETED RELEASE] ${rel.tag_name} (ID: ${rel.id})`)
        deleted++
      } else {
        console.log(`[PRESERVED] ${rel.tag_name} (ID: ${rel.id})`)
      }
    }
    return deleted
  } catch (err) {
    console.error('[Releases] Error pruning releases:', err.message)
    return 0
  }
}

if (process.argv[1] && process.argv[1].endsWith('github-cleaner.mjs')) {
  console.log('--- Starting ZenDev GitHub Repository Cleaner ---')
  Promise.all([purgeWorkflowArtifacts(), pruneObsoleteReleases()]).then(([artCount, relCount]) => {
    console.log(`Cleanup complete. Purged ${artCount} artifacts and ${relCount} obsolete releases.`)
  })
}
