/** Une clases condicionales sin agregar una dependencia (clsx) para algo de una línea. */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
