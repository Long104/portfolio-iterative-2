import { useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ==========================================
// 1. PROCEDURAL TEXTURES (Canvas-based)
//    Flat, hand-drawn animation style —
//    no soft alpha gradients.
// ==========================================

function createStarTexture(): THREE.Texture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const c = size / 2

  // Solid bright core
  ctx.fillStyle = 'rgba(255,255,255,1)'
  ctx.beginPath()
  ctx.arc(c, c, c * 0.15, 0, Math.PI * 2)
  ctx.fill()

  // Sharp 4-point cross spikes (full alpha, thick lines)
  ctx.save()
  ctx.translate(c, c)
  for (let i = 0; i < 2; i++) {
    const spike = ctx.createLinearGradient(-c, 0, c, 0)
    spike.addColorStop(0, 'rgba(255,255,255,0)')
    spike.addColorStop(0.46, 'rgba(255,255,255,0)')
    spike.addColorStop(0.49, 'rgba(255,255,255,1)')
    spike.addColorStop(0.51, 'rgba(255,255,255,1)')
    spike.addColorStop(0.54, 'rgba(255,255,255,0)')
    spike.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = spike
    ctx.fillRect(-c, -2, size, 4)
    ctx.rotate(Math.PI / 2)
  }
  ctx.restore()

  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

function createPetalTexture(): THREE.Texture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const c = size / 2

  // Flat solid oval — painted pink debris
  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.beginPath()
  ctx.ellipse(c, c, c * 0.8, c * 0.3, 0, 0, Math.PI * 2)
  ctx.fill()

  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

function createBlobTexture(): THREE.Texture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const c = size / 2

  // Irregular wobbly silhouette — looks painted, not geometric.
  // Multi-frequency sine wobble on the circumference radius.
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.beginPath()
  const segments = 24
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2
    const wobble =
      0.68 +
      Math.sin(angle * 3.7) * 0.10 +
      Math.cos(angle * 5.3) * 0.07 +
      Math.sin(angle * 11.0) * 0.04
    const r = c * wobble
    const x = c + Math.cos(angle) * r
    const y = c + Math.sin(angle) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fill()

  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

// ==========================================
// 2. SHADERS
// ==========================================

// ── Layer A: Fullscreen backdrop ──────────────────────
// Dark teal edges → luminous mint green center.
// The bright center creates a vibrant canvas for the
// explosion to clash against.
const backdropVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`

const backdropFragment = /* glsl */ `
  varying vec2 vUv;
  void main() {
    float dist = distance(vUv, vec2(0.5));

    vec3 brightMint  = vec3(0.20, 0.90, 0.72);
    vec3 midTeal     = vec3(0.02, 0.35, 0.38);
    vec3 darkTeal    = vec3(0.0, 0.06, 0.12);

    vec3 color = mix(brightMint, midTeal, smoothstep(0.05, 0.45, dist));
    color = mix(color, darkTeal, smoothstep(0.45, 0.85, dist));

    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`

// ── Layer B: Fluid particles (petals + blobs) ─────────
const particleVertex = /* glsl */ `
  uniform float uTime;
  uniform float uSpeed;
  attribute vec3 aInitialPos;
  attribute vec3 aRandoms;

  varying vec2 vUv;
  varying float vType;
  varying float vDepth;

  void main() {
    vUv = uv;
    vType = aRandoms.z;
    vec3 pos = aInitialPos;

    pos.z += uTime * uSpeed * (0.8 + aRandoms.x * 0.4);
    pos.z = mod(pos.z + 60.0, 70.0) - 60.0;

    float r = length(pos.xy);
    if (r < 5.0) pos.xy = normalize(pos.xy + 0.001) * (5.0 + aRandoms.x * 3.0);

    float wave = sin(pos.z * 0.1 + uTime + aRandoms.y * 6.28) * 0.5;
    pos.x += cos(wave) * 0.5;
    pos.y += sin(wave) * 0.5;

    vDepth = clamp((pos.z + 60.0) / 65.0, 0.0, 1.0);

    float baseScale = (vType < 0.5) ? 1.2 : 3.0;
    float scale = baseScale * (0.2 + pow(vDepth, 3.0) * 12.0);

    float angle = pos.z * 0.05 + aRandoms.y * 6.28;
    float s = sin(angle);
    float c = cos(angle);
    vec3 transformed = position;
    transformed.xy = mat2(c, -s, s, c) * transformed.xy;

    vec4 mvPos = modelViewMatrix * vec4(pos + transformed * scale, 1.0);
    gl_Position = projectionMatrix * mvPos;
  }
`

const particleFragment = /* glsl */ `
  uniform sampler2D uTexPetal;
  uniform sampler2D uTexBlob;
  varying vec2 vUv;
  varying float vType;
  varying float vDepth;

  void main() {
    vec4 texColor;
    vec3 finalColor;
    float opacity;

    if (vType < 0.5) {
      // Flat solid pink ovals
      texColor = texture2D(uTexPetal, vUv);
      finalColor = vec3(1.0, 0.4, 0.6);
      opacity = texColor.a;
    } else {
      // Near-black silhouettes — deep dark debris
      texColor = texture2D(uTexBlob, vUv);
      finalColor = vec3(0.0, 0.03, 0.05);
      opacity = texColor.a * 0.95;
    }

    float alphaFade = smoothstep(1.0, 0.85, vDepth);
    gl_FragColor = vec4(finalColor, opacity * alphaFade);

    #include <colorspace_fragment>
  }
`

// ── Layer C: Radiant star flares (additive) ───────────
// Bright neon green + yellow laser streaks.
const flareVertex = /* glsl */ `
  uniform float uTime;
  uniform float uSpeed;
  attribute vec3 aInitialPos;
  attribute vec3 aRandoms;
  varying vec2 vUv;
  varying float vDepth;
  varying float vColorPhase;

  void main() {
    vUv = uv;
    vColorPhase = aRandoms.y;
    vec3 pos = aInitialPos;

    pos.z += uTime * uSpeed * (1.0 + aRandoms.x * 0.6);
    pos.z = mod(pos.z + 60.0, 70.0) - 60.0;

    float r = length(pos.xy);
    if (r < 4.0) pos.xy = normalize(pos.xy + 0.001) * (4.0 + aRandoms.x * 2.0);

    vDepth = clamp((pos.z + 60.0) / 65.0, 0.0, 1.0);
    float scale = 0.5 * (0.2 + pow(vDepth, 2.5) * 5.5);

    // Radial stretch — extreme for anime speed lines
    vec3 transformed = position;
    vec2 dir = normalize(pos.xy + 0.001);
    float stretch = 1.0 + (vDepth * 20.0); // Extreme stretch for long anime speed lines
    transformed.xy += dir * dot(transformed.xy, dir) * (stretch - 1.0);

    vec4 mvPos = modelViewMatrix * vec4(pos + transformed * scale, 1.0);
    gl_Position = projectionMatrix * mvPos;
  }
`

const flareFragment = /* glsl */ `
  uniform sampler2D uTexStar;
  varying vec2 vUv;
  varying float vDepth;
  varying float vColorPhase;

  void main() {
    vec4 texColor = texture2D(uTexStar, vUv);

    // Hard 50/50 split: pure green vs pure yellow — no gradient
    vec3 greenLaser  = vec3(0.35, 1.0, 0.25);
    vec3 yellowLaser = vec3(1.0, 0.88, 0.15);
    vec3 glow = mix(greenLaser, yellowLaser, step(0.5, vColorPhase));

    float alphaFade = smoothstep(1.0, 0.72, vDepth);
    gl_FragColor = vec4(glow, texColor.a * alphaFade);

    #include <colorspace_fragment>
  }
`

// ── Layer D: Explosive core glow (on top) ─────────────
// Real 2D domain-warped noise creates a chaotic paint
// splatter. Yellow center → orange-red → vibrant pink.
// Slowly evolves over time so the explosion "boils."
const glowVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`

const glowFragment = /* glsl */ `
  uniform float uAspect;
  uniform float uTime;
  varying vec2 vUv;

  // ── 2D hash + value noise + fbm ───────────────────
  // These give us real 2D chaos (not angular-only spokes).
  float hash21(vec2 p) {
    p = fract(p * vec2(233.34, 851.73));
    p += dot(p, p + 23.45);
    return fract(p.x * p.y);
  }

  float noise2D(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise2D(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 centered = vUv - vec2(0.5);
    centered.x *= uAspect;

    // Domain warp — reduced amplitude for tight, contained blast.
    // 2D fbm gives real chaos in BOTH x and y (not angular spokes).
    float t = uTime * 0.06;
    float warpX = fbm(centered * 8.0 + vec2(t, 0.0));
    float warpY = fbm(centered * 8.0 + vec2(0.0, t) + 50.0);
    vec2 warped = centered + (vec2(warpX, warpY) - 0.5) * 0.035;
    float dist = length(warped);

    // Secondary noise for edge splatter variation
    float splatter = fbm(centered * 22.0 + 100.0);

    // ── Three-stop color ramp (TIGHT) ──────────────
    vec3 coreColor    = vec3(1.0, 0.92, 0.15);  // intense yellow
    vec3 midColor     = vec3(1.0, 0.35, 0.22);   // hot orange-red
    vec3 splatterCol  = vec3(0.92, 0.15, 0.42);  // vibrant pink

    // Shrunk from 0.08/0.18 → 0.03/0.07 — tight contained burst
    float coreEdge   = 0.03 + (splatter - 0.5) * 0.012;
    float midEdge    = 0.07 + (splatter - 0.5) * 0.018;

    vec3 color = mix(coreColor, midColor, smoothstep(coreEdge, coreEdge + 0.035, dist));
    color = mix(color, splatterCol, smoothstep(midEdge, midEdge + 0.05, dist));

    // ── Alpha: HARD jagged falloff (shrunk ~3x) ────
    float alpha = 1.0 - smoothstep(0.08, 0.14, dist + (warpX - 0.5) * 0.025);

    // ── Isolated splatter dots (tight ring around blast) ──
    float dots = smoothstep(0.72, 0.88, fbm(centered * 32.0 + 200.0));
    float dotMask = dots * smoothstep(0.22, 0.10, dist) * smoothstep(0.06, 0.12, dist);
    alpha = max(alpha, dotMask * 0.6);

    // Overall fade so splatter dots don't extend forever
    alpha *= (1.0 - smoothstep(0.25, 0.50, length(centered)));

    gl_FragColor = vec4(color, alpha);

    #include <colorspace_fragment>
  }
`

// ==========================================
// 3. SCENE COMPONENT
// ==========================================

const PAINT_COUNT = 4500
const FLARE_COUNT = 2500

function generateInstanceData(count: number, maxRadius: number) {
  const pos = new Float32Array(count * 3)
  const rand = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const radius = Math.random() * maxRadius
    pos[i * 3] = Math.cos(angle) * radius
    pos[i * 3 + 1] = Math.sin(angle) * radius
    pos[i * 3 + 2] = Math.random() * -60

    rand[i * 3] = Math.random()
    rand[i * 3 + 1] = Math.random()
    rand[i * 3 + 2] = Math.random()
  }
  return { pos, rand }
}

function KiraKiraVortex() {
  const starTex = useMemo(() => createStarTexture(), [])
  const petalTex = useMemo(() => createPetalTexture(), [])
  const blobTex = useMemo(() => createBlobTexture(), [])

  const backdropMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: backdropVertex,
        fragmentShader: backdropFragment,
        depthWrite: false,
        depthTest: false,
      }),
    [],
  )

  const paintMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uSpeed: { value: 0.18 },
          uTexPetal: { value: petalTex },
          uTexBlob: { value: blobTex },
        },
        vertexShader: particleVertex,
        fragmentShader: particleFragment,
        transparent: true,
        depthWrite: false,
      }),
    [petalTex, blobTex],
  )

  const flareMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uSpeed: { value: 0.28 },
          uTexStar: { value: starTex },
        },
        vertexShader: flareVertex,
        fragmentShader: flareFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [starTex],
  )

  const glowMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uAspect: { value: window.innerWidth / window.innerHeight },
          uTime: { value: 0 },
        },
        vertexShader: glowVertex,
        fragmentShader: glowFragment,
        transparent: true,
        depthWrite: false,
        depthTest: false,
      }),
    [],
  )

  const backdropGeo = useMemo(() => new THREE.PlaneGeometry(2, 2), [])

  const paintGeo = useMemo(() => {
    const { pos, rand } = generateInstanceData(PAINT_COUNT, 14.0)
    const geo = new THREE.PlaneGeometry(0.4, 0.4)
    geo.setAttribute('aInitialPos', new THREE.InstancedBufferAttribute(pos, 3))
    geo.setAttribute('aRandoms', new THREE.InstancedBufferAttribute(rand, 3))
    return geo
  }, [])

  const flareGeo = useMemo(() => {
    const { pos, rand } = generateInstanceData(FLARE_COUNT, 12.0)
    const geo = new THREE.PlaneGeometry(0.3, 0.3)
    geo.setAttribute('aInitialPos', new THREE.InstancedBufferAttribute(pos, 3))
    geo.setAttribute('aRandoms', new THREE.InstancedBufferAttribute(rand, 3))
    return geo
  }, [])

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    paintMat.uniforms.uTime.value = t
    flareMat.uniforms.uTime.value = t
    glowMat.uniforms.uTime.value = t
    glowMat.uniforms.uAspect.value = state.size.width / state.size.height
  })

  return (
    <>
      {/* Layer A: Fullscreen backdrop — dark teal → bright mint */}
      <mesh geometry={backdropGeo} material={backdropMat} renderOrder={-1} />

      {/* Layer B: Flat painted debris (alpha blending) */}
      <instancedMesh
        args={[paintGeo, paintMat, PAINT_COUNT]}
        frustumCulled={false}
      />

      {/* Layer C: Neon green/yellow laser streaks (additive) */}
      <instancedMesh
        args={[flareGeo, flareMat, FLARE_COUNT]}
        frustumCulled={false}
      />

      {/* Layer D: Chaotic explosive core — always on top */}
      <mesh geometry={backdropGeo} material={glowMat} renderOrder={1} />
    </>
  )
}

// ==========================================
// 4. EXPORT
// ==========================================

export default function Scene() {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#010a0e',
      }}
    >
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        <KiraKiraVortex />
      </Canvas>
    </div>
  )
}
