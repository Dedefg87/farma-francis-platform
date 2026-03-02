// Sound types available
export type SoundType = "ding" | "chime" | "bell" | "pop" | "none";

export interface SoundOption {
  id: SoundType;
  name: string;
  description: string;
}

export const SOUND_OPTIONS: SoundOption[] = [
  { id: "ding", name: "Ding", description: "Som clássico de notificação" },
  { id: "chime", name: "Chime", description: "Sino gentil" },
  { id: "bell", name: "Bell", description: "Campainha" },
  { id: "pop", name: "Pop", description: "Pop divertido" },
  { id: "none", name: "Nenhum", description: "Sem som" },
];

// Get sound preference from localStorage
export function getSoundPreference(): SoundType {
  if (typeof window === "undefined") return "ding";
  const saved = localStorage.getItem("notificationSound");
  if (saved && SOUND_OPTIONS.some(s => s.id === saved)) {
    return saved as SoundType;
  }
  return "ding";
}

// Save sound preference to localStorage
export function setSoundPreference(sound: SoundType): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("notificationSound", sound);
}
