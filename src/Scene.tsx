import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'

// ==========================================
// 1. BACKDROP SHADER (fullscreen gradient)
//    Teal → mint → dark teal. Provides the
//    Ghibli-style color canvas.
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

    vec3 brightMint = vec3(0.06, 0.40, 0.34);
    vec3 midTeal    = vec3(0.01, 0.12, 0.15);
    vec3 darkTeal   = vec3(0.0, 0.03, 0.06);

    vec3 color = mix(brightMint, midTeal, smoothstep(0.05, 0.50, dist));
    color = mix(color, darkTeal, smoothstep(0.50, 0.90, dist));

    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`

// ==========================================
// 2. DATA GENERATORS
// ==========================================

/** Spherical random distribution for core / background orbs */
function generateSphericalData(count: number, minR: number, maxR: number) {
  const pos = new Float32Array(count * 3)
  const scales = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const r = minR + Math.random() * (maxR - minR)
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    pos[i * 3 + 2] = r * Math.cos(phi)
    scales[i] = 0.1 + Math.random() * 0.4
  }
  return { pos, scales }
}

/** Cylindrical distribution for speed-line sparks */
function generateSparkData(count: number, maxR: number, zDepth: number) {
  const pos = new Float32Array(count * 3)
  const speeds = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const radius = Math.random() * maxR
    pos[i * 3] = Math.cos(angle) * radius
    pos[i * 3 + 1] = Math.sin(angle) * radius
    pos[i * 3 + 2] = -Math.random() * zDepth
    speeds[i] = 0.8 + Math.random() * 0.4
  }
  return { pos, speeds }
}

/** Spherical distribution for large background water orbs */
function generateWaterData(count: number, spread: number) {
  const pos = new Float32Array(count * 3)
  const scales = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const r = spread * Math.cbrt(Math.random())
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    pos[i * 3 + 2] = r * Math.cos(phi)
    scales[i] = 1.5 + Math.random() * 2.5
  }
  return { pos, scales }
}

/** Cylindrical distribution for dark foreground debris */
function generateDebrisData(count: number, maxR: number, zDepth: number) {
  const pos = new Float32Array(count * 3)
  const scales = new Float32Array(count)
  const speeds = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const radius = 2.0 + Math.random() * maxR
    pos[i * 3] = Math.cos(angle) * radius
    pos[i * 3 + 1] = Math.sin(angle) * radius
    pos[i * 3 + 2] = -Math.random() * zDepth
    scales[i] = 0.5 + Math.random() * 2.0
    speeds[i] = 0.7 + Math.random() * 0.6
  }
  return { pos, scales, speeds }
}

// ==========================================
// 3. PARTICLE COUNTS
// ==========================================

const INNER_CORE = 600
const OUTER_CORE = 600
const GREEN_SPARKS = 600
const YELLOW_SPARKS = 600
const WATER_COUNT = 150
const DEBRIS_COUNT = 300

// Total: 2,850 CPU-animated spheres per frame (60fps on desktop)

// ==========================================
// 4. SCENE COMPONENTS
// ==========================================

// ── Backdrop (rendered first, behind everything) ──
function Backdrop() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: backdropVertex,
        fragmentShader: backdropFragment,
        depthWrite: false,
        depthTest: false,
      }),
    [],
  )
  const geo = useMemo(() => new THREE.PlaneGeometry(2, 2), [])
  return <mesh geometry={geo} material={mat} renderOrder={-1} />
}

// ── Inner Core — dense yellow boiling mass ──────
function InnerCore() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const { pos, scales } = useMemo(
    () => generateSphericalData(INNER_CORE, 0, 1.0),
    [],
  )
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const geo = useMemo(() => new THREE.SphereGeometry(0.15, 8, 8), [])
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#000000',
        emissive: '#ffe840',
        emissiveIntensity: 5,
        toneMapped: false,
        roughness: 0.2,
        metalness: 0,
      }),
    [],
  )

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.getElapsedTime()

    for (let i = 0; i < INNER_CORE; i++) {
      const i3 = i * 3
      dummy.position.set(
        pos[i3] + Math.sin(t * 2.0 + i * 0.1) * 0.4,
        pos[i3 + 1] + Math.cos(t * 2.3 + i * 0.13) * 0.4,
        pos[i3 + 2] + Math.sin(t * 1.7 + i * 0.07) * 0.4,
      )
      const s = scales[i] * (1.0 + Math.sin(t * 5.0 + i * 0.2) * 0.3)
      dummy.scale.setScalar(s)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[geo, mat, INNER_CORE]}
      frustumCulled={false}
    />
  )
}

// ── Outer Core — pink/red halo, wider spread ───
function OuterCore() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const { pos, scales } = useMemo(
    () => generateSphericalData(OUTER_CORE, 1.0, 2.8),
    [],
  )
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const geo = useMemo(() => new THREE.SphereGeometry(0.25, 8, 8), [])
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#000000',
        emissive: '#ff2066',
        emissiveIntensity: 3,
        toneMapped: false,
        roughness: 0.3,
        metalness: 0,
      }),
    [],
  )

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.getElapsedTime()

    for (let i = 0; i < OUTER_CORE; i++) {
      const i3 = i * 3
      const px = pos[i3] + Math.sin(t * 1.5 + i * 0.08) * 0.6
      const py = pos[i3 + 1] + Math.cos(t * 1.8 + i * 0.11) * 0.6
      const pz = pos[i3 + 2] + Math.sin(t * 1.2 + i * 0.06) * 0.6

      dummy.position.set(px, py, pz)

      // Rotate to face outward from center → flat splatter facing camera
      dummy.lookAt(px * 2, py * 2, pz * 2)

      const s = scales[i] * (1.0 + Math.sin(t * 3.0 + i * 0.15) * 0.25)
      // Flatten Z to 0.1 for 2D splatter look, not round bubbles
      dummy.scale.set(s, s, s * 0.1)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[geo, mat, OUTER_CORE]}
      frustumCulled={false}
    />
  )
}

// ── Green Speed Sparks — stretched Z-axis ─────
function GreenSparks() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const { pos, speeds } = useMemo(
    () => generateSparkData(GREEN_SPARKS, 10, 60),
    [],
  )
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const geo = useMemo(() => new THREE.SphereGeometry(0.06, 6, 6), [])
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#000000',
        emissive: '#40ff30',
        emissiveIntensity: 2.5,
        toneMapped: false,
        roughness: 0.1,
        metalness: 0,
      }),
    [],
  )

  const baseSpeed = 12.0

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.getElapsedTime()

    for (let i = 0; i < GREEN_SPARKS; i++) {
      const i3 = i * 3

      // Modular z-loop: fly toward camera, infinite loop
      const rawZ = pos[i3 + 2] + t * baseSpeed * speeds[i]
      const z = ((rawZ % 70) + 70) % 70 - 60

      // Depth factor: 0 at z=-60, ~1 at z=5
      const depth = Math.max(0, (z + 60) / 65)

      // Subtle lateral wave
      const wave = Math.sin(z * 0.1 + t + i * 0.3) * 0.4
      dummy.position.set(
        pos[i3] + Math.cos(wave) * 0.5,
        pos[i3 + 1] + Math.sin(wave) * 0.5,
        z,
      )

      // Thin X/Y, extreme Z stretch — long anime speed lines
      const thickness = 0.02
      const stretch = 1.0 + depth * 35.0
      dummy.scale.set(thickness, thickness, stretch)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[geo, mat, GREEN_SPARKS]}
      frustumCulled={false}
    />
  )
}

// ── Yellow Speed Sparks — stretched Z-axis ────
function YellowSparks() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const { pos, speeds } = useMemo(
    () => generateSparkData(YELLOW_SPARKS, 12, 60),
    [],
  )
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const geo = useMemo(() => new THREE.SphereGeometry(0.06, 6, 6), [])
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#000000',
        emissive: '#ffe020',
        emissiveIntensity: 2.5,
        toneMapped: false,
        roughness: 0.1,
        metalness: 0,
      }),
    [],
  )

  const baseSpeed = 10.0

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.getElapsedTime()

    for (let i = 0; i < YELLOW_SPARKS; i++) {
      const i3 = i * 3

      const rawZ = pos[i3 + 2] + t * baseSpeed * speeds[i]
      const z = ((rawZ % 70) + 70) % 70 - 60

      const depth = Math.max(0, (z + 60) / 65)

      const wave = Math.sin(z * 0.1 + t * 1.3 + i * 0.3) * 0.4
      dummy.position.set(
        pos[i3] + Math.cos(wave) * 0.5,
        pos[i3 + 1] + Math.sin(wave) * 0.5,
        z,
      )

      // Thin X/Y, extreme Z stretch — long anime speed lines
      const thickness = 0.02
      const stretch = 1.0 + depth * 35.0
      dummy.scale.set(thickness, thickness, stretch)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[geo, mat, YELLOW_SPARKS]}
      frustumCulled={false}
    />
  )
}

// ── Water Thingies — soft glowing background bokeh ──
function WaterThingies() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const { pos, scales } = useMemo(
    () => generateWaterData(WATER_COUNT, 25),
    [],
  )
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const geo = useMemo(() => new THREE.SphereGeometry(1, 12, 12), [])
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#40ffc8',
        emissive: '#40ffc8',
        emissiveIntensity: 1.2,
        toneMapped: false,
        transparent: true,
        opacity: 0.10,
        roughness: 1,
        metalness: 0,
        depthWrite: false,
      }),
    [],
  )

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.getElapsedTime()

    for (let i = 0; i < WATER_COUNT; i++) {
      const i3 = i * 3
      dummy.position.set(
        pos[i3] + Math.sin(t * 0.15 + i * 0.5) * 2.0,
        pos[i3 + 1] + Math.cos(t * 0.20 + i * 0.4) * 2.0,
        pos[i3 + 2] + Math.sin(t * 0.10 + i * 0.6) * 2.0,
      )
      dummy.scale.setScalar(scales[i])
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[geo, mat, WATER_COUNT]}
      frustumCulled={false}
    />
  )
}

// ── Dark Debris — foreground silhouettes flying past camera ──
function DarkDebris() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const { pos, scales, speeds } = useMemo(
    () => generateDebrisData(DEBRIS_COUNT, 12, 60),
    [],
  )
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const geo = useMemo(() => new THREE.SphereGeometry(1, 8, 8), [])
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#000a12',
        roughness: 1,
        metalness: 0,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    [],
  )

  const baseSpeed = 15.0

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.getElapsedTime()

    for (let i = 0; i < DEBRIS_COUNT; i++) {
      const i3 = i * 3

      // Fast z-loop — debris flies past camera
      const rawZ = pos[i3 + 2] + t * baseSpeed * speeds[i]
      const z = ((rawZ % 70) + 70) % 70 - 60

      const depth = Math.max(0, (z + 60) / 65)

      // Slow lateral drift
      dummy.position.set(
        pos[i3] + Math.sin(t * 0.3 + i * 0.5) * 0.8,
        pos[i3 + 1] + Math.cos(t * 0.4 + i * 0.3) * 0.8,
        z,
      )

      // Flatten slightly for painted debris look
      const s = scales[i] * (0.3 + Math.pow(depth, 3.0) * 5.0)
      dummy.scale.set(s, s, s * 0.4)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[geo, mat, DEBRIS_COUNT]}
      frustumCulled={false}
    />
  )
}

// ==========================================
// 5. EXPORT
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
        {/* Lighting — point light illuminates core area */}
        <ambientLight intensity={0.1} />
        <pointLight
          position={[0, 0, 0]}
          intensity={40}
          color="#ff44aa"
          distance={20}
        />

        {/* Layers */}
        <Backdrop />
        <WaterThingies />
        <OuterCore />
        <InnerCore />
        <GreenSparks />
        <YellowSparks />
        <DarkDebris />

        {/* Post-processing — the magic glow */}
        <EffectComposer>
          <Bloom
            luminanceThreshold={0.6}
            luminanceSmoothing={0.5}
            mipmapBlur
            intensity={1.5}
          />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
