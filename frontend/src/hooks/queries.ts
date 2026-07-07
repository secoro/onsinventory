import { useQuery } from "@tanstack/react-query";
import { getInventory, getLocations, getRecipes, getRecommendations } from "../api/client";

export function useLocationsQuery(enabled = true) {
  return useQuery({ queryKey: ["locations"], queryFn: getLocations, enabled });
}

export function useInventoryQuery(enabled = true) {
  return useQuery({ queryKey: ["inventory"], queryFn: getInventory, enabled });
}

export function useRecipesQuery(enabled = true) {
  return useQuery({ queryKey: ["recipes"], queryFn: getRecipes, enabled });
}

export function useRecommendationsQuery(enabled = true) {
  return useQuery({ queryKey: ["recommendations"], queryFn: () => getRecommendations(50), enabled });
}
