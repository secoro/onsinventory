import { describe, expect, it } from "vitest";
import { InventoryItem } from "../types";
import { isExpiring, roundQuantity, stepForUnit } from "./inventory";

function item(overrides: Partial<InventoryItem>): InventoryItem {
  return {
    id: 1,
    name: "Milk",
    category: "dairy",
    location: "Fridge",
    quantity: 1,
    unit: "liter",
    expired: false,
    ...overrides
  };
}

describe("isExpiring", () => {
  it("uses the camelCase expiringSoon flag", () => {
    expect(isExpiring(item({ expiringSoon: true }))).toBe(true);
    expect(isExpiring(item({ expiringSoon: false }))).toBe(false);
  });

  it("falls back to the lowercase expiringsoon flag", () => {
    expect(isExpiring(item({ expiringsoon: true }))).toBe(true);
  });

  it("prefers expiringSoon over expiringsoon when both are present", () => {
    expect(isExpiring(item({ expiringSoon: false, expiringsoon: true }))).toBe(false);
  });

  it("returns false when neither flag is present", () => {
    expect(isExpiring(item({}))).toBe(false);
  });
});

describe("stepForUnit", () => {
  it("steps countable units by one", () => {
    expect(stepForUnit("pieces")).toBe(1);
    expect(stepForUnit("cloves")).toBe(1);
  });

  it("steps bulk weight/volume units by a usable chunk", () => {
    expect(stepForUnit("grams")).toBe(25);
    expect(stepForUnit("ml")).toBe(50);
    expect(stepForUnit("kg")).toBe(0.25);
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(stepForUnit(" Grams ")).toBe(25);
  });

  it("falls back to one for unknown units", () => {
    expect(stepForUnit("sprinkle")).toBe(1);
  });
});

describe("roundQuantity", () => {
  it("rounds away floating point drift to two decimals", () => {
    expect(roundQuantity(0.1 + 0.2)).toBe(0.3);
    expect(roundQuantity(1000 - 25)).toBe(975);
  });
});
