// @ts-nocheck
import { useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Bloom, EffectComposer } from '@react-three/postprocessing'

// ==========================================
// 1. PROCEDURAL TEXTURES (Canvas-based)
// ==========================================

function createPetalTexture(): THREE.Texture {
  // Pink particles: user wants "0 not o" (elongated oval)
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const c = size / 2

  // Solid oval
  ctx.fillStyle = 'rgba(255,255,255,1)'
  ctx.beginPath()
  ctx.ellipse(c, c, c * 0.9, c * 0.25, 0, 0, Math.PI * 2)
  ctx.fill()

  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

function createBlobTexture(): THREE.Texture {
  // Background dark blobs: solid circle "o"
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const c = size / 2

  // Solid, fully opaque circle
  ctx.fillStyle = 'rgba(255,255,255,1)'
  ctx.beginPath()
  ctx.arc(c, c, c * 0.9, 0, Math.PI * 2)
  ctx.fill()

  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

function createLineTexture(): THREE.Texture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const c = size / 2

  // Thin line
  ctx.fillStyle = 'rgba(255,255,255,1)'
  ctx.beginPath()
  ctx.ellipse(c, c, c * 0.9, c * 0.05, 0, 0, Math.PI * 2)
  ctx.fill()

  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

// ==========================================
// 2. SHADERS
// ==========================================

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
    // Bright vibrant mint/teal background matching reference exactly
    vec3 mintCenter = vec3(0.5, 1.0, 0.9); 
    vec3 tealMid    = vec3(0.1, 0.7, 0.65);
    vec3 deepTeal   = vec3(0.01, 0.25, 0.3);

    vec3 color = mix(mintCenter, tealMid, smoothstep(0.0, 0.4, dist));
    color = mix(color, deepTeal, smoothstep(0.4, 1.0, dist));

    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`

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

    // Travel along Z
    pos.z += uTime * uSpeed * (0.8 + aRandoms.x * 0.5);
    pos.z = mod(pos.z + 60.0, 70.0) - 60.0;

    vDepth = clamp((pos.z + 60.0) / 65.0, 0.0, 1.0);

    // Push dark blobs (vType > 0.7) far to the background
    if (vType > 0.7) {
       pos.z -= 15.0; 
    }

    // Keep particles dense but clear dead center
    float r = length(pos.xy);
    if (r < 0.8) pos.xy = normalize(pos.xy + 0.001) * (0.8 + aRandoms.x * 1.0);

    // Scaling
    float baseScale = (vType < 0.7) ? 0.4 : 3.5; 
    float scale = baseScale * (1.0 + vDepth * 3.0); // controlled scale, no extreme blowing up

    // Orient ovals radially
    float angle = atan(pos.y, pos.x);
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

    if (vType < 0.7) {
      // Pink particles ("0" shape)
      texColor = texture2D(uTexPetal, vUv);
      finalColor = mix(vec3(1.0, 0.4, 0.6), vec3(1.0, 0.6, 0.8), vDepth);
      finalColor *= 2.0; // HDR boost for bloom
    } else {
      // Dark jade background blobs ("o" shape)
      texColor = texture2D(uTexBlob, vUv);
      finalColor = vec3(0.0, 0.15, 0.2); // Solid dark silhouette
    }

    // Hard cutoff for crisp shapes
    if (texColor.a < 0.1) discard;

    float alphaFade = smoothstep(1.0, 0.85, vDepth);
    gl_FragColor = vec4(finalColor, texColor.a * alphaFade);
    #include <colorspace_fragment>
  }
`

const lineVertex = /* glsl */ `
  uniform float uTime;
  uniform float uSpeed;
  attribute vec3 aInitialPos;
  attribute vec3 aRandoms;

  varying vec2 vUv;
  varying float vDepth;

  void main() {
    vUv = uv;
    vec3 pos = aInitialPos;

    pos.z += uTime * uSpeed * (1.2 + aRandoms.x * 0.8);
    pos.z = mod(pos.z + 60.0, 70.0) - 60.0;

    vDepth = clamp((pos.z + 60.0) / 65.0, 0.0, 1.0);
    
    // Push lines away from exact center to not overlap the core
    float r = length(pos.xy);
    if (r < 1.5) pos.xy = normalize(pos.xy + 0.001) * (1.5 + aRandoms.x * 3.0);

    vec3 transformed = position;
    vec2 dir = normalize(pos.xy + 0.001);
    float stretch = 1.0 + (vDepth * 15.0); 
    transformed.xy += dir * dot(transformed.xy, dir) * (stretch - 1.0);

    float scale = 0.5 * (0.5 + vDepth * 2.0);

    vec4 mvPos = modelViewMatrix * vec4(pos + transformed * scale, 1.0);
    gl_Position = projectionMatrix * mvPos;
  }
`

const lineFragment = /* glsl */ `
  uniform sampler2D uTexLine;
  varying vec2 vUv;
  varying float vDepth;

  void main() {
    vec4 texColor = texture2D(uTexLine, vUv);
    
    // Yellow/green streak
    vec3 glow = vec3(0.8, 1.0, 0.3);

    if (texColor.a < 0.1) discard;

    float alphaFade = smoothstep(1.0, 0.80, vDepth);
    gl_FragColor = vec4(glow * 4.0, texColor.a * alphaFade);
    #include <colorspace_fragment>
  }
`

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
  
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  void main() {
    vec2 centered = vUv - vec2(0.5);
    centered.x *= uAspect;
    float dist = length(centered);

    float n = hash(centered * 50.0 + uTime * 10.0) * 0.05;

    // Vivid distinct yellow center and pink outer glow
    vec3 coreColor = vec3(1.0, 0.9, 0.2) * 5.0;  
    vec3 haloColor = vec3(1.0, 0.3, 0.6) * 3.0;  

    vec3 color = mix(coreColor, haloColor, smoothstep(0.0 + n, 0.12 + n, dist));
    
    // Hard fade so it doesn't wash out the screen
    float alpha = 1.0 - smoothstep(0.1 + n, 0.25 + n, dist);

    if (alpha <= 0.0) discard;

    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`

// ==========================================
// 3. SCENE COMPONENT
// ==========================================

const PAINT_COUNT = 4000
const LINE_COUNT = 50 

function generateInstanceData(count: number, maxRadius: number, power: number = 1.0) {
  const pos = new Float32Array(count * 3)
  const rand = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const radius = Math.pow(Math.random(), power) * maxRadius
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
  const petalTex = useMemo(() => createPetalTexture(), [])
  const blobTex = useMemo(() => createBlobTexture(), [])
  const lineTex = useMemo(() => createLineTexture(), [])

  const backdropMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: backdropVertex,
        fragmentShader: backdropFragment,
        depthWrite: false,
        depthTest: false,
      }),
    []
  )

  const paintMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uSpeed: { value: 40.0 }, // Proper speed multiplier
          uTexPetal: { value: petalTex },
          uTexBlob: { value: blobTex },
        },
        vertexShader: particleVertex,
        fragmentShader: particleFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
      }),
    [petalTex, blobTex]
  )

  const lineMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uSpeed: { value: 70.0 }, 
          uTexLine: { value: lineTex },
        },
        vertexShader: lineVertex,
        fragmentShader: lineFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [lineTex]
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
    []
  )

  const backdropGeo = useMemo(() => new THREE.PlaneGeometry(2, 2), [])

  const paintGeo = useMemo(() => {
    const { pos, rand } = generateInstanceData(PAINT_COUNT, 20.0, 1.5)
    const geo = new THREE.PlaneGeometry(1.0, 1.0)
    geo.setAttribute('aInitialPos', new THREE.InstancedBufferAttribute(pos, 3))
    geo.setAttribute('aRandoms', new THREE.InstancedBufferAttribute(rand, 3))
    return geo
  }, [])

  const lineGeo = useMemo(() => {
    const { pos, rand } = generateInstanceData(LINE_COUNT, 15.0, 1.0)
    const geo = new THREE.PlaneGeometry(1.0, 1.0)
    geo.setAttribute('aInitialPos', new THREE.InstancedBufferAttribute(pos, 3))
    geo.setAttribute('aRandoms', new THREE.InstancedBufferAttribute(rand, 3))
    return geo
  }, [])

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    paintMat.uniforms.uTime.value = t
    lineMat.uniforms.uTime.value = t
    glowMat.uniforms.uAspect.value = state.size.width / state.size.height
    glowMat.uniforms.uTime.value = t
  })

  return (
    <>
      <mesh geometry={backdropGeo} material={backdropMat} renderOrder={-2} />
      {/* Core rendered first so particles pass over it */}
      <mesh geometry={backdropGeo} material={glowMat} renderOrder={-1} />
      <instancedMesh args={[paintGeo, paintMat, PAINT_COUNT]} frustumCulled={false} renderOrder={0} />
      <instancedMesh args={[lineGeo, lineMat, LINE_COUNT]} frustumCulled={false} renderOrder={1} />
    </>
  )
}

export default function Scene() {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#000',
      }}
    >
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        <KiraKiraVortex />
        <EffectComposer disableNormalPass>
          {/* @ts-expect-error React 19 type mismatch */}
          <Bloom
            luminanceThreshold={1.0}
            mipmapBlur
            intensity={1.5}
            radius={0.8}
          />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
