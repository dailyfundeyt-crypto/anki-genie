import type { Card } from "./csv";

export type VocabSet = {
  id: string;
  name: string;
  createdAt: number;
  cards: Card[];
};

const KEY = "anki-sets";

export function loadHistory(): VocabSet[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as VocabSet[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHistory(sets: VocabSet[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(sets));
}

export function addToHistory(set: VocabSet) {
  const all = loadHistory();
  all.unshift(set);
  saveHistory(all.slice(0, 50));
}

export function removeFromHistory(id: string) {
  saveHistory(loadHistory().filter((s) => s.id !== id));
}
