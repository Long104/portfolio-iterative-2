import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  Color,
  InstancedMesh,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
} from "three";
import { useAudioEngine } from "./useAudioEngine";
import { createSparkleTexture } from "./textures";

// SPARKLE SYSTEM — Chromatic Lens Flare Kira-Kira
// Each sparkle is a tiny anamorphic lens flare:
// - Overexposed white core
// - Blue (#3459B5) horizontal fringe
// - Teal (#6AABAD) vertical fringe
// - Soft bloom glow extending beyond spikes
// Born from nothing → flash → die. Beat-driven.

const POOL_SIZE = 48;

const SPARKLE_COLORS: [number, number, number][] = [
  [0.938, 0.278, 0.386], [0.947, 0.481, 0.584],
  [0.262, 1.000, 0.320], [0.850, 1.000, 0.448],
  [0.612, 1.000, 0.402], [0.984, 0.694, 0.761],
  [1.000, 1.000, 0.448], [0.973, 0.612, 0.694],
  [0.947, 0.247, 0.347], [1.000, 0.973, 0.612],
  [0.106, 0.737, 0.698],
];

interface Sparkle {
  x: number; y: number; z: number;
  rot: number; size: number;
  cr: number; cg: number; cb: number;
  birthTime: number; lifetime: number;
  active: boolean;
  big: boolean;
  parked: boolean;
}

