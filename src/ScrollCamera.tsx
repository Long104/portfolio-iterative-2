import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";

interface ScrollCameraProps {
  progress: number; // 0–1
}

// Camera orbits the scene based on scroll progress.
// Uses smooth lerp so movement is gentle — no snapping.
export default function ScrollCamera({ progress }: ScrollCameraProps) {
  const { camera } = useThree();
  const targetPos = useRef(new Vector3(0, 0, 5));
  const lookAt = useRef(new Vector3(0, 0, 0));

  useFrame(() => {
    // Parametric orbit:
    //   x → gentle side-to-side sway (full sine wave per scroll)
    //   y → rises toward the end (half sine)
    //   z → pulls slightly closer in the middle
    const angle = progress * Math.PI * 2;
    const x = Math.sin(angle) * 1.8;
    const y = Math.sin(progress * Math.PI) * 1.2 - 0.2;
    const z = 5 - Math.sin(progress * Math.PI * 0.5) * 1.2;

    targetPos.current.set(x, y, z);

    // Smooth interpolation — slow enough to feel cinematic, fast enough to feel responsive
    camera.position.lerp(targetPos.current, 0.035);
    camera.lookAt(lookAt.current);
  });

  return null;
}
