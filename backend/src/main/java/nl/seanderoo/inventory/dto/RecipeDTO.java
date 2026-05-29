package nl.seanderoo.inventory.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashSet;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecipeDTO {
    private Long id;
    private String name;
    private String description;
    private String instructions;
    private Integer servings;
    private Integer preparationTimeMinutes;
    private Integer cookingTimeMinutes;
    private String difficulty;
    private String cuisine;
    @Builder.Default
    private Set<RecipeIngredientDTO> ingredients = new HashSet<>();
}
