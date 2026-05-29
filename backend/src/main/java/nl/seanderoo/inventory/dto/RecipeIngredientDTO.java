package nl.seanderoo.inventory.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecipeIngredientDTO {
    private Long id;
    private String ingredientName;
    private Double quantity;
    private String unit;
    private boolean optional;
    private String notes;
}
