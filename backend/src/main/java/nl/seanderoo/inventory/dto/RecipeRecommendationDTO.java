package nl.seanderoo.inventory.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecipeRecommendationDTO {
    private RecipeDTO recipe;
    private Integer matchPercentage; // 0-100
    private Integer matchedIngredients;
    private Integer totalIngredients;
    private List<String> missingIngredients;
    private List<String> insufficientIngredients;
    private List<String> expiringIngredientsUsed; // Ingredients that are expiring soon
}
