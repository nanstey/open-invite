
// --- Category Themes ---
export const CATEGORY_THEMES: Record<string, { bg: string, border: string, text: string, hex: string, bgSoft: string }> = {
  Social: { bg: 'bg-pink-500', border: 'border-pink-500', text: 'text-pink-500', hex: '#ec4899', bgSoft: 'bg-pink-500/20' },
  Sport: { bg: 'bg-orange-500', border: 'border-orange-500', text: 'text-orange-500', hex: '#f97316', bgSoft: 'bg-orange-500/20' },
  Food: { bg: 'bg-emerald-500', border: 'border-emerald-500', text: 'text-emerald-500', hex: '#10b981', bgSoft: 'bg-emerald-500/20' },
  Work: { bg: 'bg-blue-500', border: 'border-blue-500', text: 'text-blue-500', hex: '#3b82f6', bgSoft: 'bg-blue-500/20' },
  Errand: { bg: 'bg-amber-500', border: 'border-amber-500', text: 'text-amber-500', hex: '#f59e0b', bgSoft: 'bg-amber-500/20' },
  Travel: { bg: 'bg-violet-500', border: 'border-violet-500', text: 'text-violet-500', hex: '#8b5cf6', bgSoft: 'bg-violet-500/20' },
  Entertainment: { bg: 'bg-rose-500', border: 'border-rose-500', text: 'text-rose-500', hex: '#f43f5e', bgSoft: 'bg-rose-500/20' },
};

export const getTheme = (type: string) => CATEGORY_THEMES[type] || { bg: 'bg-slate-500', border: 'border-slate-500', text: 'text-slate-500', hex: '#64748b', bgSoft: 'bg-slate-500/20' };
