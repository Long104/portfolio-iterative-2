import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  InstancedMesh,
  LinearFilter,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  SRGBColorSpace,
} from "three";
import { useAudioEngine } from "./useAudioEngine";

// ==========================================
// SPARKLE SYSTEM — True kira-kira sparkles
// Diamond sparkles SPAWN from nothing, FLASH bright, DIE.
// Beat-driven spawning + ambient twinkle.
// ==========================================

const POOL_SIZE = 200;

// Pastel kira-kira palette
const SPARKLE_COLORS: [number, number, number][] = [
  [0.938, 0.278, 0.386], // vibrant pink
  [0.947, 0.481, 0.584], // pastel rose
  [0.262, 1.000, 0.320], // mint green
  [0.850, 1.000, 0.448], // lime
  [0.612, 1.000, 0.402], // mint yellow
  [0.984, 0.694, 0.761], // blush
  [1.000, 1.000, 0.448], // pastel yellow
  [0.973, 0.612, 0.694], // sakura
  [0.947, 0.247, 0.347], // neon pink
  [1.000, 0.973, 0.612], // warm cream
  [0.106, 0.737, 0.698], // teal
];

// Sharp 4-pointed diamond sparkle texture
function createSparkleTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const c = size / 2;

  // Bright core — bigger and hotter
  const core = ctx.createRadialGradient(c, c, 0, c, c, 14);
  core.addColorStop(0, "rgba(255,255,255,1)");
  core.addColorStop(0.3, "rgba(255,255,255,0.9)");
  core.addColorStop(0.6, "rgba(255,255,255,0.4)");
  core.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, size, size);

  // Sharp 4-pointed diamond spikes — thicker and brighter
  ctx.save();
  ctx.translate(c, c);
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 2; i++) {
    const spike = ctx.createLinearGradient(-c, 0, c, 0);
    spike.addColorStop(0.0, "rgba(255,255,255,0)");
    spike.addColorStop(0.30, "rgba(255,255,255,0)");
    spike.addColorStop(0.50, "rgba(255,255,255,1)");
    spike.addColorStop(0.70, "rgba(255,255,255,0)");
    spike.addColorStop(1.0, "rgba(255,255,255,0)");
    ctx.fillStyle = spike;
    ctx.fillRect(-c, -2, size, 4); // thicker spikes
    ctx.rotate(Math.PI / 2);
  }

  // Diagonal sparkle lines (45° offset) for extra ✧ shape
  ctx.rotate(Math.PI / 4);
  for (let i = 0; i < 2; i++) {
    const spike = ctx.createLinearGradient(-c, 0, c, 0);
    spike.addColorStop(0.0, "rgba(255,255,255,0)");
    spike.addColorStop(0.40, "rgba(255,255,255,0)");
    spike.addColorStop(0.50, "rgba(255,255,255,0.5)");
    spike.addColorStop(0.60, "rgba(255,255,255,0)");
    spike.addColorStop(1.0, "rgba(255,255,255,0)");
    ctx.fillStyle = spike;
    ctx.fillRect(-c, -1, size, 2); // thinner diagonal spikes
    ctx.rotate(Math.PI / 2);
  }
  ctx.restore();

  const tex = new CanvasTexture(canvas);
  tex.generateMipmaps = false;
  tex.minFilter = LinearFilter;
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

interface Sparkle {
  x: number; y: number; z: number;
  rot: number;
  size: number;
  cr: number; cg: number; cb: number;
  birthTime: number;
  lifetime: number;
  active: boolean;
}

