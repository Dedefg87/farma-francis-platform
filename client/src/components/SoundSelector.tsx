import { useState, useEffect } from "react";
import {
  SoundType,
  SOUND_OPTIONS,
  getSoundPreference,
  setSoundPreference,
} from "@/lib/notificationSound";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";

export function SoundSelector() {
  const [currentSound, setCurrentSound] = useState<SoundType>("ding");
  const { playSound } = useNotificationSound();

  useEffect(() => {
    setCurrentSound(getSoundPreference());
  }, []);

  const handleSoundChange = (sound: SoundType) => {
    setSoundPreference(sound);
    setCurrentSound(sound);
    // Play a preview of the sound
    playSound(sound);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium">Som de notificação</label>
      <div className="flex flex-wrap gap-2">
        {SOUND_OPTIONS.map(option => (
          <Button
            key={option.id}
            variant={currentSound === option.id ? "default" : "outline"}
            size="sm"
            onClick={() => handleSoundChange(option.id)}
            className="flex items-center gap-2"
          >
            {option.id === "none" ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
            {option.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
