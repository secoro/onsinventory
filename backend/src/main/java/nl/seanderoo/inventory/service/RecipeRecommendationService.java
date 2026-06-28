package nl.seanderoo.inventory.service;

import nl.seanderoo.inventory.dto.RecipeDTO;
import nl.seanderoo.inventory.dto.RecipeRecommendationDTO;
import nl.seanderoo.inventory.exception.ResourceNotFoundException;
import nl.seanderoo.inventory.model.InventoryItem;
import nl.seanderoo.inventory.model.Recipe;
import nl.seanderoo.inventory.model.RecipeIngredient;
import nl.seanderoo.inventory.repository.InventoryItemRepository;
import nl.seanderoo.inventory.repository.RecipeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.OptionalDouble;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class RecipeRecommendationService {

    private final RecipeRepository recipeRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final RecipeService recipeService;

    public RecipeRecommendationService(RecipeRepository recipeRepository,
                                      InventoryItemRepository inventoryItemRepository,
                                      RecipeService recipeService) {
        this.recipeRepository = recipeRepository;
        this.inventoryItemRepository = inventoryItemRepository;
        this.recipeService = recipeService;
    }

    public List<RecipeRecommendationDTO> getRecommendations(Integer limit) {
        List<InventoryItem> inventory = inventoryItemRepository.findAll();
        List<Recipe> recipes = recipeRepository.findAll();

        return recipes.stream()
                .map(recipe -> calculateMatchScore(recipe, inventory))
                .filter(rec -> rec.getMatchPercentage() > 0) // Only return recipes with at least some match
                .sorted((a, b) -> {
                    // Sort by match percentage (descending), then by expiring ingredients count (descending)
                    int matchCompare = b.getMatchPercentage().compareTo(a.getMatchPercentage());
                    if (matchCompare != 0) return matchCompare;
                    return b.getExpiringIngredientsUsed().size() - a.getExpiringIngredientsUsed().size();
                })
                .limit(limit != null ? limit : 10)
                .collect(Collectors.toList());
    }

    public List<RecipeRecommendationDTO> getRecommendationsByCategory(String category, Integer limit) {
        List<InventoryItem> inventory = inventoryItemRepository.findAll();
        List<Recipe> recipes = recipeRepository.findByCuisine(category);

        return recipes.stream()
                .map(recipe -> calculateMatchScore(recipe, inventory))
                .filter(rec -> rec.getMatchPercentage() > 0)
                .sorted((a, b) -> b.getMatchPercentage().compareTo(a.getMatchPercentage()))
                .limit(limit != null ? limit : 10)
                .collect(Collectors.toList());
    }

    public RecipeRecommendationDTO getRecommendationForRecipe(Long recipeId) {
        Recipe recipe = recipeRepository.findById(recipeId)
                .orElseThrow(() -> new ResourceNotFoundException("Recipe not found: " + recipeId));
        List<InventoryItem> inventory = inventoryItemRepository.findAll();
        return calculateMatchScore(recipe, inventory);
    }

    private RecipeRecommendationDTO calculateMatchScore(Recipe recipe, List<InventoryItem> inventory) {
        Set<RecipeIngredient> requiredIngredients = recipe.getIngredients().stream()
                .filter(ing -> !ing.isOptional())
                .collect(Collectors.toSet());

        List<String> missingIngredients = new ArrayList<>();
        List<String> insufficientIngredients = new ArrayList<>();
        List<String> matchedIngredientsUsed = new ArrayList<>();
        List<String> expiringIngredientsUsed = new ArrayList<>();

        int matchedCount = 0;

        for (RecipeIngredient ingredient : requiredIngredients) {
            String ingredientNameLower = ingredient.getIngredientName().toLowerCase();
            InventoryItem matchedItem = null;

            for (InventoryItem item : inventory) {
                String itemNameLower = item.getName().toLowerCase();
                if (itemNameLower.equals(ingredientNameLower) ||
                    itemNameLower.contains(ingredientNameLower) ||
                    ingredientNameLower.contains(itemNameLower)) {
                    matchedItem = item;
                    break;
                }
            }

            if (matchedItem == null) {
                missingIngredients.add(ingredient.getIngredientName());
                continue;
            }

            if ("herbs".equalsIgnoreCase(matchedItem.getCategory())) {
                matchedCount++;
                matchedIngredientsUsed.add(ingredient.getIngredientName());
            } else if (!hasEnoughQuantity(ingredient, matchedItem)) {
                insufficientIngredients.add(ingredient.getIngredientName());
                matchedCount++;
                matchedIngredientsUsed.add(ingredient.getIngredientName());
            } else {
                matchedCount++;
                matchedIngredientsUsed.add(ingredient.getIngredientName());
            }

            if (matchedItem.isExpiredOrExpiringSoon()) {
                expiringIngredientsUsed.add(ingredient.getIngredientName());
            }
        }

        int matchPercentage = requiredIngredients.isEmpty() ? 0 :
                (int) Math.round((double) matchedCount / requiredIngredients.size() * 100);

        return RecipeRecommendationDTO.builder()
                .recipe(recipeService.getRecipe(recipe.getId()))
                .matchPercentage(matchPercentage)
                .matchedIngredients(matchedCount)
                .totalIngredients(requiredIngredients.size())
                .missingIngredients(missingIngredients)
                .insufficientIngredients(insufficientIngredients)
                .expiringIngredientsUsed(expiringIngredientsUsed)
                .build();
    }

    private boolean hasEnoughQuantity(RecipeIngredient ingredient, InventoryItem item) {
        double needed = ingredient.getQuantity();
        String neededUnit = InventoryService.normalizeUnit(ingredient.getUnit());
        String haveUnit = InventoryService.normalizeUnit(item.getUnit());

        if (neededUnit.equals(haveUnit)) {
            return item.getQuantity() >= needed;
        }

        OptionalDouble converted = InventoryService.convertUnit(needed, ingredient.getUnit(), item.getUnit());
        if (converted.isPresent()) {
            return item.getQuantity() >= converted.getAsDouble();
        }

        return true;
    }

    public List<RecipeRecommendationDTO> getRecipesUsingExpiringItems(Integer limit) {
        LocalDate soon = LocalDate.now().plusDays(3);
        List<InventoryItem> expiringItems = inventoryItemRepository.findExpiringSoonItems(LocalDate.now(), soon);

        if (expiringItems.isEmpty()) {
            return Collections.emptyList();
        }

        Set<String> expiringItemNames = expiringItems.stream()
                .map(item -> item.getName().toLowerCase())
                .collect(Collectors.toSet());

        List<Recipe> recipes = recipeRepository.findAll();

        return recipes.stream()
                .map(recipe -> calculateMatchScoreForExpiringItems(recipe, expiringItemNames))
                .filter(rec -> rec.getMatchPercentage() > 0)
                .sorted((a, b) -> b.getMatchPercentage().compareTo(a.getMatchPercentage()))
                .limit(limit != null ? limit : 5)
                .collect(Collectors.toList());
    }

    private RecipeRecommendationDTO calculateMatchScoreForExpiringItems(Recipe recipe, Set<String> expiringItemNames) {
        Set<RecipeIngredient> requiredIngredients = recipe.getIngredients().stream()
                .filter(ing -> !ing.isOptional())
                .collect(Collectors.toSet());

        List<String> expiringIngredientsUsed = new ArrayList<>();
        int matchedCount = 0;

        for (RecipeIngredient ingredient : requiredIngredients) {
            String ingredientNameLower = ingredient.getIngredientName().toLowerCase();

            for (String expiringItem : expiringItemNames) {
                if (expiringItem.equals(ingredientNameLower) ||
                    expiringItem.contains(ingredientNameLower) ||
                    ingredientNameLower.contains(expiringItem)) {
                    expiringIngredientsUsed.add(ingredient.getIngredientName());
                    matchedCount++;
                    break;
                }
            }
        }

        int matchPercentage = requiredIngredients.isEmpty() ? 0 :
                (int) Math.round((double) matchedCount / requiredIngredients.size() * 100);

        return RecipeRecommendationDTO.builder()
                .recipe(recipeService.getRecipe(recipe.getId()))
                .matchPercentage(matchPercentage)
                .matchedIngredients(matchedCount)
                .totalIngredients(requiredIngredients.size())
                .missingIngredients(new ArrayList<>())
                .insufficientIngredients(new ArrayList<>())
                .expiringIngredientsUsed(expiringIngredientsUsed)
                .build();
    }
}