export default function SparkleSystem() {
  const { getData } = useAudioEngine();
  const meshRef = useRef<InstancedMesh>(null);
  const prevBass = useRef(0);
  const prevTreble = useRef(0);
  const spawnTimer = useRef(0);
  const ambientTimer = useRef(0);

  const sparkleTex = useMemo(() => createSparkleTexture(), []);
  // Bigger geometry — was 0.3, now 1.0
  const geometry = useMemo(() => new PlaneGeometry(1.0, 1.0), []);
  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        map: sparkleTex,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [sparkleTex],
  );

  const pool = useMemo<Sparkle[]>(() => {
    const arr: Sparkle[] = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      arr.push({
        x: 0, y: 0, z: -100,
        rot: 0, size: 0,
        cr: 1, cg: 1, cb: 1,
        birthTime: -1, lifetime: 0, active: false,
      });
    }
    return arr;
  }, []);

  const dummy = useMemo(() => new Object3D(), []);
  const tmpColor = useMemo(() => new Color(), []);

  function spawn(count: number, time: number, big: boolean) {
    let spawned = 0;
    for (const s of pool) {
      if (spawned >= count) break;
      if (s.active) continue;

      const angle = Math.random() * Math.PI * 2;
      const radius = big
        ? 1.0 + Math.random() * 6   // bass: wide spread
        : 1.5 + Math.random() * 4;  // treble: medium spread

      s.x = Math.cos(angle) * radius;
      s.y = Math.sin(angle) * radius * 0.8;
      // Closer to camera — was -3 to -25, now -1 to -15
      s.z = -1 - Math.random() * 14;

      s.rot = Math.random() * Math.PI * 2;
      // Bigger sizes — was 0.2-0.5 / 0.1-0.25
      s.size = big
        ? 0.6 + Math.random() * 0.7   // bass: 0.6-1.3 (big sparkles)
        : 0.3 + Math.random() * 0.4;  // treble: 0.3-0.7 (medium sparkles)

      const col = SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)];
      s.cr = col[0]; s.cg = col[1]; s.cb = col[2];

      s.birthTime = time;
      s.lifetime = 0.3 + Math.random() * 0.5; // 300-800ms
      s.active = true;
      spawned++;
    }
  }

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    const audio = getData();

    // Beat detection
    const bassBeat = audio.bass > 0.4 && audio.bass > prevBass.current * 1.12;
    prevBass.current = audio.bass;

    const trebleSpark = audio.treble > 0.10 && audio.treble > prevTreble.current * 1.25;
    prevTreble.current = audio.treble;

    // Spawning
    spawnTimer.current += delta;

    if (bassBeat && spawnTimer.current > 0.06) {
      const count = 6 + Math.floor(audio.bass * 12); // 6-18 sparkles
      spawn(count, time, true);
      spawnTimer.current = 0;
    }

    if (trebleSpark) {
      spawn(2 + Math.floor(audio.treble * 5), time, false);
    }

    ambientTimer.current += delta;
    if (ambientTimer.current > 0.35 + Math.random() * 0.25) {
      spawn(1 + Math.floor(Math.random() * 2), time, false);
      ambientTimer.current = 0;
    }

    // Update instances
    const mesh = meshRef.current;
    if (!mesh) return;

    for (let i = 0; i < pool.length; i++) {
      const s = pool[i];
      const age = time - s.birthTime;

      if (s.active && age < s.lifetime) {
        const t = age / s.lifetime;

        // Lifecycle: grow (0-15%) → hold (15-40%) → shrink (40-100%)
        let scale: number;
        if (t < 0.15) {
          scale = t / 0.15;
        } else if (t < 0.40) {
          scale = 1.0;
        } else {
          scale = 1.0 - (t - 0.40) / 0.60;
        }

        // Brief overshoot "pop" at birth
        if (t < 0.18 && t > 0.12) scale *= 1.2;

        scale = Math.max(0, scale);
        const renderScale = scale * s.size;
        const brightness = Math.max(0, scale);

        dummy.position.set(s.x, s.y, s.z);
        dummy.rotation.set(0, 0, s.rot);
        dummy.scale.setScalar(renderScale);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);

        // Boost brightness during flash phase
        const flashBoost = t < 0.40 ? 1.0 + (1.0 - t / 0.40) * 0.5 : 1.0;
        tmpColor.setRGB(
          s.cr * brightness * flashBoost,
          s.cg * brightness * flashBoost,
          s.cb * brightness * flashBoost,
        );
        mesh.setColorAt(i, tmpColor);
      } else {
        if (s.active) s.active = false;
        dummy.position.set(0, 0, -100);
        dummy.scale.setScalar(0.0001);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        tmpColor.setRGB(0, 0, 0);
        mesh.setColorAt(i, tmpColor);
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    tmpColor.setRGB(0, 0, 0);
    for (let i = 0; i < POOL_SIZE; i++) {
      dummy.position.set(0, 0, -100);
      dummy.scale.setScalar(0.0001);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, tmpColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    return () => {
      geometry.dispose();
      material.dispose();
      sparkleTex.dispose();
    };
  }, [geometry, material, sparkleTex, dummy, tmpColor]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, POOL_SIZE]}
      frustumCulled={false}
      renderOrder={10}
    />
  );
}
