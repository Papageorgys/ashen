import { useCallback, useEffect, useState } from "react";
import {
  playCue,
  isMuted,
  toggleMuted,
  setMuted as setMutedRaw,
  subscribeSound,
  type Cue,
} from "@/lib/sound";

/** Reactive access to the SFX engine — a play() fn and the live mute state. */
export function useSound() {
  const [muted, setMutedState] = useState(isMuted());
  useEffect(() => subscribeSound((p) => setMutedState(p.muted)), []);
  const play = useCallback((cue: Cue) => playCue(cue), []);
  const toggle = useCallback(() => toggleMuted(), []);
  const setMuted = useCallback((m: boolean) => setMutedRaw(m), []);
  return { play, muted, toggle, setMuted };
}
