export type Location = {
  id: number;
  name: string;
  description?: string;
  icon?: string;
};

export type InventoryItem = {
  id: number;
  name: string;
  category: string;
  location: string;
  quantity: number;
  unit: string;
  expiryDate?: string;
  addedDate?: string;
  expired: boolean;
  expiringsoon?: boolean;
  expiringSoon?: boolean;
  notes?: string;
};

export type RecipeIngredient = {
  id?: number;
  ingredientName: string;
  quantity: number;
  unit: string;
  optional: boolean;
  notes?: string;
};

export type Recipe = {
  id: number;
  name: string;
  description?: string;
  instructions?: string;
  servings?: number;
  preparationTimeMinutes?: number;
  cookingTimeMinutes?: number;
  difficulty?: string;
  cuisine?: string;
  ingredients: RecipeIngredient[];
};

export type CookResult = {
  consumed: string[];
  unmatched: string[];
};

export type RecipeRecommendation = {
  recipe: Recipe;
  matchPercentage: number;
  matchedIngredients: number;
  totalIngredients: number;
  missingIngredients: string[];
  expiringIngredientsUsed: string[];
};
