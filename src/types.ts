export interface PresetTheme {
  id: string;
  name: string;
  description: string;
  vibe: string;
  suggestedColors: string[];
}

export interface MediumAd {
  copy: string;
  ideas: string;
  imageUrl?: string;
  promptUsed?: string;
  loading?: boolean;
  error?: string;
}

export interface BrandCampaign {
  id: string;
  name: string;
  description: string;
  theme: string;
  colors: string[];
  createdAt: string;
  visualBlueprint?: string;
  tagline?: string;
  billboard?: MediumAd;
  newspaper?: MediumAd;
  socialPost?: MediumAd;
}

export const PRESET_THEMES: PresetTheme[] = [
  {
    id: "minimalist_luxury",
    name: "Minimalist Luxury",
    description: "Elegant, clean layouts with generous breathing room and premium materials.",
    vibe: "Sophisticated, high-end, quiet luxury",
    suggestedColors: ["#0F172A", "#F8FAFC", "#D4AF37", "#E2E8F0"], // slate, white, gold
  },
  {
    id: "cyberpunk_tech",
    name: "Cyberpunk Tech",
    description: "Vibrant neon lighting, high-contrast dark tones, and futuristic tech accents.",
    vibe: "Futuristic, energetic, sharp, technical",
    suggestedColors: ["#020617", "#06B6D4", "#F43F5E", "#10B981"], // dark slate, cyan, rose, green
  },
  {
    id: "organic_earthy",
    name: "Organic Earthy",
    description: "Warm, natural textures, handmade feels, and rich ecological tones.",
    vibe: "Eco-friendly, wholesome, peaceful, natural",
    suggestedColors: ["#1B4D3E", "#DFD3C3", "#A0522D", "#F4F1EA"], // forest green, beige, sienna
  },
  {
    id: "retro_bold",
    name: "Retro Bold",
    description: "Chunky typography, playful high-saturation vintage colors, and grain filters.",
    vibe: "Nostalgic, fun, striking, bold",
    suggestedColors: ["#EA580C", "#FACC15", "#1E3A8A", "#FFFBEB"], // orange, yellow, blue, cream
  },
  {
    id: "modern_industrial",
    name: "Modern Industrial",
    description: "Raw concrete, steel accents, matte textures, and bold monochromatic contrast.",
    vibe: "Rugged, functional, structural, direct",
    suggestedColors: ["#1F2937", "#9CA3AF", "#E5E7EB", "#EF4444"], // dark gray, cool gray, light gray, red
  }
];
