import { useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { EffectComposer, Bloom } from '@react-three/postprocessing'

// ==========================================
// 1. PROCEDURAL TEXTURES (Canvas-based)
//    White alpha masks — coloring is done
//    in the fragment shaders.
// ==========================================

function createStarTexture(): THREE.Texture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const c = size / 2

  // Radial glow core
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c * 0.5)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.2, 'rgba(255,255,220,0.9)')
  grad.addColorStop(0.5, 'rgba(255,230,150,0.3)')
  grad.addColorStop(1, 'rgba(255,230,150,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)

  // Cross-shaped star spikes
  ctx.save()
  ctx.translate(c, c)
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 2; i++) {
    const spike = ctx.createLinearGradient(-c, 0, c, 0)
    spike.addColorStop(0, 'rgba(255,255,255,0)')
    spike.addColorStop(0.45, 'rgba(255,255,255,0)')
    spike.addColorStop(0.5, 'rgba(255,255,240,0.7)')
    spike.addColorStop(0.55, 'rgba(255,255,255,0)')
    spike.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = spike
    ctx.fillRect(-c, -1, size, 2)
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

  // Soft radial alpha mask
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c * 0.65)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.4, 'rgba(255,255,255,0.8)')
  grad.addColorStop(0.7, 'rgba(255,255,255,0.3)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)

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

  // Larger, softer blob
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c * 0.85)
  grad.addColorStop(0, 'rgba(255,255,255,0.9)')
  grad.addColorStop(0.3, 'rgba(255,255,255,0.6)')
  grad.addColorStop(0.6, 'rgba(255,255,255,0.25)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(c, c, c * 0.85, 0, Math.PI * 2)
  ctx.fill()

  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

// ==========================================
// 2. SHADERS
// ==========================================

// Layer A: Static fullscreen backdrop (prevents black hole)
const backdropVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`

const backdropFragment = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;

  // Reliable 2D Noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i); // Avoid truncation effects in permutation
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ; m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5; vec3 ox = floor(x + 0.5); vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g; g.x  = a0.x  * x0.x  + h.x  * x0.y; g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    vec2 pos = vUv * 3.0;
    float n = snoise(pos - uTime * 0.5); 
    
    // Anime Colors: Mint green base with bright cyan patches
    vec3 mint = vec3(0.2, 0.8, 0.5);
    vec3 cyan = vec3(0.0, 1.0, 0.8);
    vec3 darkTeal = vec3(0.02, 0.15, 0.2);

    // Harder mixing for a "painted" look
    vec3 color = mix(mint, cyan, smoothstep(0.0, 0.5, n));
    
    // Add a slight dark vignette at the edges to frame it
    float dist = distance(vUv, vec2(0.5));
    color = mix(color, darkTeal, smoothstep(0.3, 0.8, dist));

    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`

// Layer B: Fluid particles (petals + blobs, normal alpha blending)
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

    // Liquid water-flow math (sine/cosine offset X/Y paths)
    float wave = sin(pos.z * 0.1 + uTime + aRandoms.y * 6.28) * 0.5;
    pos.x += cos(wave) * 0.5;
    pos.y += sin(wave) * 0.5;

    vDepth = clamp((pos.z + 60.0) / 65.0, 0.0, 1.0);

    // Scale: microscopic far away, massive near camera
    float baseScale = (vType < 0.5) ? 1.0 : 2.5;
    float scale = baseScale * (0.2 + pow(vDepth, 3.0) * 15.0);

    // Spin particles along the current
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
    float alpha;

    if (vType < 0.5) {
      // Midground: Solid Hot Pink Streaks
      texColor = texture2D(uTexPetal, vUv);
      finalColor = vec3(1.0, 0.3, 0.6); 
      alpha = texColor.a * smoothstep(1.0, 0.8, vDepth);
    } else {
      // Extreme Foreground: Pitch Black Anime Silhouettes
      texColor = texture2D(uTexBlob, vUv);
      finalColor = vec3(0.01, 0.02, 0.03); // Almost black
      alpha = texColor.a * 0.95; // Do not fade these out, keep them solid
    }

    gl_FragColor = vec4(finalColor, alpha);
    #include <colorspace_fragment>
  }
`

// Layer C: Radiant star flares (additive blending)
const flareVertex = /* glsl */ `
  uniform float uTime;
  uniform float uSpeed;
  attribute vec3 aInitialPos;
  attribute vec3 aRandoms;
  varying vec2 vUv;
  varying float vDepth;
  varying float vRandom;

  void main() {
    vUv = uv;
    vRandom = aRandoms.x;
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
  varying float vRandom;

  void main() {
    vec4 texColor = texture2D(uTexStar, vUv);
    
    // Mix between pure white and bright lime green based on the random attribute
    vec3 white = vec3(1.0, 1.0, 1.0);
    vec3 animeGreen = vec3(0.2, 1.0, 0.4);
    vec3 color = mix(white, animeGreen, step(0.5, vRandom));

    float alphaFade = smoothstep(1.0, 0.80, vDepth);
    gl_FragColor = vec4(color, texColor.a * alphaFade);
    #include <colorspace_fragment>
  }
`

// Layer D: Foreground core glow (renders ON TOP of particles)
// Guarantees the yellow core + pink halo are always visible.
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

  void main() {
    vec2 centered = vUv - vec2(0.5);
    centered.x *= uAspect;
    
    float angle = atan(centered.y, centered.x);
    float baseRadius = length(centered);

    // Create chaotic, jagged splatter edges
    float jagged = sin(angle * 15.0 + uTime * 5.0) * 0.02 + sin(angle * 7.0 - uTime * 3.0) * 0.04;
    float r = baseRadius + jagged;

    // Strict Anime Colors
    vec3 coreYellow = vec3(1.0, 0.9, 0.2);
    vec3 hotPink = vec3(1.0, 0.1, 0.5);
    
    // Hard cuts, NO smooth gradients, NO multiplying past 1.0
    vec3 color = mix(coreYellow, hotPink, step(0.06, r)); // Sharp edge between yellow and pink
    float alpha = 1.0 - smoothstep(0.18, 0.22, r); // Sharp edge cutting off the pink

    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
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

  // --- Materials (raw ShaderMaterial — no extend/TS hacks) ---
  const backdropMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
        },
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
          uTime: { value: 0 },
        },
        vertexShader: glowVertex,
        fragmentShader: glowFragment,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.NormalBlending,
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
    backdropMat.uniforms.uTime.value = t
    paintMat.uniforms.uTime.value = t
    flareMat.uniforms.uTime.value = t
    glowMat.uniforms.uTime.value = t
    glowMat.uniforms.uAspect.value = state.size.width / state.size.height
  })

  return (
    <>
      {/* Layer A: Static fullscreen backdrop */}
      <mesh geometry={backdropGeo} material={backdropMat} renderOrder={-1} />

      {/* Layer B: Fluid particles (normal alpha blending) */}
      <instancedMesh
        args={[paintGeo, paintMat, PAINT_COUNT]}
        frustumCulled={false}
      />

      {/* Layer C: Star flares (additive blending) */}
      <instancedMesh
        args={[flareGeo, flareMat, FLARE_COUNT]}
        frustumCulled={false}
      />

      {/* Layer D: Foreground core glow — always visible on top */}
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
        <EffectComposer enableNormalPass={false}>
          <Bloom
            luminanceThreshold={0.8}
            luminanceSmoothing={0.3}
            intensity={0.5}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
