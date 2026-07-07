import type { WorldState } from '@/types/world';

export interface WorldTemplate {
  id: string;
  name: string;
  description: string;
  /** Keywords the AI / offline interpreter match against. */
  keywords: string[];
  patch: (base: WorldState) => Partial<WorldState>;
}

export const WORLD_TEMPLATES: WorldTemplate[] = [
  {
    id: 'medieval-kingdom',
    name: 'Medieval Kingdom',
    description: 'Walled town, timber and stone, winding lanes, deep forests.',
    keywords: ['medieval', 'kingdom', 'castle', 'village', 'fantasy', 'old town'],
    patch: () => ({
      terrain: { style: 'rolling', amplitude: 30, frequency: 1.1, octaves: 5, waterLevel: 0.2, rivers: 2 },
      city: { enabled: true, style: 'medieval', layout: 'radial', density: 0.7, maxFloors: 4, extent: 0.42 },
      roads: { widthScale: 0.7, sidewalks: false },
      vegetation: { enabled: true, style: 'mixed', density: 0.75 },
      lighting: { preset: 'day', fog: 0.35, exposure: 1 },
    }),
  },
  {
    id: 'cyberpunk-district',
    name: 'Cyberpunk District',
    description: 'Dense neon towers, wet asphalt, permanent night.',
    keywords: ['cyberpunk', 'neon', 'futuristic', 'sci-fi', 'district', 'blade'],
    patch: () => ({
      terrain: { style: 'flat', amplitude: 6, frequency: 1, octaves: 4, waterLevel: 0.08, rivers: 0 },
      city: { enabled: true, style: 'cyberpunk', layout: 'grid', density: 0.92, maxFloors: 32, extent: 0.8 },
      roads: { widthScale: 1.2, sidewalks: true },
      vegetation: { enabled: false, style: 'sparse', density: 0.1 },
      lighting: { preset: 'cyberpunk', fog: 0.6, exposure: 1.05 },
      effects: { particles: 'rain' },
    }),
  },
  {
    id: 'modern-city',
    name: 'Modern City',
    description: 'Glass and steel downtown on a coastal grid.',
    keywords: ['modern', 'city', 'downtown', 'office', 'contemporary', 'metropolis'],
    patch: () => ({
      terrain: { style: 'plains', amplitude: 14, frequency: 0.9, octaves: 4, waterLevel: 0.16, rivers: 1 },
      city: { enabled: true, style: 'modern', layout: 'grid', density: 0.72, maxFloors: 22, extent: 0.65 },
      roads: { widthScale: 1.1, sidewalks: true },
      vegetation: { enabled: true, style: 'oak', density: 0.35 },
      lighting: { preset: 'day', fog: 0.2, exposure: 1 },
    }),
  },
  {
    id: 'island-village',
    name: 'Island Village',
    description: 'Scattered isles, palm groves, a fishing village by the shore.',
    keywords: ['island', 'tropical', 'archipelago', 'beach', 'coast', 'fishing'],
    patch: () => ({
      terrain: { style: 'islands', amplitude: 24, frequency: 1.2, octaves: 5, waterLevel: 0.42, rivers: 0 },
      city: { enabled: true, style: 'nordic', layout: 'organic', density: 0.4, maxFloors: 2, extent: 0.35 },
      roads: { widthScale: 0.6, sidewalks: false },
      vegetation: { enabled: true, style: 'palm', density: 0.65 },
      lighting: { preset: 'day', fog: 0.15, exposure: 1.05 },
    }),
  },
  {
    id: 'mountain-wilds',
    name: 'Mountain Wilds',
    description: 'Ridged peaks, alpine forest, rivers cutting the valleys. No city.',
    keywords: ['mountain', 'mountainous', 'wilderness', 'alpine', 'peaks', 'terrain', 'nature'],
    patch: () => ({
      terrain: { style: 'mountains', amplitude: 58, frequency: 1.15, octaves: 6, waterLevel: 0.14, rivers: 3 },
      city: { enabled: false, style: 'nordic', layout: 'organic', density: 0.2, maxFloors: 2, extent: 0.2 },
      vegetation: { enabled: true, style: 'pine', density: 0.85 },
      lighting: { preset: 'dawn', fog: 0.45, exposure: 1 },
    }),
  },
  {
    id: 'nordic-harbor',
    name: 'Nordic Harbor',
    description: 'Painted timber houses under an overcast fjord sky.',
    keywords: ['nordic', 'scandinavian', 'harbor', 'fjord', 'norway', 'hygge'],
    patch: () => ({
      terrain: { style: 'islands', amplitude: 34, frequency: 1, octaves: 5, waterLevel: 0.34, rivers: 1 },
      city: { enabled: true, style: 'nordic', layout: 'organic', density: 0.55, maxFloors: 3, extent: 0.4 },
      roads: { widthScale: 0.8, sidewalks: true },
      vegetation: { enabled: true, style: 'pine', density: 0.7 },
      lighting: { preset: 'overcast', fog: 0.5, exposure: 0.95 },
    }),
  },
];

export function findTemplate(query: string): WorldTemplate | null {
  const q = query.toLowerCase();
  let best: WorldTemplate | null = null;
  let bestScore = 0;
  for (const t of WORLD_TEMPLATES) {
    let score = t.id === q || t.name.toLowerCase() === q ? 10 : 0;
    for (const k of t.keywords) if (q.includes(k)) score += 2;
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return bestScore > 0 ? best : null;
}
