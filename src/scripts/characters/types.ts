export interface CharacterVariant {
  id: string;
  char: string;
  name: string;
  koName: string;
  keywords: string[];
  category: string;
  categoryLabel: string;
  subgroup: string;
  emojiVersion?: string;
}

export interface CharacterEntry extends CharacterVariant {
  variants: CharacterVariant[];
}

export interface Category {
  id: string;
  label: string;
}
