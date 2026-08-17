import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSound } from "@/hooks/useSound";
import { playCue } from "@/lib/sound";

/** A small speaker toggle for the realm's voice — persisted, live. */
export function SoundToggle({ className }: { className?: string }) {
  const { muted, toggle } = useSound();
  return (
    <button
      type="button"
      data-sfx="off"
      aria-label={muted ? "Unmute the realm" : "Mute the realm"}
      aria-pressed={!muted}
      title={muted ? "Sound off" : "Sound on"}
      onClick={() => {
        toggle();
        if (muted) playCue("confirm"); // was muted → now on: a little chime
      }}
      className={cn(
        "grid h-7 w-7 place-items-center rounded-sm border border-white/10 text-muted-foreground transition-colors hover:border-gold/50 hover:text-gold",
        !muted && "text-gold",
        className,
      )}
    >
      {muted ? (
        <VolumeX className="h-4 w-4" aria-hidden />
      ) : (
        <Volume2 className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}
