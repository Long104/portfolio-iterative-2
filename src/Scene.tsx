import { useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ==========================================
// 1. PROCEDURAL TEXTURES — HARD-EDGED 2D CUTOUTS
//    No soft gradients. Flat alpha masks.
//    Gundam-style graphic shapes.
// ==========================================

function createStarTexture(): THREE.Texture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const c = size / 2

  // Hard-edged 4-point starburst
  ctx.fillStyle = 'rgba(0,0,0,0)'
  ctx.fillRect(0, 0, size, size)

  ctx.save()
  ctx.translate(c, c)

  // Draw sharp cross spikes (hard alpha)
  for (let i = 0; i < 2; i++) {
    ctx.fillStyle = 'rgba(255,255,255,1)'
    ctx.beginPath()
    ctx.moveTo(-c, -1.5)
    ctx.lineTo(0, -4)
    ctx.lineTo(c, -1.5)
    ctx.lineTo(c, 1.5)
    ctx.lineTo(0, 4)
    ctx.lineTo(-c, 1.5)
    ctx.closePath()
    ctx.fill()
    ctx.rotate(Math.PI / 2)
  }

  // Hard center circle
  ctx.beginPath()
  ctx.arc(0, 0, c * 0.18, 0, Math.PI * 2)
  ctx.fill()

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

  // Hard-edged solid oval (petal shape)
  ctx.fillStyle = 'rgba(255,255,255,1)'
  ctx.beginPath()
  ctx.ellipse(c, c, c * 0.55, c * 0.35, 0, 0, Math.PI * 2)
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

  // Hard-edged solid circle (silhouette shape)
  ctx.fillStyle = 'rgba(255,255,255,1)'
  ctx.beginPath()
  ctx.arc(c, c, c * 0.9, 0, Math.PI * 2)
  ctx.fill()

  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

// ==========================================
// 2. SHADERS — FLAT COLOR, HARD THRESHOLDS
//    No smoothstep gradients. Step functions.
//    No colorspace_fragment — raw sRGB output.
// ==========================================

// Layer A: Static fullscreen backdrop
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

    // Flat teal void — slight vignette via step
    vec3 dark = vec3(0.01, 0.03, 0.05);
    vec3 teal = vec3(0.02, 0.15, 0.18);

    // Hard-ish vignette: dark center, teal edges
    float t = step(0.15, dist);
    vec3 color = mix(dark, teal, smoothstep(0.15, 0.55, dist));

    gl_FragColor = vec4(color, 1.0);
    // NO colorspace_fragment — raw output
  }
`

// Layer B: Fluid particles — sharp petals + massive dark silhouettes
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

    // Z-Axis flow (sucking-in effect)
    pos.z += uTime * uSpeed * (0.8 + aRandoms.x * 0.4);
    pos.z = mod(pos.z + 60.0, 70.0) - 60.0;

    // Center clearance — keep the glowing core visible
    float r = length(pos.xy);
    if (r < 5.0) pos.xy = normalize(pos.xy + 0.001) * (5.0 + aRandoms.x * 3.0);

    // Liquid water-flow math
    float wave = sin(pos.z * 0.1 + uTime + aRandoms.y * 6.28) * 0.5;
    pos.x += cos(wave) * 0.5;
    pos.y += sin(wave) * 0.5;

    vDepth = clamp((pos.z + 60.0) / 65.0, 0.0, 1.0);

    // Scale: petals normal, dark blobs MASSIVE
    float baseScale;
    if (vType < 0.5) {
      // Pink petals — moderate scale
      baseScale = 1.0;
    } else {
      // Dark silhouettes — 8x larger for "face hit" effect
      baseScale = 8.0;
    }
    float scale = baseScale * (0.2 + pow(vDepth, 3.0) * 15.0);

    // Spin particles
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

    if (vType < 0.5) {
      // HOT PINK petals — flat solid color, slight depth variation
      texColor = texture2D(uTexPetal, vUv);
      vec3 hotPink = vec3(1.0, 0.15, 0.45);
      vec3 lightPink = vec3(1.0, 0.4, 0.6);
      finalColor = mix(hotPink, lightPink, vDepth);

      // Petals fade near camera but not as aggressively
      float alphaFade = smoothstep(1.0, 0.90, vDepth);
      gl_FragColor = vec4(finalColor, texColor.a * alphaFade);
    } else {
      // DARK TEAL/BLACK silhouettes — semi-transparent at camera
      texColor = texture2D(uTexBlob, vUv);
      finalColor = vec3(0.005, 0.04, 0.06);

      // Lock to ~55% opacity when near camera — silhouette depth trick
      // Far away: mostly invisible. Close: semi-transparent dark overlay.
      float silhouetteAlpha = smoothstep(0.3, 0.75, vDepth) * 0.55;
      gl_FragColor = vec4(finalColor, texColor.a * silhouetteAlpha);
    }

    // NO colorspace_fragment — raw flat color output
  }
`

