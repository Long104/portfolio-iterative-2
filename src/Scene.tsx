import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'

// ============================================================================
// 1. TEXTURE CREATORS (Procedural Canvas Maps with Sharp/Soft Profiles)
// ============================================================================

function createCoreSpurtTexture(): THREE.Texture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  
  // Creates irregular sharp organic debris shapes instead of perfect circles
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size * 0.4, 0, Math.PI * 2)
  ctx.fill()

  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

function createStreakTexture(): THREE.Texture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const c = size / 2

  // An oval capsule shape for sharp velocity streaks
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.ellipse(c, c, size * 0.15, size * 0.45, 0, 0, Math.PI * 2)
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

  // Large, opaque foreground silhouette particle with a very tight edge fade
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c * 0.9)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.8, 'rgba(255,255,255,0.95)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)

  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

function createStarFlareTexture(): THREE.Texture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const c = size / 2

  // 4-pointed sharp twinkling diamond flares
  ctx.save()
  ctx.translate(c, c)
  for (let i = 0; i < 2; i++) {
    const grad = ctx.createLinearGradient(-c, 0, c, 0)
    grad.addColorStop(0, 'rgba(255,255,255,0)')
    grad.addColorStop(0.5, 'rgba(255,255,255,1)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = grad
    ctx.fillRect(-c, -2, size, 4)
    ctx.rotate(Math.PI / 2)
  }
  ctx.restore()

  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

// ============================================================================
// 2. SHADER CODES (Optimized for WebGL Performance and Colorspace Integrity)
// ============================================================================

const backdropVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const backdropFragment = /* glsl */ `
  varying vec2 vUv;
  void main() {
    float dist = distance(vUv, vec2(0.5));

    // True Anime Palette: Solid, luminous mint-cyan gradient core
    vec3 mintGreen  = vec3(0.20, 0.88, 0.58);
    vec3 brightCyan = vec3(0.00, 0.95, 0.85);
    vec3 deepTeal   = vec3(0.01, 0.12, 0.18);

    vec3 skyColor = mix(mintGreen, brightCyan, smoothstep(0.0, 0.35, dist));
    vec3 finalColor = mix(skyColor, deepTeal, smoothstep(0.25, 0.70, dist));

    gl_FragColor = vec4(finalColor, 1.0);
    #include <colorspace_fragment>
  }
`

const elementVertex = /* glsl */ `
  uniform float uTime;
  uniform float uSpeed;
  attribute vec3 aInitialPos;
  attribute vec3 aRandoms;

  varying vec2 vUv;
  varying float vColorIndex;
  varying float vDepth;

  void main() {
    vUv = uv;
    vColorIndex = aRandoms.z;

    vec3 pos = aInitialPos;

    // Fast linear timeline projection traveling directly towards the camera lens
    pos.z += uTime * uSpeed * (1.0 + aRandoms.x * 0.6);
    pos.z = mod(pos.z + 65.0, 70.0) - 65.0;

    vDepth = clamp((pos.z + 65.0) / 65.0, 0.0, 1.0);

    // Exponential velocity scale curve mimicking optical motion blur zoom
    float scale = 0.4 * (0.15 + pow(vDepth, 3.5) * 12.0);

    // Orient and align vectors pointing radially outwards away from screen core
    vec3 transformed = position;
    if (pos.x != 0.0 || pos.y != 0.0) {
      vec2 dir = normalize(pos.xy);
      float stretch = 1.0 + (vDepth * 4.0);
      
      // Multiplies longitudinal translation mapping along flight trajectory lines
      float dotProd = dot(transformed.xy, dir);
      transformed.xy += dir * dotProd * (stretch - 1.0);
    }

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos + transformed * scale, 1.0);
  }
`

const elementFragment = /* glsl */ `
  uniform sampler2D uTexture;
  varying vec2 vUv;
  varying float vColorIndex;
  varying float vDepth;

  void main() {
    vec4 tex = texture2D(uTexture, vUv);
    if (tex.a < 0.05) discard;

    // Strict multi-hue vector distribution splitting yellow, pink, and bright mint paths
    vec3 color;
    if (vColorIndex < 0.33) {
      color = vec3(1.0, 0.92, 0.15); // Pure Anime Chrome Yellow
    } else if (vColorIndex < 0.66) {
      color = vec3(1.0, 0.15, 0.55); // Intense Shock Pink
    } else {
      color = vec3(0.12, 0.98, 0.70); // Vibrant Electric Mint
    }

    // Proximity visibility curve avoiding close viewport frame flashing
    float alphaFade = smoothstep(1.0, 0.82, vDepth) * smoothstep(0.0, 0.15, vDepth);

    gl_FragColor = vec4(color * 1.4, tex.a * alphaFade);
    #include <colorspace_fragment>
  }
`

// ============================================================================
// 3. MAIN COMPONENT SCENE ARCHITECTURE
// ============================================================================

const CORE_PARTICLE_COUNT = 1800 // High-density explosion cluster
const VELOCITY_STREAK_COUNT = 2500 // Speed lines
const FOREGROUND_SILHOUETTE_COUNT = 45 // Big framing blobs

function generateVFXInstanceData(count: number, minRadius: number, maxRadius: number, depthRange: number) {
  const pos = new Float32Array(count * 3)
  const rand = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const radius = minRadius + Math.random() * (maxRadius - minRadius)
    
    pos[i * 3] = Math.cos(angle) * radius
    pos[i * 3 + 1] = Math.sin(angle) * radius
    pos[i * 3 + 2] = Math.random() * -depthRange

    rand[i * 3] = Math.random()
    rand[i * 3 + 1] = Math.random()
    rand[i * 3 + 2] = Math.random()
  }

  return { pos, rand }
}

