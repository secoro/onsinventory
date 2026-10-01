import { InventoryItem } from "../types";

export function isExpiring(item: InventoryItem): boolean {
  return Boolean(item.expiringSoon ?? item.expiringsoon);
}

// Countable units move one at a time; bulk units move in a chunk you'd actually
// eyeball (a splash, a handful, a quarter of the bag) instead of a single gram.
const UNIT_STEPS: Record<string, number> = {
  piece: 1, pieces: 1, stuk: 1, stuks: 1,
  clove: 1, cloves: 1, bulb: 1, bulbs: 1,
  bag: 1, bags: 1, zak: 1,
  bunch: 1, bunches: 1, bos: 1,
  tbsp: 1, tablespoon: 1, tablespoons: 1,
  tsp: 1, teaspoon: 1, teaspoons: 1,
  oz: 1, ounce: 1, ounces: 1,
  gram: 25, grams: 25, g: 25,
  ml: 50, milliliter: 50, milliliters: 50,
  kg: 0.25, kilogram: 0.25, kilograms: 0.25,
  liter: 0.25, liters: 0.25, litre: 0.25, litres: 0.25, l: 0.25,
  dl: 0.5, deciliter: 0.5, deciliters: 0.5,
  cup: 0.25, cups: 0.25,
  lb: 0.25, lbs: 0.25, pound: 0.25, pounds: 0.25
};

export function stepForUnit(unit: string): number {
  return UNIT_STEPS[unit.toLowerCase().trim()] ?? 1;
}

export function roundQuantity(quantity: number): number {
  return Math.round(quantity * 100) / 100;
}
