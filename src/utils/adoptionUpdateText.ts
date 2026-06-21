/** User-written caption only — strips embedded media lines (e.g. "📸 3 photos"). */
export function getAdoptionUpdateCaption(text?: string): string | undefined {
  const lines = (text ?? '').split('\n').map(l => l.trim()).filter(Boolean);
  const caption = lines.filter(l => !l.startsWith('📸')).join('\n');
  return caption || undefined;
}
