#!/usr/bin/env node
/**
 * scripts/gen-icons.js
 *
 * Generates ZenDev app icons from an inline SVG design.
 * Output:
 *   build/icons/icon.png  — 512×512 master PNG
 *   build/icons/icon.ico  — multi-size ICO (16/32/48/64/128/256 px)
 *
 * Usage: node scripts/gen-icons.js
 * Requires: sharp (already in dependencies)
 */

'use strict'
const sharp = require('sharp')
const fs    = require('fs')
const path  = require('path')

// ─── Output ──────────────────────────────────────────────────────────────────
const OUT = path.resolve(__dirname, '../build/icons')
fs.mkdirSync(OUT, { recursive: true })

// ─── SVG Design ─────────────────────────────────────────────────────────────
// 512×512. Brand palette: #8b5cf6 (violet) → #06b6d4 (cyan), bg #0a0a0f
// Concept: central zendev — a hexagon network with a glowing core node.
// Reads cleanly at 16 px (only the core ring survives) and pops at 256 px+.

const SVG = `<svg
  xmlns="http://www.w3.org/2000/svg"
  width="512" height="512"
  viewBox="0 0 512 512"
>
  <defs>
    <!-- Background gradient: deep dark -->
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#0f0f1e"/>
      <stop offset="100%" stop-color="#08080f"/>
    </linearGradient>

    <!-- Brand gradient: violet → cyan -->
    <linearGradient id="brand" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#8b5cf6"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>

    <!-- Lighter brand for inner elements -->
    <linearGradient id="brandLight" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#a78bfa"/>
      <stop offset="100%" stop-color="#22d3ee"/>
    </linearGradient>

    <!-- Radial background glow -->
    <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="#8b5cf6" stop-opacity="0.12"/>
      <stop offset="60%"  stop-color="#06b6d4" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="#000"    stop-opacity="0"/>
    </radialGradient>

    <!-- Core node glow -->
    <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="40%"  stop-color="#c4b5fd" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/>
    </radialGradient>

    <!-- Outer soft glow filter -->
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Stronger glow for core -->
    <filter id="coreFilter" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- ── Background ──────────────────────────────────────────────────────── -->
  <rect width="512" height="512" rx="102" fill="url(#bg)"/>
  <!-- Ambient center glow -->
  <rect width="512" height="512" rx="102" fill="url(#bgGlow)"/>

  <!-- ── Outer decorative ring (faint hex) ────────────────────────────────── -->
  <!-- Pointy-top hex, R=200, center (256,256) -->
  <!-- vertices: top(256,56) TR(429.2,156) BR(429.2,356) B(256,456) BL(82.8,356) TL(82.8,156) -->
  <polygon
    points="256,56 429,156 429,356 256,456 83,356 83,156"
    fill="none"
    stroke="url(#brand)"
    stroke-width="1"
    stroke-opacity="0.15"
  />

  <!-- ── Mid hex ring (dashed) ────────────────────────────────────────────── -->
  <!-- R=170, vertices: top(256,86) TR(403,171) BR(403,341) B(256,426) TL(109,171) BL(109,341) -->
  <polygon
    points="256,86 403,171 403,341 256,426 109,341 109,171"
    fill="none"
    stroke="url(#brand)"
    stroke-width="1.5"
    stroke-dasharray="12 8"
    stroke-opacity="0.25"
  />

  <!-- ── Main hexagon: filled + stroked ───────────────────────────────────── -->
  <!-- R=145, vertices -->
  <!-- 256-145*√3/2 = 256-125.6=130.4; 256+125.6=381.6; 256-72.5=183.5; 256+72.5=328.5 -->
  <!-- top(256,111) TR(382,183) BR(382,329) B(256,401) BL(130,329) TL(130,183) -->
  <polygon
    points="256,111 382,183 382,329 256,401 130,329 130,183"
    fill="url(#brand)"
    fill-opacity="0.08"
  />
  <polygon
    points="256,111 382,183 382,329 256,401 130,329 130,183"
    fill="none"
    stroke="url(#brand)"
    stroke-width="3"
    stroke-opacity="0.85"
    filter="url(#glow)"
  />

  <!-- ── Vertex nodes ──────────────────────────────────────────────────────── -->
  <!-- Top -->
  <circle cx="256" cy="111" r="9" fill="url(#brandLight)" filter="url(#glow)"/>
  <!-- Top-right -->
  <circle cx="382" cy="183" r="9" fill="url(#brandLight)" filter="url(#glow)"/>
  <!-- Bottom-right -->
  <circle cx="382" cy="329" r="9" fill="url(#brandLight)" filter="url(#glow)"/>
  <!-- Bottom -->
  <circle cx="256" cy="401" r="9" fill="url(#brandLight)" filter="url(#glow)"/>
  <!-- Bottom-left -->
  <circle cx="130" cy="329" r="9" fill="url(#brandLight)" filter="url(#glow)"/>
  <!-- Top-left -->
  <circle cx="130" cy="183" r="9" fill="url(#brandLight)" filter="url(#glow)"/>

  <!-- ── Spoke lines: vertices → center ────────────────────────────────────── -->
  <line x1="256" y1="256" x2="256" y2="111" stroke="url(#brandLight)" stroke-width="1.5" stroke-opacity="0.5"/>
  <line x1="256" y1="256" x2="382" y2="183" stroke="url(#brandLight)" stroke-width="1.5" stroke-opacity="0.5"/>
  <line x1="256" y1="256" x2="382" y2="329" stroke="url(#brandLight)" stroke-width="1.5" stroke-opacity="0.5"/>
  <line x1="256" y1="256" x2="256" y2="401" stroke="url(#brandLight)" stroke-width="1.5" stroke-opacity="0.5"/>
  <line x1="256" y1="256" x2="130" y2="329" stroke="url(#brandLight)" stroke-width="1.5" stroke-opacity="0.5"/>
  <line x1="256" y1="256" x2="130" y2="183" stroke="url(#brandLight)" stroke-width="1.5" stroke-opacity="0.5"/>

  <!-- ── Inner hexagon (bold) ─────────────────────────────────────────────── -->
  <!-- R=68, vertices -->
  <!-- 256-68*√3/2=256-58.9=197.1; 256+58.9=314.9; 256-34=222; 256+34=290 -->
  <!-- top(256,188) TR(315,222) BR(315,290) B(256,324) BL(197,290) TL(197,222) -->
  <polygon
    points="256,188 315,222 315,290 256,324 197,290 197,222"
    fill="url(#brand)"
    fill-opacity="0.18"
  />
  <polygon
    points="256,188 315,222 315,290 256,324 197,290 197,222"
    fill="none"
    stroke="url(#brandLight)"
    stroke-width="2.5"
    stroke-opacity="0.7"
  />

  <!-- ── Core hub ──────────────────────────────────────────────────────────── -->
  <!-- Outer glow halo -->
  <circle cx="256" cy="256" r="48" fill="url(#brand)" fill-opacity="0.25" filter="url(#coreFilter)"/>
  <!-- Solid ring -->
  <circle cx="256" cy="256" r="32" fill="url(#brand)" stroke="url(#brandLight)" stroke-width="2.5"/>
  <!-- Bright inner core -->
  <circle cx="256" cy="256" r="18" fill="url(#coreGlow)" filter="url(#coreFilter)"/>
  <!-- White hot center -->
  <circle cx="256" cy="256" r="8" fill="#ffffff" fill-opacity="0.95"/>
</svg>`

