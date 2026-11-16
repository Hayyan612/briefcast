/**
 * Parallax layer style for the hero scene (see Scene): travel in px across the whole scene,
 * driven by the --px/--py variables Scene sets. A plain helper, usable on the server.
 */
export function depth(x: number, y: number) {
  return {
    transform: `translate3d(calc(var(--px, 0) * ${x}px), calc(var(--py, 0) * ${y}px), 0)`,
    transition: "transform 600ms cubic-bezier(0.22, 1, 0.36, 1)",
  } as const;
}
