// Layer D: Four stacked fullscreen meshes with additive blending.
// AUDIO STRATEGY: near-dark at rest, EXPLODES bright on beat.
// Maximum perceptual contrast — punchy visual response.
//
// OPTIMIZATION: noise + fbm baked into a pre-computed texture at init.
// Per-pixel ALU replaced with texture2D lookup — ~10× cheaper on mobile GPU.
//
// OPTIMIZATION v2: 4 sub-layers each have their radial color+intensity profile
// baked into a 256×4 LUT (createGlowLUT in textures.ts). The smoothstep/mix
// chains for color mixing and the exp/smoothstep intensity curves are replaced
// by texture lookups — ~25 fewer ALU ops per pixel, 4 extra coherent lookups.

export const glowVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

export const glowFragment = /* glsl */ `
  uniform float uAspect;
  uniform float uTime;
  uniform float uCoreBass;
  uniform float uSunBass;
  uniform float uRaysTreble;
  uniform float uBridgeMid;
  uniform sampler2D uNoiseTex;
  uniform sampler2D uGlowLUT;
  varying vec2 vUv;

  // Pre-baked noise lookup (R) and fbm lookup (G)
  float n(vec2 p) { return texture2D(uNoiseTex, p / 8.0).r; }
  float f(vec2 p) { return texture2D(uNoiseTex, p / 8.0).g; }

  void main() {
    vec2 centered = vUv - vec2(0.5);
    centered.x *= uAspect;
    float dist = length(centered);

    // Master early-out — dynamic: expands on bass hit
    if (dist > 0.35 + uSunBass * 0.06) discard;

    float angle = atan(centered.y, centered.x);
    vec3 totalColor = vec3(0.0);
    const float invMaxDist = 1.0 / 0.45;

    // ══════ D4: SUN ══════
    {
      float gasNoise = f(centered * 4.0 - vec2(uTime * 0.3, uTime * 0.3));
      float ripple = f(vec2(angle * 3.0, uTime * 0.6)) * 0.02;
      float d = dist + ripple + gasNoise * 0.015;

      vec4 sun = texture2D(uGlowLUT, vec2(d * invMaxDist, 0.125));
      float gasFactor = (0.1 + gasNoise * 0.1);
      totalColor += sun.rgb * sun.a * gasFactor * (0.15 + uSunBass * 0.85) * (0.2 + uSunBass * 0.8);
    }

    // ══════ D3: RAYS ══════
    {
      float a = angle + uTime * 0.03;
      float rays = pow(0.5 + 0.5 * sin(a * 6.0), 8.0);
      rays += pow(0.5 + 0.5 * sin(a * 13.0 + 1.5), 16.0) * 0.4;

      float noiseVal = n(vec2(angle * 5.0, uTime * 0.2));
      rays *= 0.6 + noiseVal * 0.8;

      vec4 rayLUT = texture2D(uGlowLUT, vec2(dist * invMaxDist, 0.375));
      float alpha = rays * rayLUT.a * (0.15 + uRaysTreble * 1.5);
      totalColor += rayLUT.rgb * alpha * alpha;
    }

    // ══════ D2: BRIDGE ══════
    if (dist < 0.25) {
      float gasNoise = n(centered * 4.0 - vec2(uTime * 3.0));
      float d = dist + gasNoise * 0.012;

      vec4 bridge = texture2D(uGlowLUT, vec2(d * invMaxDist, 0.625));
      totalColor += bridge.rgb * bridge.a * (0.2 + uBridgeMid * 0.8);
    }

    // ══════ D1: CORE ══════
    if (dist < 0.17) {
      float gasNoise = n(centered * 6.0 - vec2(uTime * 0.5, uTime * 0.5));
      float d = dist + gasNoise * 0.01;

      vec4 core = texture2D(uGlowLUT, vec2(d * invMaxDist, 0.875));
      totalColor += core.rgb * core.a * (0.2 + uCoreBass * 2.5);
    }

    if (dot(totalColor, totalColor) < 0.000001) discard;

    gl_FragColor = vec4(totalColor, 1.0);

    #include <colorspace_fragment>
  }
`;
