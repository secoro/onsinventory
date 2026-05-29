import { describe, expect, it } from "vitest";
import { recommendationLabel, topRecommendation } from "./recommendation";

describe("recommendation helpers", () => {
  it("returns useful labels by match percentage", () => {
    expect(recommendationLabel(95)).toBe("Cook now");
    expect(recommendationLabel(70)).toBe("Almost there");
    expect(recommendationLabel(20)).toBe("Need groceries");
  });

  it("returns top recommendation by percentage", () => {
    const top = topRecommendation([
      {
        recipe: { id: 1, name: "Soup", ingredients: [] },
        matchPercentage: 40,
        matchedIngredients: 2,
        totalIngredients: 5,
        missingIngredients: ["salt"],
        expiringIngredientsUsed: []
      },
      {
        recipe: { id: 2, name: "Pasta", ingredients: [] },
        matchPercentage: 90,
        matchedIngredients: 3,
        totalIngredients: 3,
        missingIngredients: [],
        expiringIngredientsUsed: ["Tomato"]
      }
    ]);

    expect(top?.recipe.name).toBe("Pasta");
  });
});
