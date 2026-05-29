import { RecipeRecommendation } from "../types";

export function recommendationLabel(matchPercentage: number): string {
  if (matchPercentage >= 90) {
    return "Cook now";
  }
  if (matchPercentage >= 60) {
    return "Almost there";
  }
  return "Need groceries";
}

export function topRecommendation(
  recommendations: RecipeRecommendation[]
): RecipeRecommendation | undefined {
  return recommendations
    .slice()
    .sort((a, b) => b.matchPercentage - a.matchPercentage)[0];
}
