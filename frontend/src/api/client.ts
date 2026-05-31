import {
  CookResult,
  InventoryItem,
  Location,
  Recipe,
  RecipeIngredient,
  RecipeRecommendation
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json"
    },
    ...init
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function getLocations() {
  return request<Location[]>("/api/locations");
}

export function getInventory() {
  return request<InventoryItem[]>("/api/inventory");
}

export function getRecipes() {
  return request<Recipe[]>("/api/recipes");
}

export function getRecommendations(limit = 8) {
  return request<RecipeRecommendation[]>(`/api/recommendations?limit=${limit}`);
}

export function addInventoryItem(payload: {
  name: string;
  category: string;
  location: string;
  quantity: number;
  unit: string;
  expiryDate?: string;
  notes?: string;
}) {
  return request<InventoryItem>("/api/inventory", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateInventoryItem(
  id: number,
  payload: {
    name?: string;
    category?: string;
    location?: string;
    quantity?: number;
    unit?: string;
    expiryDate?: string;
    notes?: string;
  }
) {
  return request<InventoryItem>(`/api/inventory/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function deleteInventoryItem(id: number) {
  return request<void>(`/api/inventory/${id}`, {
    method: "DELETE"
  });
}

export function addRecipe(payload: {
  name: string;
  description?: string;
  instructions?: string;
  servings?: number;
  preparationTimeMinutes?: number;
  cookingTimeMinutes?: number;
  difficulty?: string;
  cuisine?: string;
  ingredients: RecipeIngredient[];
}) {
  return request<Recipe>("/api/recipes", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function deleteRecipe(id: number) {
  return request<void>(`/api/recipes/${id}`, {
    method: "DELETE"
  });
}

export function cookRecipe(id: number) {
  return request<CookResult>(`/api/recipes/${id}/cook`, {
    method: "POST"
  });
}
