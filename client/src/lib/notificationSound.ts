// Sound types available
export type SoundType = "ding" | "chime" | "bell" | "pop" | "suave" | "marimba" | "melodia" | "digital" | "triplo" | "none";

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
  { id: "suave", name: "Suave", description: "Tom baixo e delicado, discreto" },
  { id: "marimba", name: "Marimba", description: "Notas curtas tipo xilofone" },
  { id: "melodia", name: "Melodia", description: "Sequência curta e agradável de 4 notas" },
  { id: "digital", name: "Digital", description: "Bipe moderno e limpo" },
  { id: "triplo", name: "Triplo", description: "Três tons suaves ascendentes" },
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
