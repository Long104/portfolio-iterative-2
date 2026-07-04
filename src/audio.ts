// AudioEngine — Web Audio API wrapper for audio-reactive visuals
// Provides bass / mid / treble / overall level extraction from an audio file.

export interface AudioData {
  bass: number; // 0–1, low frequencies (~20–250 Hz)
  mid: number; // 0–1, mid frequencies (~250–2000 Hz)
  treble: number; // 0–1, high frequencies (~2000–14000 Hz)
  level: number; // 0–1, overall RMS energy
}

const NUM_BINS = 256; // AnalyserNode fftSize=512 → 256 frequency bins
const FRAME_CACHE_MS = 16; // cache getData() for ~16ms — 5 consumers share 1 hardware read
const TARGET_VOLUME = 0.3;
const FADE_SECONDS = 1.5;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private freqData: Uint8Array<ArrayBuffer> = new Uint8Array(
    new ArrayBuffer(NUM_BINS),
  );

  private _isPlaying = false;
  private _audioBuffer: AudioBuffer | null = null;
  private _currentTrackUrl: string | null = null;
  private _startTime = 0;
  private _offset = 0;

  /** Cache of decoded AudioBuffers keyed by URL — prevents re-fetching on track switch. */
  private _bufferCache = new Map<string, AudioBuffer>();

  private _cache: AudioData = { bass: 0, mid: 0, treble: 0, level: 0 };
  private _lastReadTime = 0;

  get isPlaying() {
    return this._isPlaying;
  }

  // ── Lifecycle ──────────────────────────────────────────────

  async init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = NUM_BINS * 2; // 512
    this.analyser.smoothingTimeConstant = 0.5; // light analyser smoothing; per-layer smoothing happens in component
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = TARGET_VOLUME;

    // analyser → gain → destination
    this.analyser.connect(this.gainNode);
    this.gainNode.connect(this.ctx.destination);
  }

  /** Warm up AudioContext during a user gesture (e.g. click on boot overlay).
   *  Browsers block ctx.resume() outside user gestures, so call this early
   *  in a click/key handler so the context is running by the time engage() fires. */
  async warmUp() {
    if (!this.ctx) await this.init();
    if (this.ctx?.state === "suspended") {
      try {
        await this.ctx.resume();
      } catch {
        // Not in user gesture — will retry on engage()
      }
    }
  }

  async loadTrack(url: string) {
    await this.preloadTrack(url);
    // loadTrack also starts playback; preloadTrack just loads.
  }

  /** Fetch + decode audio into memory without starting playback.
   *  Safe to call early — on mount, before user interaction.
   *  Does NOT stop current playback — call start() or crossfadeTo() separately.
   *  Decoded buffers are cached by URL — switching back to a cached track is instant.
   *
   *  Checks window.__AUDIO_PRELOAD__ first — if the inline script in
   *  index.html already fetched + decoded this track, use that directly. */
  async preloadTrack(url: string) {
    if (!this.ctx) await this.init();
    if (!this.ctx) throw new Error("AudioContext not available");

    // Already cached — mark as current buffer, no network
    const cached = this._bufferCache.get(url);
    if (cached) {
      this._audioBuffer = cached;
      this._currentTrackUrl = url;
      return;
    }

    // Already this buffer loaded but not yet cached (first-time load)
    if (this._audioBuffer && this._currentTrackUrl === url) {
      this._bufferCache.set(url, this._audioBuffer);
      return;
    }

    // Different track — fetch + decode + cache, but DON'T stop the source.
    // Caller (start / crossfadeTo) is responsible for source lifecycle.
    this._currentTrackUrl = url;
    this._offset = 0;

    // ── Check for pre-fetched + pre-decoded buffer from index.html ──
    const preload = (window as Window & {
      __AUDIO_PRELOAD__?: Promise<{
        url: string;
        buffer: AudioBuffer | null;
        arrayBuffer?: ArrayBuffer;
      } | null>;
    }).__AUDIO_PRELOAD__;

    if (preload) {
      try {
        const result = await preload;
        if (result && result.url === url) {
          if (result.buffer) {
            this._audioBuffer = result.buffer;
            this._bufferCache.set(url, result.buffer);
            return;
          }
          if (result.arrayBuffer) {
            const decoded = await this.ctx.decodeAudioData(result.arrayBuffer);
            this._audioBuffer = decoded;
            this._bufferCache.set(url, decoded);
            return;
          }
        }
      } catch {
        // Preload failed — fall through to normal fetch
      }
    }

    // Fallback: normal fetch + decode
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("Failed to load " + url);
    const arrayBuffer = await resp.arrayBuffer();
    const decoded = await this.ctx.decodeAudioData(arrayBuffer);
    this._audioBuffer = decoded;
    this._bufferCache.set(url, decoded);
  }

  async start() {
    if (!this.ctx || !this.analyser || !this._audioBuffer) return;

    // Resume context (autoplay policy)
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }

    // Stop existing source before creating a new one (prevents duplicate playback)
    if (this.source) {
      try { this.source.stop(); } catch { /* already stopped */ }
      this.source.disconnect();
      this.source = null;
    }

    // Create source and connect: source → analyser (→ gain → destination already wired)
    this.source = this.ctx.createBufferSource();
    this.source.buffer = this._audioBuffer;
    this.source.loop = true;
    this.source.connect(this.analyser);
    this.source.start(0, this._offset);
    this._startTime = this.ctx.currentTime;
    this._isPlaying = true;

    // Fade in: 0 → target volume over FADE_SECONDS
    const now = this.ctx.currentTime;
    this.gainNode!.gain.cancelScheduledValues(now);
    this.gainNode!.gain.setValueAtTime(0, now);
    this.gainNode!.gain.linearRampToValueAtTime(TARGET_VOLUME, now + FADE_SECONDS);
  }

  /** Crossfade from current track to a new one.
   *  Fades out over FADE_SECONDS, swaps buffer, fades in over FADE_SECONDS.
   *  The old and new tracks overlap for a smooth transition. */
  async crossfadeTo(url: string): Promise<void> {
    if (!this.ctx || !this.gainNode || !this.analyser) return;

    // Make sure target buffer is available
    await this.preloadTrack(url);

    if (!this._audioBuffer) return;

    const now = this.ctx.currentTime;

    // Fade out current source
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
    this.gainNode.gain.linearRampToValueAtTime(0, now + FADE_SECONDS);

    // After fade-out completes, swap source and fade in
    await new Promise<void>((resolve) => {
      setTimeout(resolve, FADE_SECONDS * 1000);
    });

    // Swap to new buffer (already loaded by preloadTrack)
    if (this.source) {
      try { this.source.stop(); } catch { /* already stopped */ }
      this.source.disconnect();
      this.source = null;
    }
    this._offset = 0;
    this.source = this.ctx.createBufferSource();
    this.source.buffer = this._audioBuffer;
    this.source.loop = true;
    this.source.connect(this.analyser);
    this.source.start(0, 0);
    this._startTime = this.ctx.currentTime;
    this._isPlaying = true;

    // Fade in new track
    const fadeInTime = this.ctx.currentTime;
    this.gainNode.gain.cancelScheduledValues(fadeInTime);
    this.gainNode.gain.setValueAtTime(0, fadeInTime);
    this.gainNode.gain.linearRampToValueAtTime(TARGET_VOLUME, fadeInTime + FADE_SECONDS);
  }

  pause() {
    if (!this.ctx || !this.source) return;
    const elapsed = this.ctx.currentTime - this._startTime;
    this._offset = (this._offset + elapsed) % (this._audioBuffer?.duration ?? 1);
    this.source.stop();
    this.source.disconnect();
    this.source = null;
    this._isPlaying = false;
  }

  // ── Per-frame data extraction (frame-cached) ─────────────────
  // Multiple rAF consumers (PsycommuWaveform, CursorOverlay, TunnelCanvas,
  // ScrollProgress, KiraKiraVortex) all call getData() at different rates.
  // Without caching, every call hits the AnalyserNode hardware blocking read.
  // Frame cache: only read from hardware once per ~16ms window.
  // All callers within the same window share the cached result — zero waste.

  getData(): AudioData {
    if (!this.analyser || !this._isPlaying) {
      this._cache.bass = 0;
      this._cache.mid = 0;
      this._cache.treble = 0;
      this._cache.level = 0;
      return this._cache;
    }

    // Frame cache: skip hardware read if we already read within ~16ms
    const now = performance.now();
    if (now - this._lastReadTime < FRAME_CACHE_MS) {
      return this._cache;
    }
    this._lastReadTime = now;

    this.analyser.getByteFrequencyData(this.freqData);

    // Split 256 bins into 3 perceptual bands.
    // At 44.1kHz: bass ≈ bins 0–6, mid ≈ bins 7–60, treble ≈ bins 61–255
    const bassEnd = 7;
    const midEnd = 61;

    let bassSum = 0;
    let midSum = 0;
    let trebleSum = 0;
    let allSum = 0;

    for (let i = 0; i < NUM_BINS; i++) {
      const v = this.freqData[i];
      allSum += v;
      if (i < bassEnd) bassSum += v;
      else if (i < midEnd) midSum += v;
      else trebleSum += v;
    }

    this._cache.bass = bassSum / (bassEnd * 255);
    this._cache.mid = midSum / ((midEnd - bassEnd) * 255);
    this._cache.treble = trebleSum / ((NUM_BINS - midEnd) * 255);
    this._cache.level = allSum / (NUM_BINS * 255);
    return this._cache;
  }

  // ── Cleanup ────────────────────────────────────────────────

  dispose() {
    if (this.source) {
      try { this.source.stop(); } catch { /* already stopped */ }
      this.source.disconnect();
      this.source = null;
    }
    this.analyser?.disconnect();
    this.gainNode?.disconnect();
    this.ctx?.close();
    this.ctx = null;
    this.analyser = null;
    this.gainNode = null;
    this._audioBuffer = null;
    this._bufferCache.clear();
    this._isPlaying = false;
  }
}
