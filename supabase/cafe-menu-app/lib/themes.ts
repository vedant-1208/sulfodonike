export type MenuTheme = {
  id: string
  name: string
  blurb: string
}

export const MENU_THEMES: MenuTheme[] = [
  { id: 'chalkboard', name: 'Chalkboard', blurb: 'Bistro board, script headings' },
  { id: 'diner', name: 'Soda Counter', blurb: 'White, cherry red, checker strip' },
  { id: 'espresso', name: 'Coffee House', blurb: 'Warm brown, italic serif' },
  { id: 'garden', name: 'Fresh & Light', blurb: 'Bright, big photos, price pills' },
  { id: 'midnight', name: 'Late Night', blurb: 'Dark navy, champagne gold' },
]

export const DEFAULT_THEME = 'chalkboard'

export function resolveTheme(id: string | null | undefined) {
  return MENU_THEMES.some((t) => t.id === id) ? (id as string) : DEFAULT_THEME
}
