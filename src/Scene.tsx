import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'

// ==========================================
// 1. BACKDROP SHADER (deep teal gradient)
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

    vec3 brightMint = vec3(0.04, 0.30, 0.25);
    vec3 midTeal    = vec3(0.01, 0.10, 0.13);
    vec3 darkTeal   = vec3(0.0, 0.03, 0.06);

    vec3 color = mix(brightMint, midTeal, smoothstep(0.0, 0.50, dist));
    color = mix(color, darkTeal, smoothstep(0.50, 0.90, dist));

    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`

// ==========================================
// 2. DATA GENERATORS
// ==========================================

/** Spherical distribution with optional center safe zone */
function generateSphericalData(
  count: number,
  minR: number,
  maxR: number,
) {
  const pos = new Float32Array(count * 3)
  const scales = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const r = minR + Math.random() * (maxR - minR)
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    pos[i * 3 + 2] = r * Math.cos(phi)
    scales[i] = 0.2 + Math.random() * 0.8
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

/** Cylindrical distribution for dark debris (with center exclusion) */
function generateDebrisData(
  count: number,
  minRadius: number,
  maxRadius: number,
  zDepth: number,
) {
  const pos = new Float32Array(count * 3)
  const scales = new Float32Array(count)
  const speeds = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    // Force outside minRadius so center stays clear
    const angle = Math.random() * Math.PI * 2
    const radius = minRadius + Math.random() * (maxRadius - minRadius)
    pos[i * 3] = Math.cos(angle) * radius
    pos[i * 3 + 1] = Math.sin(angle) * radius
    pos[i * 3 + 2] = -Math.random() * zDepth
    scales[i] = 0.5 + Math.random() * 2.0
    speeds[i] = 0.7 + Math.random() * 0.6
  }
  return { pos, scales, speeds }
}

// ==========================================
// 3. COUNTS
// ==========================================

const OUTER_CORE = 800
const GREEN_SPARKS = 750
const YELLOW_SPARKS = 750
const DEBRIS_COUNT = 300

// Total: 3,200 CPU-animated instances per frame

// ==========================================
// 4. SCENE COMPONENTS
// ==========================================

// ── Backdrop ────────────────────────────────
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

// ── Glowing Core ────────────────────────────
// Yellow center sphere + flat pink splatters boiling around it.
// Locked at z=0 — 5 units from camera (fov=75) = dominant on screen.
function GlowingCore() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const { pos, scales } = useMemo(
    () => generateSphericalData(OUTER_CORE, 1.5, 4.0),
    [],
  )
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const splatterGeo = useMemo(() => new THREE.SphereGeometry(0.5, 12, 12), [])
  const splatterMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#000000',
        emissive: '#ff1493',
        emissiveIntensity: 4,
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
      const px = pos[i3] + Math.sin(t * 2.0 + i * 0.08) * 0.8
      const py = pos[i3 + 1] + Math.cos(t * 2.3 + i * 0.11) * 0.8
      const pz = pos[i3 + 2] + Math.sin(t * 1.5 + i * 0.06) * 0.8

      dummy.position.set(px, py, pz)

      // Rotate to face outward — flat splatter look
      dummy.lookAt(px * 2, py * 2, pz * 2)

      const s = scales[i] * (1.0 + Math.sin(t * 4.0 + i * 0.15) * 0.25)
      // Flatten Z to 0.05 — flat 2D splatters, not round bubbles
      dummy.scale.set(s, s * 0.8, s * 0.05)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      {/* Central yellow sun — bright origin point */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1.8, 32, 32]} />
        <meshStandardMaterial
          color="#000000"
          emissive="#ffea00"
          emissiveIntensity={10}
          toneMapped={false}
          roughness={0.1}
          metalness={0}
        />
      </mesh>

      {/* Flat pink splatters boiling around the center */}
      <instancedMesh
        ref={meshRef}
        args={[splatterGeo, splatterMat, OUTER_CORE]}
        frustumCulled={false}
      />
    </group>
  )
}

// ── Green Speed Sparks ──────────────────────
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
        emissive: '#aaff00',
        emissiveIntensity: 8,
        toneMapped: false,
        roughness: 0.1,
        metalness: 0,
      }),
    [],
  )

  const baseSpeed = 14.0

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.getElapsedTime()

    for (let i = 0; i < GREEN_SPARKS; i++) {
      const i3 = i * 3

      // Modular z-loop — fly toward camera, infinite loop, NO mutation
      const rawZ = pos[i3 + 2] + t * baseSpeed * speeds[i]
      const z = ((rawZ % 70) + 70) % 70 - 60

      const depth = Math.max(0, (z + 60) / 65)

      const wave = Math.sin(z * 0.1 + t + i * 0.3) * 0.4
      dummy.position.set(
        pos[i3] + Math.cos(wave) * 0.5,
        pos[i3 + 1] + Math.sin(wave) * 0.5,
        z,
      )

      // Extreme stretch — thin long speed lines
      dummy.scale.set(0.02, 0.02, 1.0 + depth * 35.0)
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

// ── Yellow Speed Sparks ─────────────────────
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
        emissive: '#ffff00',
        emissiveIntensity: 8,
        toneMapped: false,
        roughness: 0.1,
        metalness: 0,
      }),
    [],
  )

  const baseSpeed = 11.0

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

      dummy.scale.set(0.02, 0.02, 1.0 + depth * 35.0)
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

// ── Dark Debris — foreground silhouettes ─────
// minRadius=4 ensures nothing spawns at center.
// Fast z-loop, large + flattened, dark teal/black.
function DarkDebris() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const { pos, scales, speeds } = useMemo(
    () => generateDebrisData(DEBRIS_COUNT, 4, 14, 60),
    [],
  )
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const geo = useMemo(() => new THREE.SphereGeometry(1, 8, 8), [])
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#00070a',
        roughness: 1,
        metalness: 0,
        transparent: true,
        opacity: 0.9,
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

      // Modular z-loop — NO data mutation, infinite recycle
      const rawZ = pos[i3 + 2] + t * baseSpeed * speeds[i]
      const z = ((rawZ % 70) + 70) % 70 - 60

      const depth = Math.max(0, (z + 60) / 65)

      dummy.position.set(
        pos[i3] + Math.sin(t * 0.3 + i * 0.5) * 0.8,
        pos[i3 + 1] + Math.cos(t * 0.4 + i * 0.3) * 0.8,
        z,
      )

      // Giant, flattened — massive silhouettes framing the edges
      const s = scales[i] * (0.3 + Math.pow(depth, 3.0) * 6.0)
      dummy.scale.set(s * 4, s * 3, s * 0.2)
      dummy.rotation.z = t * 0.5 + i
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
        background: '#01151c',
      }}
    >
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        {/* Lighting */}
        <ambientLight intensity={2.0} color="#005566" />
        <pointLight
          position={[0, 0, 0]}
          intensity={100}
          color="#ff0055"
          distance={50}
        />

        {/* Layers */}
        <Backdrop />
        <DarkDebris />
        <GlowingCore />
        <GreenSparks />
        <YellowSparks />

        {/* Post-processing bloom */}
        <EffectComposer>
          <Bloom
            luminanceThreshold={0.5}
            luminanceSmoothing={0.5}
            mipmapBlur
            intensity={2.5}
          />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