// ─── ICO binary builder ─────────────────────────────────────────────────────
// Standard ICO format: 6-byte header + 16-byte directory per image + raw PNG data.
function buildIco(images) {
  const HEADER_SIZE = 6
  const DIR_ENTRY_SIZE = 16
  const count = images.length
  let offset = HEADER_SIZE + count * DIR_ENTRY_SIZE

  // Header
  const header = Buffer.alloc(HEADER_SIZE)
  header.writeUInt16LE(0, 0)     // reserved — must be 0
  header.writeUInt16LE(1, 2)     // type: 1 = ICO
  header.writeUInt16LE(count, 4) // image count

  // Directory entries
  const dirs = images.map(({ size, buf }) => {
    const entry = Buffer.alloc(DIR_ENTRY_SIZE)
    entry.writeUInt8(size >= 256 ? 0 : size, 0)  // width  (0 encodes 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1)  // height (0 encodes 256)
    entry.writeUInt8(0, 2)                        // color count (0 = true color)
    entry.writeUInt8(0, 3)                        // reserved
    entry.writeUInt16LE(1, 4)                     // color planes
    entry.writeUInt16LE(32, 6)                    // bits per pixel
    entry.writeUInt32LE(buf.length, 8)            // byte size of this image
    entry.writeUInt32LE(offset, 12)               // offset from file start
    offset += buf.length
    return entry
  })

  return Buffer.concat([header, ...dirs, ...images.map((i) => i.buf)])
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('ZenDev icon generator starting...\n')

  const svgBuffer = Buffer.from(SVG)

  // ── 512×512 PNG ──────────────────────────────────────────────────────────
  const png512 = await sharp(svgBuffer, { density: 300 })
    .resize(512, 512)
    .png({ compressionLevel: 9, quality: 100 })
    .toBuffer()
  fs.writeFileSync(path.join(OUT, 'icon.png'), png512)
  console.log(`✓  icon.png        512×512  (${(png512.length / 1024).toFixed(1)} KB)`)

  // ── ICO: 16 / 32 / 48 / 64 / 128 / 256 px ───────────────────────────────
  const ICO_SIZES = [16, 32, 48, 64, 128, 256]
  const icoImages = await Promise.all(
    ICO_SIZES.map(async (size) => {
      const buf = await sharp(svgBuffer, { density: 300 })
        .resize(size, size)
        .png()
        .toBuffer()
      console.log(`   → ${String(size).padStart(3)}×${size}  (${(buf.length / 1024).toFixed(1)} KB)`)
      return { size, buf }
    })
  )
  const ico = buildIco(icoImages)
  fs.writeFileSync(path.join(OUT, 'icon.ico'), ico)
  console.log(`✓  icon.ico        multi-size  (${(ico.length / 1024).toFixed(1)} KB)`)

  console.log(`\nAll icons written to: ${OUT}`)
}

main().catch((err) => {
  console.error('✗ Icon generation failed:', err.message)
  process.exit(1)
})
