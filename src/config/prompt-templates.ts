import type { PromptTemplate } from '@/types/chat';

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  { category: 'Worlds', label: 'Medieval kingdom', text: 'Create a medieval kingdom with a walled town, farms and deep forests.' },
  { category: 'Worlds', label: 'Cyberpunk district', text: 'Create a dense cyberpunk district. Permanent night, neon windows, rain.' },
  { category: 'Worlds', label: 'Island village', text: 'Generate a tropical island archipelago with a small fishing village.' },
  { category: 'Worlds', label: 'Modern downtown', text: 'Generate a modern downtown with tall glass towers and a riverside.' },
  { category: 'Terrain', label: 'Mountains & rivers', text: 'Make this map mountainous with rivers cutting through the valleys.' },
  { category: 'Terrain', label: 'Gentle plains', text: 'Flatten the terrain into gentle plains with a single wide river.' },
  { category: 'Terrain', label: 'Canyon lands', text: 'Turn the terrain into red canyon lands with no water.' },
  { category: 'Buildings', label: 'Japanese architecture', text: 'Replace every building with traditional Japanese architecture.' },
  { category: 'Buildings', label: 'Denser city', text: 'Make the city 30% denser and raise the maximum height.' },
  { category: 'Buildings', label: 'Wider roads', text: 'Make all roads 25% wider and add sidewalks.' },
  { category: 'Lighting', label: 'Sunset', text: 'Sunset lighting with long shadows and light haze.' },
  { category: 'Lighting', label: 'Rainy evening', text: 'Rainy evening. Heavy fog, dim light, windows glowing.' },
  { category: 'Lighting', label: 'Clear night', text: 'Clear night sky with stars and lit windows.' },
  { category: 'Materials', label: 'All marble', text: 'Make every building marble.' },
  { category: 'Materials', label: 'Dark walnut', text: 'Use dark walnut wood for all buildings.' },
  { category: 'Camera', label: 'Cinematic fly-through', text: 'Give me a cinematic fly-through of the whole scene.' },
  { category: 'Analysis', label: 'Project stats', text: 'How many buildings are in this project, and what is the tallest structure?' },
  { category: 'Analysis', label: 'Green space', text: 'How much green space and water coverage does this world have?' },
  { category: 'Optimization', label: 'Optimize for mobile', text: 'Optimize this scene for mobile.' },
];
