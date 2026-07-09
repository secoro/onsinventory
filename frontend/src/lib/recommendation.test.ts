import { describe, expect, it } from "vitest";
import { recommendationLabelKey, topRecommendation } from "./recommendation";

describe("recommendation helpers", () => {
  it("returns useful label keys by match percentage", () => {
    expect(recommendationLabelKey(95)).toBe("recommendations.cookNow");
    expect(recommendationLabelKey(70)).toBe("recommendations.almostThere");
    expect(recommendationLabelKey(20)).toBe("recommendations.needGroceries");
  });

  it("returns top recommendation by percentage", () => {
    const top = topRecommendation([
      {
        recipe: { id: 1, name: "Soup", ingredients: [] },
        matchPercentage: 40,
        matchedIngredients: 2,
        totalIngredients: 5,
        missingIngredients: ["salt"],
        insufficientIngredients: [],
        expiringIngredientsUsed: []
      },
      {
        recipe: { id: 2, name: "Pasta", ingredients: [] },
        matchPercentage: 90,
        matchedIngredients: 3,
        totalIngredients: 3,
        missingIngredients: [],
        insufficientIngredients: [],
        expiringIngredientsUsed: ["Tomato"]
      }
    ]);

    expect(top?.recipe.name).toBe("Pasta");
  });
});
