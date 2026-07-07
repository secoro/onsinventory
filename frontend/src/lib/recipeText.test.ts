import { describe, expect, it } from "vitest";
import { parseIngredientLine, parseInstructionSteps } from "./recipeText";

describe("parseIngredientLine", () => {
  it("parses quantity, unit and name", () => {
    expect(parseIngredientLine("200 grams flour")).toEqual({
      ingredientName: "flour",
      quantity: 200,
      unit: "grams",
      optional: false
    });
  });

  it("skips 'of' between unit and name", () => {
    expect(parseIngredientLine("2 cups of milk")).toEqual({
      ingredientName: "milk",
      quantity: 2,
      unit: "cups",
      optional: false
    });
  });

  it("skips Dutch 'van' and parses comma decimals", () => {
    expect(parseIngredientLine("1,5 liter van water")).toEqual({
      ingredientName: "water",
      quantity: 1.5,
      unit: "liter",
      optional: false
    });
  });

  it("lowercases the unit", () => {
    expect(parseIngredientLine("3 TBSP sugar").unit).toBe("tbsp");
  });

  it("falls back to one piece for a bare ingredient name", () => {
    expect(parseIngredientLine("  salt ")).toEqual({
      ingredientName: "salt",
      quantity: 1,
      unit: "pieces",
      optional: false
    });
  });
});

describe("parseInstructionSteps", () => {
  it("splits numbered steps", () => {
    expect(parseInstructionSteps("1. Chop onions 2. Fry them 3. Serve")).toEqual([
      "Chop onions",
      "Fry them",
      "Serve"
    ]);
  });

  it("splits sentences when there is no numbering", () => {
    expect(parseInstructionSteps("Boil water. Add pasta. Drain and serve.")).toEqual([
      "Boil water",
      "Add pasta",
      "Drain and serve"
    ]);
  });

  it("keeps a single instruction as one step", () => {
    expect(parseInstructionSteps("Mix everything")).toEqual(["Mix everything"]);
  });

  it("returns a placeholder for missing instructions", () => {
    expect(parseInstructionSteps(undefined)).toEqual(["No instructions provided."]);
    expect(parseInstructionSteps("   ")).toEqual(["No instructions provided."]);
  });
});
