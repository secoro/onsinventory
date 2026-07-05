import {
  CookResult,
  InventoryItem,
  Location,
  Recipe,
  RecipeAvailability,
  RecipeIngredient,
  RecipeRecommendation
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

const TOKEN_KEY = "auth_token";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...init
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text;
    try {
      const parsed = JSON.parse(text);
      if (parsed?.message) message = parsed.message;
    } catch {
      // response wasn't JSON - fall back to raw text
    }
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

export function updateRecipe(id: number, payload: {
  name?: string;
  cuisine?: string;
  difficulty?: string;
  instructions?: string;
  ingredients?: RecipeIngredient[];
}) {
  return request<Recipe>(`/api/recipes/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function deleteRecipe(id: number) {
  return request<void>(`/api/recipes/${id}`, {
    method: "DELETE"
  });
}

export function checkRecipeAvailability(id: number, servings: number) {
  return request<RecipeAvailability>(`/api/recipes/${id}/availability?servings=${servings}`);
}

export function cookRecipe(id: number, servings: number, skippedIngredients: string[] = []) {
  return request<CookResult>(`/api/recipes/${id}/cook`, {
    method: "POST",
    body: JSON.stringify({ servings, skippedIngredients })
  });
}

type AuthResponse = {
  token: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  householdName: string;
};

export function login(username: string, password: string) {
  return request<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
}

export function register(payload: {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  inviteToken?: string;
}) {
  return request<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function forgotPassword(email: string) {
  return request<void>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email })
  });
}

export function resetPassword(token: string, newPassword: string) {
  return request<void>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, newPassword })
  });
}

export function getAuthConfig() {
  return request<{ securityEnabled: boolean }>("/api/auth/config");
}

export function getMe() {
  return request<AuthResponse>("/api/auth/me");
}

export function changePassword(currentPassword: string, newPassword: string) {
  return request<void>("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword })
  });
}

export function getHousehold() {
  return request<{ name: string; members: { username: string; firstName: string; lastName: string }[] }>(
    "/api/household"
  );
}

export function inviteToHousehold(email: string) {
  return request<void>("/api/household/invite", {
    method: "POST",
    body: JSON.stringify({ email })
  });
}

export function getInvitePreview(token: string) {
  return request<{ householdName: string; email: string }>(`/api/household/invite/${token}`);
}
