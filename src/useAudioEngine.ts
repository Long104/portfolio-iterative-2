import { useCallback, useRef, useState } from "react";
import { AudioEngine, type AudioData } from "./audio";

// Singleton — one AudioEngine shared across all components.
// Created on first use, disposed on page unload.
let engineSingleton: AudioEngine | null = null;

function getEngine() {
  if (!engineSingleton) engineSingleton = new AudioEngine();
  return engineSingleton;
}

export function useAudioEngine() {
  const engineRef = useRef<AudioEngine>(getEngine());
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const start = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await engineRef.current.start();
      setIsPlaying(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to start audio";
      setError(msg);
      console.error("[AudioEngine]", msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const pause = useCallback(() => {
    engineRef.current.pause();
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) pause();
    else start();
  }, [isPlaying, start, pause]);

  // Call every frame to get smoothed audio data
  const getData = useCallback((): AudioData => {
    return engineRef.current.getData();
  }, []);

  return { isPlaying, isLoading, error, start, pause, toggle, getData };
}
