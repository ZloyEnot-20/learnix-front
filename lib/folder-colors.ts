/**
 * Preset colours a topic folder can carry. The chosen colour id is stored on the
 * topic and used to tint its CEFR level folder on the Exercises levels page.
 *
 * `cls` strings are written out literally here so Tailwind's JIT generates them.
 */
export interface FolderColor {
  id: string
  label: string
  /** Solid swatch used in the picker. */
  dot: string
  /** Badge / folder classes (background + text + ring). */
  cls: string
}

export const FOLDER_COLORS: FolderColor[] = [
  { id: "emerald", label: "Green", dot: "bg-emerald-500", cls: "bg-emerald-100 text-emerald-700 ring-emerald-200/70" },
  { id: "lime", label: "Lime", dot: "bg-lime-500", cls: "bg-lime-100 text-lime-800 ring-lime-200/70" },
  { id: "sky", label: "Sky", dot: "bg-sky-500", cls: "bg-sky-100 text-sky-700 ring-sky-200/70" },
  { id: "amber", label: "Amber", dot: "bg-amber-500", cls: "bg-amber-100 text-amber-800 ring-amber-200/70" },
  { id: "rose", label: "Rose", dot: "bg-rose-500", cls: "bg-rose-100 text-rose-700 ring-rose-200/70" },
  { id: "purple", label: "Purple", dot: "bg-purple-500", cls: "bg-purple-100 text-purple-700 ring-purple-200/70" },
  { id: "violet", label: "Violet", dot: "bg-violet-500", cls: "bg-violet-100 text-violet-700 ring-violet-200/70" },
  { id: "teal", label: "Teal", dot: "bg-teal-500", cls: "bg-teal-100 text-teal-700 ring-teal-200/70" },
  { id: "slate", label: "Grey", dot: "bg-slate-400", cls: "bg-slate-100 text-slate-700 ring-slate-200/70" },
]

/** Map a stored colour id to its Tailwind classes (undefined when unset/unknown). */
export function folderColorClass(id?: string | null): string | undefined {
  if (!id) return undefined
  return FOLDER_COLORS.find((c) => c.id === id)?.cls
}
