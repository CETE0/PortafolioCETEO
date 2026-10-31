// Two-ink print palettes: the website's charcoal/red, with a less-yellow paper
// than the original navy/cream reference. No gradients or extra render passes.
export const sculpturePalettes = [
  {
    id: "carbon",
    name: "Carbon",
    description: "Warm paper on the site's charcoal",
    dark: "#141414",
    light: "#f5f3ec",
    sourceBackground: "#000000",
    highlightCeiling: 1,
    background: "#141414",
    foreground: "#f5f3ec",
  },
  {
    id: "paper",
    name: "Paper",
    description: "Charcoal ink on warm paper",
    dark: "#141414",
    light: "#f5f3ec",
    sourceBackground: "#ffffff",
    highlightCeiling: 0.92,
    background: "#f5f3ec",
    foreground: "#141414",
  },
  {
    id: "red",
    name: "Red print",
    description: "The site's red-600 as a second print direction",
    dark: "#e7000b",
    light: "#f5f3ec",
    sourceBackground: "#ffffff",
    highlightCeiling: 0.92,
    background: "#f5f3ec",
    foreground: "#141414",
  },
] as const;

export type SculpturePalette = (typeof sculpturePalettes)[number]["id"];
export const defaultPalette = "carbon" satisfies SculpturePalette;
export const defaultGrain = 2;

export function getPalette(id: SculpturePalette) {
  return (
    sculpturePalettes.find((palette) => palette.id === id) ??
    sculpturePalettes[0]
  );
}

export function normalizeGrain(value: number) {
  return Number.isFinite(value)
    ? Math.max(1, Math.min(3, Math.round(value)))
    : defaultGrain;
}

export function getStageColors(
  id: SculpturePalette,
  mode: string,
  godotReference = false,
) {
  if (godotReference) return { background: "#121738", foreground: "#f5e8c7" };
  const palette = getPalette(id);
  return {
    background:
      mode === "solid" ? palette.sourceBackground : palette.background,
    foreground: palette.foreground,
  };
}
