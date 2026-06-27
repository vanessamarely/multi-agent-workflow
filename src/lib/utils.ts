/**
 * utils.ts — Utilidades generales del frontend.
 */
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * cn — Combina clases CSS condicionales y resuelve conflictos de Tailwind.
 *
 * Usa `clsx` para procesar expresiones condicionales (arrays, objetos, strings)
 * y `tailwind-merge` para que clases de Tailwind conflictivas se resuelvan
 * correctamente (ej. `p-2` + `p-4` → `p-4` en lugar de ambas).
 *
 * @example
 *   cn('p-4', isActive && 'bg-blue-500', 'text-sm')
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
