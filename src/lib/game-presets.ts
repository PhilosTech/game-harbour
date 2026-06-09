export type GamePresetLabel = {
  key: string;
  labelRu: string;
  labelEn: string;
};

export const HERO_PRESETS: GamePresetLabel[] = [
  { key: 'doctor', labelRu: 'Врач', labelEn: 'Doctor' },
  { key: 'engineer', labelRu: 'Инженер', labelEn: 'Engineer' },
  { key: 'journalist', labelRu: 'Журналист', labelEn: 'Journalist' },
  { key: 'guide', labelRu: 'Проводник', labelEn: 'Guide' },
  { key: 'financier', labelRu: 'Финансист', labelEn: 'Financier' },
  { key: 'soldier', labelRu: 'Бывший военный', labelEn: 'Ex-military' },
  { key: 'scientist', labelRu: 'Учёный', labelEn: 'Scientist' },
  { key: 'negotiator', labelRu: 'Переговорщик', labelEn: 'Negotiator' },
];

export const TRAIT_PRESETS: GamePresetLabel[] = [
  { key: 'observation', labelRu: 'Наблюдательность', labelEn: 'Observation' },
  { key: 'endurance', labelRu: 'Выносливость', labelEn: 'Endurance' },
  { key: 'persuasion', labelRu: 'Убеждение', labelEn: 'Persuasion' },
  { key: 'survival', labelRu: 'Выживание', labelEn: 'Survival' },
  { key: 'medicine', labelRu: 'Медицина', labelEn: 'Medicine' },
  { key: 'stealth', labelRu: 'Скрытность', labelEn: 'Stealth' },
  { key: 'navigation', labelRu: 'Навигация', labelEn: 'Navigation' },
  { key: 'technical', labelRu: 'Техника', labelEn: 'Technical skill' },
  { key: 'leadership', labelRu: 'Лидерство', labelEn: 'Leadership' },
  { key: 'empathy', labelRu: 'Эмпатия', labelEn: 'Empathy' },
  { key: 'languages', labelRu: 'Языки', labelEn: 'Languages' },
  { key: 'athletics', labelRu: 'Атлетика', labelEn: 'Athletics' },
  { key: 'crafting', labelRu: 'Ремесло', labelEn: 'Crafting' },
  { key: 'intuition', labelRu: 'Интуиция', labelEn: 'Intuition' },
  { key: 'investigation', labelRu: 'Расследование', labelEn: 'Investigation' },
  { key: 'driving', labelRu: 'Вождение', labelEn: 'Driving' },
];

export const WEAKNESS_PRESETS: GamePresetLabel[] = [
  { key: 'impulsive', labelRu: 'Импульсивность', labelEn: 'Impulsive' },
  { key: 'clumsy', labelRu: 'Неловкость', labelEn: 'Clumsy' },
  { key: 'trusting', labelRu: 'Доверчивость', labelEn: 'Too trusting' },
  { key: 'slow', labelRu: 'Медлительность', labelEn: 'Slow' },
  { key: 'arrogant', labelRu: 'Высокомерие', labelEn: 'Arrogant' },
  { key: 'anxious', labelRu: 'Тревожность', labelEn: 'Anxious' },
  { key: 'greedy', labelRu: 'Жадность', labelEn: 'Greedy' },
  { key: 'stubborn', labelRu: 'Упрямство', labelEn: 'Stubborn' },
  { key: 'naive', labelRu: 'Наивность', labelEn: 'Naive' },
  { key: 'hotheaded', labelRu: 'Вспыльчивость', labelEn: 'Hot-headed' },
];

export type HeroSignatureSuggestion = {
  strength: GamePresetLabel;
  weakness: GamePresetLabel;
};

export const HERO_SIGNATURE_SUGGESTIONS: Record<string, HeroSignatureSuggestion> = {
  doctor: {
    strength: { key: 'medicine', labelRu: 'Медицина', labelEn: 'Medicine' },
    weakness: { key: 'impulsive', labelRu: 'Импульсивность', labelEn: 'Impulsive' },
  },
  engineer: {
    strength: { key: 'technical', labelRu: 'Техника', labelEn: 'Technical skill' },
    weakness: { key: 'clumsy', labelRu: 'Неловкость', labelEn: 'Clumsy' },
  },
  journalist: {
    strength: { key: 'persuasion', labelRu: 'Убеждение', labelEn: 'Persuasion' },
    weakness: { key: 'trusting', labelRu: 'Доверчивость', labelEn: 'Too trusting' },
  },
  guide: {
    strength: { key: 'navigation', labelRu: 'Навигация', labelEn: 'Navigation' },
    weakness: { key: 'slow', labelRu: 'Медлительность', labelEn: 'Slow' },
  },
  financier: {
    strength: { key: 'persuasion', labelRu: 'Убеждение', labelEn: 'Persuasion' },
    weakness: { key: 'arrogant', labelRu: 'Высокомерие', labelEn: 'Arrogant' },
  },
  soldier: {
    strength: { key: 'endurance', labelRu: 'Выносливость', labelEn: 'Endurance' },
    weakness: { key: 'impulsive', labelRu: 'Импульсивность', labelEn: 'Impulsive' },
  },
  scientist: {
    strength: { key: 'observation', labelRu: 'Наблюдательность', labelEn: 'Observation' },
    weakness: { key: 'anxious', labelRu: 'Тревожность', labelEn: 'Anxious' },
  },
  negotiator: {
    strength: { key: 'persuasion', labelRu: 'Убеждение', labelEn: 'Persuasion' },
    weakness: { key: 'trusting', labelRu: 'Доверчивость', labelEn: 'Too trusting' },
  },
};
