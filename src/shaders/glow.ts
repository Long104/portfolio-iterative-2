// Layer D: Four stacked fullscreen meshes with additive blending.
// AUDIO STRATEGY: near-dark at rest, EXPLODES bright on beat.
// Maximum perceptual contrast — punchy visual response.
//
// OPTIMIZATION: noise + fbm baked into a pre-computed texture at init.
// Per-pixel ALU replaced with texture2D lookup — ~10× cheaper on mobile GPU.
// Texture R channel = value noise, G channel = 2-octave fbm.
// Coordinate mapping: UV = inputCoord / 8.0 (texture is 512×512, 64px/cell).

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
  varying vec2 vUv;

  // Pre-baked noise lookup (R) and fbm lookup (G)
  // Texture coord = inputCoord / 8.0 (matching the 512×64px/cell bake)
  float n(vec2 p) { return texture2D(uNoiseTex, p / 8.0).r; }
  float f(vec2 p) { return texture2D(uNoiseTex, p / 8.0).g; }

  void main() {
    vec2 centered = vUv - vec2(0.5);
    centered.x *= uAspect;
    float dist = length(centered);

    // Master early-out — tighter threshold, glow is near-invisible past 0.25
    if (dist > 0.35 + uSunBass * 0.06) discard;

    float angle = atan(centered.y, centered.x);
    vec3 totalColor = vec3(0.0);

    // ══════ D4: SUN ══════
    {
      float gasNoise = f(centered * 4.0 - vec2(uTime * 0.3, uTime * 0.3));
      float ripple = f(vec2(angle * 3.0, uTime * 0.6)) * 0.02;
      float d = dist + ripple;

      vec3 whiteCore = vec3(1.0, 0.95, 0.0);
      vec3 yellow    = vec3(1.0, 0.85, 0.0);
      vec3 midPink   = vec3(1.0, 0.08, 0.58);
      vec3 outerEdge = vec3(1.0, 0.0, 0.2);

      vec3 color = outerEdge;
      color = mix(color, midPink,   smoothstep(0.15, 0.025, d + gasNoise * 0.015));
      color = mix(color, yellow,    smoothstep(0.09, 0.03, d + gasNoise * 0.015));
      color = mix(color, whiteCore, smoothstep(0.02, 0.0, d + gasNoise * 0.015));

      float glow = min(exp(-d * 8.0) + 0.4, 0.85) * (0.15 + uSunBass * 0.85);
      float alpha = smoothstep(0.42, 0.06, d) * (0.1 + gasNoise * 0.1) * (0.2 + uSunBass * 0.8);

      totalColor += color * glow * alpha;
    }

    // ══════ D3: RAYS ══════
    {
      float a = angle + uTime * 0.03;
      float rays = pow(0.5 + 0.5 * sin(a * 6.0), 8.0);
      rays += pow(0.5 + 0.5 * sin(a * 13.0 + 1.5), 16.0) * 0.4;

      float noiseVal = n(vec2(angle * 5.0, uTime * 0.2));
      rays *= 0.6 + noiseVal * 0.8;

      float distFade = smoothstep(0.42, 0.06, dist) * smoothstep(0.0, 0.02, dist);

      vec3 rayColor = mix(
        vec3(1.0, 0.88, 0.3),
        vec3(1.0, 0.4, 0.6),
        smoothstep(0.05, 0.3, dist)
      );

      float alpha = rays * distFade * 0.2 * (0.15 + uRaysTreble * 1.5);

      totalColor += rayColor * alpha * alpha;
    }

    // ══════ D2: BRIDGE ══════
    if (dist < 0.25) {
      float gasNoise = n(centered * 4.0 - vec2(uTime * 3.0));
      float d = dist + gasNoise * 0.012;

      vec3 whiteCore = vec3(1.0, 0.90, 0.0);
      vec3 gold      = vec3(1.0, 0.70, 0.0);
      vec3 softPink  = vec3(0.992, 0.682, 0.761);

      vec3 color = softPink;
      color = mix(color, gold,      smoothstep(0.15, 0.06, d));
      color = mix(color, whiteCore, smoothstep(0.04, 0.0, d));

      float glow = exp(-d * 6.0) * (0.2 + uBridgeMid * 0.8);
      float alpha = smoothstep(0.25, 0.05, d);

      totalColor += color * glow * 0.8 * alpha * 0.5;
    }

    // ══════ D1: CORE ══════
    if (dist < 0.17) {
      float gasNoise = n(centered * 6.0 - vec2(uTime * 0.5, uTime * 0.5));
      float d = dist + gasNoise * 0.01;

      vec3 softPink  = vec3(1.0, 0.92, 0.0);
      vec3 whiteCore = vec3(1.0, 1.0, 0.9);
      vec3 sunYellow = vec3(1.0, 0.85, 0.15);

      vec3 color = softPink;
      color = mix(color, sunYellow, smoothstep(0.10, 0.03, d));
      color = mix(color, whiteCore, smoothstep(0.01, 0.00, d));

      float alpha = smoothstep(0.13, 0.01, d);

      float coreBoost = 0.2 + uCoreBass * 2.5;

      totalColor += color * coreBoost * alpha;
    }

    if (dot(totalColor, totalColor) < 0.000001) discard;

    gl_FragColor = vec4(totalColor, 1.0);

    #include <colorspace_fragment>
  }
`;
