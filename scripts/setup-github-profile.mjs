/**
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

/**
 * scripts/setup-github-profile.mjs
 *
 * Automated GitHub User Profile & Special Repository Configurator.
 * Creates the special username repository (zerviatr/zerviatr) and injects
 * a cybernetic, dark-mode developer portfolio README matching the ZenDev aesthetic.
 */

import https from 'node:https'

const USERNAME = 'zerviatr'
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN

if (!TOKEN) {
  console.error('[Profile Setup] GITHUB_TOKEN environment variable is required.')
  process.exit(1)
}

/**
 * Executes an authenticated HTTPS request against the GitHub REST API.
 *
 * @param {string} method - HTTP Verb (GET, POST, PUT, PATCH, DELETE).
 * @param {string} endpoint - API path (e.g. /user).
 * @param {object|null} payload - JSON request body.
 * @returns {Promise<{status: number, data: any}>} API response payload.
 */
function requestGithub(method, endpoint, payload = null) {
  return new Promise((resolve, reject) => {
    const dataString = payload ? JSON.stringify(payload) : null
    const options = {
      hostname: 'api.github.com',
      path: endpoint,
      method,
      headers: {
        'User-Agent': 'ZenDev-Profile-Engine',
        'Authorization': `Bearer ${TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        ...(dataString ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(dataString)
        } : {})
      }
    }

    const req = https.request(options, (res) => {
      let buffer = ''
      res.on('data', (chunk) => { buffer += chunk })
      res.on('end', () => {
        let parsed = null
        try {
          parsed = buffer ? JSON.parse(buffer) : null
        } catch {
          parsed = buffer
        }
        resolve({ status: res.statusCode, data: parsed })
      })
    })

    req.on('error', reject)
    if (dataString) req.write(dataString)
    req.end()
  })
}

const PROFILE_README_CONTENT = `<div align="center">

  <img src="https://capsule-render.vercel.app/api?type=waving&color=07090e&text=ZERVIATR&fontSize=60&fontAlignY=40&desc=Architect%20%7C%20Creator%20of%20ZenDev&descSize=20&descAlignY=62&fontColor=00f2fe&stroke=8b5cf6&strokeWidth=2&height=220" width="100%" alt="ZenDev Banner"/>

  <p align="center">
    <b>Crafting High-Performance Developer Tooling, Cyber Security Utilities & Offline-First Systems.</b>
  </p>

  <p align="center">
    <a href="https://zendev-production-4a5b.up.railway.app/" target="_blank">
      <img src="https://img.shields.io/badge/ZenDev-Live%20v2.4.2-00f2fe?style=for-the-badge&logo=electron&logoColor=07090e" alt="ZenDev Live" />
    </a>
    <a href="https://github.com/zerviatr/NexusHub" target="_blank">
      <img src="https://img.shields.io/badge/Repository-NexusHub-8b5cf6?style=for-the-badge&logo=github&logoColor=white" alt="NexusHub Repo" />
    </a>
  </p>

</div>

---

### ⚡ Technical Arsenal & Core Stack

\`\`\`yaml
Languages:    [ TypeScript, JavaScript, Python, Rust, SQL, Bash ]
Frameworks:   [ React, Electron, Node.js, Vite, TailwindCSS, Express ]
Architecture: [ Offline-First, Microservices, REST, IPC, V8 Memory Tuning ]
Tooling:      [ Docker, Git, Vitest, Playwright, GitHub Actions CI/CD ]
\`\`\`

---

### 🚀 Flagship Project: ZenDev Suite

<div align="center">
  <table border="0">
    <tr>
      <td width="60%">
        <h4>💎 ZenDev — Developer Productivity & Security Cockpit</h4>
        <p>
          Offline-first multi-tool desktop workstation equipped with <b>API Studio</b>, <b>Cyber Fortress</b>,
          <b>Port Watchdog</b>, <b>V8 Tray Memory Sweep</b>, and instant development utilities.
        </p>
        <p>
          👉 <b><a href="https://github.com/zerviatr/NexusHub">GitHub Repository</a></b> • 
          🌐 <b><a href="https://zendev-production-4a5b.up.railway.app/">Web Platform</a></b>
        </p>
      </td>
      <td width="40%" align="center">
        <a href="https://github.com/zerviatr/NexusHub/releases/latest">
          <img src="https://img.shields.io/github/v/release/zerviatr/NexusHub?color=00f2fe&label=Latest%20Release&style=flat-square" alt="Release" /><br/>
          <img src="https://img.shields.io/github/license/zerviatr/NexusHub?color=8b5cf6&style=flat-square" alt="License" />
        </a>
      </td>
    </tr>
  </table>
</div>

---

### 📊 Performance & Development Analytics

<div align="center">
  <img src="https://github-readme-stats.vercel.app/api?username=zerviatr&show_icons=true&theme=tokyonight&bg_color=07090e&title_color=00f2fe&text_color=94a3b8&icon_color=00f2fe&border_color=1e293b&hide_border=false" height="150" alt="GitHub Stats" />
  <img src="https://github-readme-stats.vercel.app/api/top-langs/?username=zerviatr&layout=compact&theme=tokyonight&bg_color=07090e&title_color=00f2fe&text_color=94a3b8&border_color=1e293b&hide_border=false" height="150" alt="Top Languages" />
</div>

<br/>

<div align="center">
  <sub>Built with precision. Obsessed with zero-latency software and pristine code quality.</sub>
</div>
`

/**
 * Main orchestration entry point.
 */
async function run() {
  console.log('[1/3] Updating GitHub Profile Details (Bio, Blog, Company)...')
  const profilePatch = await requestGithub('PATCH', '/user', {
    bio: 'Architect & Creator of ZenDev • Building high-performance developer tooling & cyber systems.',
    blog: 'https://zendev-production-4a5b.up.railway.app/',
    company: 'ZenDev',
    location: 'Remote / Global'
  })
  console.log('Profile update status:', profilePatch.status)

  console.log('[2/3] Checking or Creating Special Repository (zerviatr/zerviatr)...')
  const repoCheck = await requestGithub('GET', `/repos/${USERNAME}/${USERNAME}`)
  if (repoCheck.status === 404) {
    const createRepo = await requestGithub('POST', '/user/repos', {
      name: USERNAME,
      description: 'Personal configuration and showcase profile for zerviatr.',
      private: false,
      auto_init: true
    })
    console.log('Repo creation status:', createRepo.status)
    // Short wait for GitHub repo initialization
    await new Promise((resolve) => setTimeout(resolve, 2000))
  } else {
    console.log('Special repository already exists.')
  }

  console.log('[3/3] Uploading Custom Cyber README.md...')
  let sha = null
  const currentFile = await requestGithub('GET', `/repos/${USERNAME}/${USERNAME}/contents/README.md`)
  if (currentFile.status === 200 && currentFile.data?.sha) {
    sha = currentFile.data.sha
  }

  const putReadme = await requestGithub('PUT', `/repos/${USERNAME}/${USERNAME}/contents/README.md`, {
    message: 'feat(profile): Initialize cybernetic developer profile README',
    content: Buffer.from(PROFILE_README_CONTENT, 'utf8').toString('base64'),
    ...(sha ? { sha } : {})
  })
  console.log('README upload status:', putReadme.status)

  if (putReadme.status === 200 || putReadme.status === 201) {
    console.log('✅ GitHub Profile customization successfully deployed to https://github.com/' + USERNAME)
  } else {
    console.warn('⚠️ README upload warning:', putReadme)
  }
}

run().catch(console.error)
