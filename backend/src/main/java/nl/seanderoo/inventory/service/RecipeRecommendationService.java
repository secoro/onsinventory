package nl.seanderoo.inventory.service;

import nl.seanderoo.inventory.dto.RecipeRecommendationDTO;
import nl.seanderoo.inventory.model.InventoryItem;
import nl.seanderoo.inventory.model.Recipe;
import nl.seanderoo.inventory.model.RecipeIngredient;
import nl.seanderoo.inventory.repository.InventoryItemRepository;
import nl.seanderoo.inventory.repository.RecipeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.OptionalDouble;

@Service
@Transactional(readOnly = true)
public class RecipeRecommendationService {

    private final RecipeRepository recipeRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final RecipeService recipeService;
    private final CurrentHouseholdProvider currentHouseholdProvider;

    public RecipeRecommendationService(RecipeRepository recipeRepository,
                                      InventoryItemRepository inventoryItemRepository,
                                      RecipeService recipeService,
                                      CurrentHouseholdProvider currentHouseholdProvider) {
        this.recipeRepository = recipeRepository;
        this.inventoryItemRepository = inventoryItemRepository;
        this.recipeService = recipeService;
        this.currentHouseholdProvider = currentHouseholdProvider;
    }

    public List<RecipeRecommendationDTO> getRecommendations(int limit) {
        Long householdId = currentHouseholdProvider.getHouseholdId();
        List<InventoryItem> inventory = inventoryItemRepository.findByHouseholdId(householdId);

        return recipeRepository.findAllByHouseholdId(householdId).stream()
                .map(recipe -> calculateMatchScore(recipe, inventory))
                .filter(rec -> rec.getMatchPercentage() > 0)
                .sorted(Comparator.comparing(RecipeRecommendationDTO::getMatchPercentage).reversed()
                        .thenComparing(rec -> rec.getExpiringIngredientsUsed().size(), Comparator.reverseOrder()))
                .limit(limit)
                .toList();
    }

    private RecipeRecommendationDTO calculateMatchScore(Recipe recipe, List<InventoryItem> inventory) {
        List<RecipeIngredient> requiredIngredients = recipe.getIngredients().stream()
                .filter(ing -> !ing.isOptional())
                .toList();

        List<String> missingIngredients = new ArrayList<>();
        List<String> insufficientIngredients = new ArrayList<>();
        List<String> expiringIngredientsUsed = new ArrayList<>();
        int matchedCount = 0;

        for (RecipeIngredient ingredient : requiredIngredients) {
            InventoryItem matchedItem = findMatch(ingredient, inventory);
            if (matchedItem == null) {
                missingIngredients.add(ingredient.getIngredientName());
                continue;
            }

            matchedCount++;
            if (!"herbs".equalsIgnoreCase(matchedItem.getCategory()) && !hasEnoughQuantity(ingredient, matchedItem)) {
                insufficientIngredients.add(ingredient.getIngredientName());
            }
            if (matchedItem.isExpiringSoon()) {
                expiringIngredientsUsed.add(ingredient.getIngredientName());
            }
        }

        int matchPercentage = requiredIngredients.isEmpty() ? 0 :
                (int) Math.round((double) matchedCount / requiredIngredients.size() * 100);

        return RecipeRecommendationDTO.builder()
                .recipe(recipeService.toDTO(recipe))
                .matchPercentage(matchPercentage)
                .matchedIngredients(matchedCount)
                .totalIngredients(requiredIngredients.size())
                .missingIngredients(missingIngredients)
                .insufficientIngredients(insufficientIngredients)
                .expiringIngredientsUsed(expiringIngredientsUsed)
                .build();
    }

    private static InventoryItem findMatch(RecipeIngredient ingredient, List<InventoryItem> inventory) {
        String ingredientName = ingredient.getIngredientName().toLowerCase();
        return inventory.stream()
                .filter(item -> {
                    String itemName = item.getName().toLowerCase();
                    return itemName.contains(ingredientName) || ingredientName.contains(itemName);
                })
                .findFirst()
                .orElse(null);
    }

    private static boolean hasEnoughQuantity(RecipeIngredient ingredient, InventoryItem item) {
        OptionalDouble needed = InventoryService.convertUnit(ingredient.getQuantity(), ingredient.getUnit(), item.getUnit());
        // Incompatible units - assume it's enough rather than blocking the recommendation
        return needed.isEmpty() || item.getQuantity() >= needed.getAsDouble();
    }
}
