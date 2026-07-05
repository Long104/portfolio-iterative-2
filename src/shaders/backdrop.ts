// Fullscreen backdrop — prevents black void
// OPTIMIZED: radial gradient pre-baked to 256×1 LUT (createBackdropLUT).
// Replaces 6 smoothstep + 6 mix per pixel with 1 texture lookup.
export const backdropVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

export const backdropFragment = /* glsl */ `
  uniform float uAspect;
  uniform float uBass;
  uniform sampler2D uBackdropLUT;
  varying vec2 vUv;
  void main() {
    // Center coordinate space + correct for aspect ratio (matches glow shader)
    vec2 centered = vUv - vec2(0.5);
    centered.x *= uAspect;
    float dist = length(centered);

    // Sample pre-baked radial gradient — identical to the former 6-stop
    // smoothstep/mix chain, but as a single texture lookup.
    vec3 color = texture2D(uBackdropLUT, vec2(clamp(dist, 0.0, 1.0), 0.5)).rgb;

    // Audio: bass makes the void breathe — barely perceptible
    color *= 1.0 + uBass * 0.06;

    gl_FragColor = vec4(color, 1.0);

    #include <colorspace_fragment>
  }
`;
