import type { TranslationKey } from "../i18n";
import { RecipeRecommendation } from "../types";

export function recommendationLabelKey(matchPercentage: number): TranslationKey {
  if (matchPercentage >= 90) {
    return "recommendations.cookNow";
  }
  if (matchPercentage >= 60) {
    return "recommendations.almostThere";
  }
  return "recommendations.needGroceries";
}

export function topRecommendation(
  recommendations: RecipeRecommendation[]
): RecipeRecommendation | undefined {
  return recommendations
    .slice()
    .sort((a, b) => b.matchPercentage - a.matchPercentage)[0];
}
