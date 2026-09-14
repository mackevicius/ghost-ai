export const CURSOR_COLORS = [
  '#52A8FF',
  '#BF7AF0',
  '#FF990A',
  '#FF6166',
  '#F75F8F',
  '#62C073',
  '#0AC7B4',
  '#EDEDED',
] as const;

export function getCursorColor(userId: string): string {
  let hash = 0;
  for (const character of userId) {
    hash = (Math.imul(hash, 31) + character.charCodeAt(0)) >>> 0;
  }
  return CURSOR_COLORS[hash % CURSOR_COLORS.length];
}