// Layer C: Radiant star flares — NEON GREEN + YELLOW
const flareVertex = /* glsl */ `
  uniform float uTime;
  uniform float uSpeed;
  attribute vec3 aInitialPos;
  attribute vec3 aRandoms;
  varying vec2 vUv;
  varying float vDepth;
  varying float vColorType;

  void main() {
    vUv = uv;
    vColorType = aRandoms.z; // 0-1, split at 0.5 for green vs yellow
    vec3 pos = aInitialPos;

    pos.z += uTime * uSpeed * (1.0 + aRandoms.x * 0.5);
    pos.z = mod(pos.z + 60.0, 70.0) - 60.0;

    float r = length(pos.xy);
    if (r < 4.0) pos.xy = normalize(pos.xy + 0.001) * (4.0 + aRandoms.x * 2.0);

    vDepth = clamp((pos.z + 60.0) / 65.0, 0.0, 1.0);
    float scale = 0.5 * (0.2 + pow(vDepth, 2.5) * 6.0);

    // Radial forward-motion streak
    vec3 transformed = position;
    vec2 dir = normalize(pos.xy + 0.001);
    float stretch = 1.0 + (vDepth * 3.0);
    transformed.xy += dir * dot(transformed.xy, dir) * (stretch - 1.0);

    vec4 mvPos = modelViewMatrix * vec4(pos + transformed * scale, 1.0);
    gl_Position = projectionMatrix * mvPos;
  }
`

const flareFragment = /* glsl */ `
  uniform sampler2D uTexStar;
  varying vec2 vUv;
  varying float vDepth;
  varying float vColorType;

  void main() {
    vec4 texColor = texture2D(uTexStar, vUv);

    // 50% NEON GREEN, 50% BRIGHT YELLOW — flat solid
    vec3 neonGreen = vec3(0.4, 1.0, 0.15);
    vec3 brightYellow = vec3(1.0, 0.85, 0.1);

    vec3 flareColor = mix(neonGreen, brightYellow, step(0.5, vColorType));

    // Slight brightness boost near camera
    flareColor *= (0.7 + vDepth * 0.6);

    float alphaFade = smoothstep(1.0, 0.80, vDepth);
    gl_FragColor = vec4(flareColor, texColor.a * alphaFade);

    // NO colorspace_fragment — raw neon output
  }
`

// Layer D: Foreground core glow — HARD THRESHOLD STAR
// Solid yellow core + solid pink halo. No gradients.
const glowVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`

const glowFragment = /* glsl */ `
  uniform float uAspect;
  varying vec2 vUv;
  void main() {
    vec2 centered = vUv - vec2(0.5);
    centered.x *= uAspect;
    float dist = length(centered);

    // HARD THRESHOLDS — no smoothstep
    vec3 coreColor = vec3(1.0, 0.92, 0.2);   // Solid warm yellow
    vec3 haloColor = vec3(1.0, 0.1, 0.35);   // Solid hot pink

    vec3 color;
    float alpha;

    if (dist < 0.06) {
      // Solid yellow core — zero falloff
      color = coreColor;
      alpha = 1.0;
    } else if (dist < 0.15) {
      // Solid pink halo ring — hard edge
      color = haloColor;
      alpha = 1.0;
    } else if (dist < 0.18) {
      // Sharp cutoff edge
      color = haloColor;
      alpha = 0.85;
    } else {
      // Nothing beyond
      color = vec3(0.0);
      alpha = 0.0;
    }

    gl_FragColor = vec4(color, alpha);

    // NO colorspace_fragment — raw punchy color
  }
`

// ==========================================
// 3. SCENE COMPONENT
// ==========================================

const PAINT_COUNT = 5500 // Petals + Blobs
const FLARE_COUNT = 3000 // Star flares

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
  // --- Procedural textures ---
  const starTex = useMemo(() => createStarTexture(), [])
  const petalTex = useMemo(() => createPetalTexture(), [])
  const blobTex = useMemo(() => createBlobTexture(), [])

  // --- Materials ---
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
          uSpeed: { value: 0.15 },
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
          uSpeed: { value: 0.2 },
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
        },
        vertexShader: glowVertex,
        fragmentShader: glowFragment,
        transparent: true,
        depthWrite: false,
        depthTest: false,
      }),
    [],
  )

  // --- Geometry with instanced attributes ---
  const backdropGeo = useMemo(() => new THREE.PlaneGeometry(2, 2), [])

  const paintGeo = useMemo(() => {
    const { pos, rand } = generateInstanceData(PAINT_COUNT, 14.0)
    const geo = new THREE.PlaneGeometry(0.4, 0.4)
    geo.setAttribute('aInitialPos', new THREE.InstancedBufferAttribute(pos, 3))
    geo.setAttribute('aRandoms', new THREE.InstancedBufferAttribute(rand, 3))
    return geo
  }, [])

  const flareGeo = useMemo(() => {
    const { pos, rand } = generateInstanceData(FLARE_COUNT, 10.0)
    const geo = new THREE.PlaneGeometry(0.3, 0.3)
    geo.setAttribute('aInitialPos', new THREE.InstancedBufferAttribute(pos, 3))
    geo.setAttribute('aRandoms', new THREE.InstancedBufferAttribute(rand, 3))
    return geo
  }, [])

  // --- Animation loop ---
  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    paintMat.uniforms.uTime.value = t
    flareMat.uniforms.uTime.value = t
    glowMat.uniforms.uAspect.value = state.size.width / state.size.height
  })

  return (
    <>
      {/* Layer A: Static fullscreen backdrop */}
      <mesh geometry={backdropGeo} material={backdropMat} renderOrder={-1} />

      {/* Layer B: Fluid particles — pink petals + dark silhouettes */}
      <instancedMesh
        args={[paintGeo, paintMat, PAINT_COUNT]}
        frustumCulled={false}
      />

      {/* Layer C: Star flares — neon green + yellow (additive) */}
      <instancedMesh
        args={[flareGeo, flareMat, FLARE_COUNT]}
        frustumCulled={false}
      />

      {/* Layer D: Foreground core glow — hard yellow + pink */}
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
        background: '#020d12',
      }}
    >
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        <KiraKiraVortex />
      </Canvas>
    </div>
  )
}
