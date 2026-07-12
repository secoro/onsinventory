package nl.seanderoo.inventory.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** An ingredient that is not in stock but can be made with another recipe of the household. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MakeableIngredientDTO {
    private String ingredientName;
    private Long recipeId;
    private String recipeName;
}
