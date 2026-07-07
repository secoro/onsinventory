import { describe, expect, it } from "vitest";
import { InventoryItem } from "../types";
import { isExpiring } from "./inventory";

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
