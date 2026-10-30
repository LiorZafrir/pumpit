export const THEMES = ['lime', 'blue', 'pink', 'orange', 'red', 'yellow', 'purple'];

export function applyTheme(name) {
  const theme = THEMES.includes(name) ? name : 'lime';
  document.documentElement.dataset.theme = theme;
  return theme;
}
