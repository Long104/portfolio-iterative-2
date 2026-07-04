import {
  CanvasTexture,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  NearestFilter,
  RepeatWrapping,
  RGBAFormat,
  SRGBColorSpace,
  Texture,
  UnsignedByteType,
} from "three";


export function createStarTexture(): Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const c = size / 2;

  // Radial glow core
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c * 0.5);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.2, "rgba(255,255,220,0.9)");
  grad.addColorStop(0.5, "rgba(255,230,150,0.3)");
  grad.addColorStop(1, "rgba(255,230,150,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Cross-shaped star spikes
  ctx.save();
  ctx.translate(c, c);
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 2; i++) {
    const spike = ctx.createLinearGradient(-c, 0, c, 0);
    spike.addColorStop(0, "rgba(255,255,255,0)");
    spike.addColorStop(0.45, "rgba(255,255,255,0)");
    spike.addColorStop(0.5, "rgba(255,255,240,0.7)");
    spike.addColorStop(0.55, "rgba(255,255,255,0)");
    spike.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = spike;
    ctx.fillRect(-c, -1, size, 2);
    ctx.rotate(Math.PI / 2);
  }
  ctx.restore();

  const tex = new CanvasTexture(canvas);
  tex.generateMipmaps = false;
  tex.minFilter = LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export function createPetalTexture(): Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const c = size / 2;

  // Soft radial alpha mask
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c * 0.65);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.8)");
  grad.addColorStop(0.7, "rgba(255,255,255,0.3)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new CanvasTexture(canvas);
  tex.generateMipmaps = false;
  tex.minFilter = LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export function createBlobTexture(): Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const c = size / 2;

  // Larger, softer blob
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c * 0.85);
  grad.addColorStop(0, "rgba(255,255,255,0.9)");
  grad.addColorStop(0.3, "rgba(255,255,255,0.6)");
  grad.addColorStop(0.6, "rgba(255,255,255,0.25)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(c, c, c * 0.85, 0, Math.PI * 2);
  ctx.fill();

  const tex = new CanvasTexture(canvas);
  tex.generateMipmaps = false;
  tex.minFilter = LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

// 15-stop depth gradient baked into a 256×1 LUT.
// Edit colors here — no shader changes ever needed.
export function createGradientLUT(): Texture {
  const w = 256;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = 1;
  const ctx = canvas.getContext("2d")!;

  const stops: [number, string][] = [
    [0.0, "#FEFDF7"], // whiteCore
    [0.03, "#FEFFB4"], // whiteCore
    [0.071, "#FEFD88"], // coreYellow
    [0.132, "#FDABB8"], // hotPink
    [0.467, "#FAB0CE"], // amber
    [0.632, "#0CE3B6"], // mintGlow
    [0.786, "#015168"], // blueBlue
    [0.857, "#00161d"], // deepBlue
    [0.929, "#013D50"], // darkForest
    [0.945, "#072D42"], // darkJade
    [1.0, "#000508"], // deepBlack
  ];

  const grad = ctx.createLinearGradient(0, 0, w, 0);
  for (const [offset, color] of stops) grad.addColorStop(offset, color);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, 1);

  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// 10×1 LUT of flare colors — sampled in the flare fragment shader
// instead of initializing a vec3[10] array per pixel.
export function createFlareColorLUT(): Texture {
  const w = 10;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = 1;
  const ctx = canvas.getContext("2d")!;

  const colors: [number, string][] = [
    [0.0, "#F890A8"],
    [0.1, "#F9B9CA"],
    [0.2, "#8CFF96"],
    [0.3, "#EDFFB6"],
    [0.4, "#D0FFAF"],
    [0.5, "#FEDBE4"],
    [0.6, "#FFFFB6"],
    [0.7, "#FDD0DA"],
    [0.8, "#FB889E"],
    [0.9, "#FFFDDA"],
  ];

  for (let i = 0; i < w; i++) {
    ctx.fillStyle = colors[i][1];
    ctx.fillRect(i, 0, 1, 1);
  }

  const tex = new CanvasTexture(canvas);
  tex.minFilter = NearestFilter;
  tex.magFilter = NearestFilter;
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// ── Baked noise+FBM texture ──
// Replaces per-pixel noise()/fbm() ALU in the glow shader with a single
// texture lookup. Exact GLSL hash/ noise/ fbm ported to JS and baked at init.
// R channel = value noise, G channel = 2-octave fbm.
// 512×512 with 8×8 cells = 64px/cell → no visible tiling at screen coords.

/** GLSL hash(vec2) → JS */
function hash(x: number, y: number): number {
  const val = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return val - Math.floor(val);
}

/** GLSL noise(vec2) — value noise with smoothstep interpolation → JS */
function noise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3.0 - 2.0 * fx);
  const uy = fy * fy * (3.0 - 2.0 * fy);
  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

/** GLSL 2-octave fbm → JS */
function fbm(x: number, y: number): number {
  let v = 0;
  let a = 0.5;
  let px = x;
  let py = y;
  for (let i = 0; i < 2; i++) {
    v += a * noise(px, py);
    const rpx = px * 0.8776 - py * 0.4794;
    const rpy = px * 0.4794 + py * 0.8776;
    px = rpx * 2.5 + 100.0;
    py = rpy * 2.5 + 100.0;
    a *= 0.5;
  }
  return v;
}

export function createNoiseTexture(): Texture {
  const size = 512;
  const cells = 8;
  const cellPx = size / cells; // 64px per noise cell

  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / cellPx;
      const ny = y / cellPx;
      const n = noise(nx, ny);
      const f = fbm(nx, ny);
      const idx = (y * size + x) * 4;
      data[idx] = Math.round(n * 255);     // R: noise
      data[idx + 1] = Math.round(f * 255); // G: fbm
      data[idx + 2] = 0;
      data[idx + 3] = 255;
    }
  }

  const tex = new DataTexture(data, size, size);
  tex.format = RGBAFormat;
  tex.type = UnsignedByteType;
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}