function KiraKiraVortex() {
  const backdropMatRef = useRef<THREE.ShaderMaterial>(null)
  const coreMatRef = useRef<THREE.ShaderMaterial>(null)
  const streakMatRef = useRef<THREE.ShaderMaterial>(null)
  const flareMatRef = useRef<THREE.ShaderMaterial>(null)
  const silhouetteMeshRef = useRef<THREE.InstancedMesh>(null)

  // Memoize stable engine assets
  const textures = useMemo(() => ({
    core: createCoreSpurtTexture(),
    streak: createStreakTexture(),
    blob: createBlobTexture(),
    flare: createStarFlareTexture()
  }), [])

  const geometry = useMemo(() => ({
    quad: new THREE.PlaneGeometry(1, 1),
    screen: new THREE.PlaneGeometry(160, 160)
  }), [])

  // 1. Dynamic Background Materials
  const backdropMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: backdropVertex,
    fragmentShader: backdropFragment,
    depthWrite: false,
    depthTest: false
  }), [])

  // 2. High-Density Inner Core Explosion Layer
  const coreMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSpeed: { value: 12.0 }, uTexture: { value: textures.core } },
    vertexShader: elementVertex,
    fragmentShader: elementFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending
  }), [textures.core])

  // 3. Fast Kinetic Speed Line Streaks
  const streakMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSpeed: { value: 32.0 }, uTexture: { value: textures.streak } },
    vertexShader: elementVertex,
    fragmentShader: elementFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending
  }), [textures.streak])

  // 4. White/Green Luminescent Twinkle Star Flares
  const flareMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSpeed: { value: 20.0 }, uTexture: { value: textures.flare } },
    vertexShader: elementVertex,
    fragmentShader: elementFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  }), [textures.flare])

  // Data Generation Buffers
  const coreGeo = useMemo(() => {
    const { pos, rand } = generateVFXInstanceData(CORE_PARTICLE_COUNT, 0.0, 4.5, 60)
    const geo = geometry.quad.clone()
    geo.setAttribute('aInitialPos', new THREE.InstancedBufferAttribute(pos, 3))
    geo.setAttribute('aRandoms', new THREE.InstancedBufferAttribute(rand, 3))
    return geo
  }, [geometry.quad])

  const streakGeo = useMemo(() => {
    const { pos, rand } = generateVFXInstanceData(VELOCITY_STREAK_COUNT, 2.0, 16.0, 65)
    const geo = geometry.quad.clone()
    geo.setAttribute('aInitialPos', new THREE.InstancedBufferAttribute(pos, 3))
    geo.setAttribute('aRandoms', new THREE.InstancedBufferAttribute(rand, 3))
    return geo
  }, [geometry.quad])

  // 5. Light-Absorbing Foreground Shadow Layer Data
  const silhouetteData = useMemo(() => {
    const { pos, rand } = generateVFXInstanceData(FOREGROUND_SILHOUETTE_COUNT, 1.5, 9.0, 12)
    return { pos, rand }
  }, [])

  // Animation Frame Render Runtime
  useFrame((state) => {
    const t = state.clock.getElapsedTime()

    if (coreMatRef.current) coreMatRef.current.uniforms.uTime.value = t
    if (streakMatRef.current) streakMatRef.current.uniforms.uTime.value = t
    if (flareMatRef.current) flareMatRef.current.uniforms.uTime.value = t

    // Animate the light-blocking silhouette positions via Matrix translations
    if (silhouetteMeshRef.current) {
      const dummy = new THREE.Object3D()
      const speed = 4.5
      
      for (let i = 0; i < FOREGROUND_SILHOUETTE_COUNT; i++) {
        const initX = silhouetteData.pos[i * 3]
        const initY = silhouetteData.pos[i * 3 + 1]
        const initZ = silhouetteData.pos[i * 3 + 2]
        const rFactor = silhouetteData.rand[i * 3]

        // Loop items smoothly along Z towards camera screen plane
        let curZ = initZ + t * speed * (0.8 + rFactor * 0.4)
        curZ = (curZ % 12.0) - 2.0 // Keeps them clamped directly in front of the lens view

        dummy.position.set(initX * (1.0 + (curZ + 2.0) * 0.15), initY * (1.0 + (curZ + 2.0) * 0.15), curZ)
        
        // Scale them up massively as they brush directly against camera glass boundary
        const s = (2.2 + rFactor * 2.5) * (0.4 + pow((curZ + 2.0) / 14.0, 2.0) * 4.0)
        dummy.scale.set(s, s, 1)
        dummy.updateMatrix()
        silhouetteMeshRef.current.setMatrixAt(i, dummy.matrix)
      }
      silhouetteMeshRef.current.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <>
      {/* BACKGROUND SKY CANVAS */}
      <mesh geometry={geometry.screen} material={backdropMat} position={[0, 0, -66]} />

      {/* CORE BLAST DENSE SPATTER CLUSTER */}
      <instancedMesh ref={coreMatRef} args={[coreGeo, coreMat, CORE_PARTICLE_COUNT]} frustumCulled={false} />

      {/* COMPRESSED RADIAL SPEED STREAKS */}
      <instancedMesh ref={streakMatRef} args={[streakGeo, streakMat, VELOCITY_STREAK_COUNT]} frustumCulled={false} />

      {/* ADDITIVE SPARKLING TWINKLE FLARES */}
      <instancedMesh ref={flareMatRef} args={[streakGeo, flareMat, VELOCITY_STREAK_COUNT]} frustumCulled={false} />

      {/* LIGHT-ABSORBING FOREGROUND SHADOW SILHOUETTES */}
      <instancedMesh 
        ref={silhouetteMeshRef} 
        args={[geometry.quad, null as any, FOREGROUND_SILHOUETTE_COUNT]} 
        frustumCulled={false}
      >
        <meshBasicMaterial 
          map={textures.blob} 
          color="#000000" // Pure pitch black matte paint style matching flat animation art cells
          transparent 
          opacity={0.98}
          depthWrite={false}
          depthTest={false}
        />
      </instancedMesh>

      {/* OPTICAL LENS SCATTER BLOOM EFFECT */}
      <EffectComposer disableNormalPass>
        <Bloom 
          luminanceThreshold={0.9} 
          luminanceSmoothing={0.2} 
          intensity={0.6} // Delicate brightness boundary safeguarding high color definition
          mipmapBlur 
        />
      </EffectComposer>
    </>
  )
}

// Inline helper for cleanly computing exponential scaling exponents
function pow(base: number, exp: number): number {
  return Math.pow(base, exp)
}

export default function Scene() {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#010c10' }}>
      <Canvas camera={{ position: [0, 0, 8], fov: 65 }}>
        <KiraKiraVortex />
      </Canvas>
    </div>
  )
}
