import {
  InventoryItem,
  Location,
  Recipe,
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