export default function SparkleSystem() {
  const { getData } = useAudioEngine();
  const meshRef = useRef<InstancedMesh>(null);
  const bassAvg = useRef(0);
  const trebleAvg = useRef(0);
  const smoothBass = useRef(0);
  const smoothTreble = useRef(0);
  const spawnTimer = useRef(0);
  const ambientTimer = useRef(0);

  const sparkleTex = useMemo(() => createSparkleTexture(), []);
  const geometry = useMemo(() => new PlaneGeometry(1.0, 1.0), []);

  // Custom shader: chromatic texture + instance tint + radial bloom
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uTex: { value: sparkleTex },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          varying vec3 vInstColor;

          void main() {
            vUv = uv;

            #ifdef USE_INSTANCING_COLOR
              vInstColor = instanceColor;
            #else
              vInstColor = vec3(1.0);
            #endif

            vec4 mvPos = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mvPos;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform sampler2D uTex;
          varying vec2 vUv;
          varying vec3 vInstColor;

          void main() {
            vec4 tex = texture2D(uTex, vUv);

            // Radial bloom — soft glow extending beyond the texture
            float dist = length(vUv - 0.5);
            float bloom = exp(-dist * 5.0) * 0.35;

            // Bloom colors: blue (#3459B5) + teal (#6AABAD)
            vec3 bloomBlue = vec3(0.204, 0.349, 0.710);
            vec3 bloomTeal = vec3(0.416, 0.671, 0.678);
            vec3 bloomColor = (bloomBlue + bloomTeal * 0.6) * bloom;

            // Combine: chromatic texture (blue/teal/white structure)
            // tinted by instance color (pastel core) + bloom glow
            vec3 color = tex.rgb * vInstColor + bloomColor * (0.4 + vInstColor * 0.6);

            float alpha = max(tex.a, bloom * 0.3);
            gl_FragColor = vec4(color, alpha);

            #include <colorspace_fragment>
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [sparkleTex],
  );

  const poolRef = useRef<Sparkle[] | null>(null);
  if (poolRef.current === null) {
    const sparkPool: Sparkle[] = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      sparkPool.push({
        x: 0, y: 0, z: -100,
        rot: 0, size: 0,
        cr: 1, cg: 1, cb: 1,
        birthTime: -1, lifetime: 0, active: false, big: false,
        parked: true,
      });
    }
    poolRef.current = sparkPool;
  }
  const pool = poolRef.current;

  const scratch = useMemo(() => new Object3D(), []);
  const workColor = useMemo(() => new Color(), []);

  function spawn(count: number, time: number, big: boolean) {
    let spawned = 0;
    for (const s of pool) {
      if (spawned >= count) break;
      if (s.active) continue;

      const angle = Math.random() * Math.PI * 2;
      const radius = big
        ? 6.0 + Math.random() * 8    // outer: 6-14 from center
        : 7.0 + Math.random() * 9;   // wider: 7-16 from center

      s.x = Math.cos(angle) * radius;
      s.y = Math.sin(angle) * radius * 0.8;
      s.z = -1 - Math.random() * 14;

      s.rot = (Math.random() - 0.5) * 0.3; // near-horizontal for anamorphic streak
      s.size = big
        ? 0.4 + Math.random() * 0.4    // lean: 0.4-0.8
        : 0.2 + Math.random() * 0.25;  // lean: 0.2-0.45

      const col = SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)];
      s.cr = col[0]; s.cg = col[1]; s.cb = col[2];

      s.birthTime = time;
      s.lifetime = 0.3 + Math.random() * 0.5;
      s.big = big;
      s.active = true;
      s.parked = false;
      spawned++;
    }
  }

  // Accumulate time manually — avoids THREE.Clock deprecation warning.
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    elapsed.current += delta;
    const time = elapsed.current;
    const audio = getData();

    // Moving-average beat detection — adapts to overall loudness
    bassAvg.current = bassAvg.current * 0.95 + audio.bass * 0.05;
    trebleAvg.current = trebleAvg.current * 0.92 + audio.treble * 0.08;

    const bassBeat = audio.bass > bassAvg.current * 1.04 && audio.bass > 0.3;
    const trebleSpark = audio.treble > trebleAvg.current * 1.15 && audio.treble > 0.05;

    // Smoothed audio for visual modulation of living sparkles
    smoothBass.current += (audio.bass - smoothBass.current) * 0.30;
    smoothTreble.current += (audio.treble - smoothTreble.current) * 0.30;

    spawnTimer.current += delta;

    if (bassBeat && spawnTimer.current > 0.12) {
      spawn(3 + Math.floor(audio.bass * 4), time, true); // lean: 3-7
      spawnTimer.current = 0;
    }

    if (trebleSpark) {
      spawn(1 + Math.floor(audio.treble * 2), time, false); // lean: 1-3
    }

    ambientTimer.current += delta;
    if (ambientTimer.current > 0.7 + Math.random() * 0.5) {
      spawn(1, time, false); // lean ambient: 1 sparkle every 0.7-1.2s
      ambientTimer.current = 0;
    }

    const mesh = meshRef.current;
    if (!mesh) return;

    let dirty = false;

    for (let i = 0; i < pool.length; i++) {
      const s = pool[i];
      const age = time - s.birthTime;

      if (s.active && age < s.lifetime) {
        const t = age / s.lifetime;

        let scale: number;
        if (t < 0.15) {
          scale = t / 0.15;
        } else if (t < 0.40) {
          scale = 1.0;
        } else {
          scale = 1.0 - (t - 0.40) / 0.60;
        }

        if (t < 0.18 && t > 0.12) scale *= 1.2;

        scale = Math.max(0, scale);
        const renderScale = scale * s.size;
        const brightness = Math.max(0, scale);

        // Anamorphic horizontal streak — stretch X during flash phase
        let stretchX: number;
        if (t < 0.15) {
          stretchX = 1.0 + (t / 0.15) * 2.0;
        } else if (t < 0.40) {
          const audioStreak = s.big ? smoothBass.current : smoothTreble.current;
          stretchX = 3.0 + audioStreak * 0.5;
        } else {
          const deathT = (t - 0.40) / 0.60;
          stretchX = Math.max(1.0, 3.0 - deathT * 4.0);
        }

        scratch.position.set(s.x, s.y, s.z);
        scratch.rotation.set(0, 0, s.rot);
        scratch.scale.set(renderScale * stretchX, renderScale, 1);
        scratch.updateMatrix();
        mesh.setMatrixAt(i, scratch.matrix);

        const flashBoost = t < 0.40 ? 1.0 + (1.0 - t / 0.40) * 0.5 : 1.0;
        const audioLevel = s.big ? smoothBass.current : smoothTreble.current;
        const audioBoost = 1.0 + audioLevel * 0.8;
        const totalBrightness = brightness * flashBoost * audioBoost;
        workColor.setRGB(
          s.cr * totalBrightness,
          s.cg * totalBrightness,
          s.cb * totalBrightness,
        );
        mesh.setColorAt(i, workColor);
        dirty = true;
      } else if (!s.parked) {
        // Park dead sparkle once, then skip on subsequent frames
        s.active = false;
        scratch.position.set(0, 0, -100);
        scratch.scale.setScalar(0.0001);
        scratch.updateMatrix();
        mesh.setMatrixAt(i, scratch.matrix);
        workColor.setRGB(0, 0, 0);
        mesh.setColorAt(i, workColor);
        s.parked = true;
        dirty = true;
      }
    }

    if (dirty) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  });

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    workColor.setRGB(0, 0, 0);
    for (let i = 0; i < POOL_SIZE; i++) {
      scratch.position.set(0, 0, -100);
      scratch.scale.setScalar(0.0001);
      scratch.updateMatrix();
      mesh.setMatrixAt(i, scratch.matrix);
      mesh.setColorAt(i, workColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    return () => {
      geometry.dispose();
      material.dispose();
      sparkleTex.dispose();
    };
  }, [geometry, material, sparkleTex, scratch, workColor]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, POOL_SIZE]}
      frustumCulled={false}
      renderOrder={10}
    />
  );
}
