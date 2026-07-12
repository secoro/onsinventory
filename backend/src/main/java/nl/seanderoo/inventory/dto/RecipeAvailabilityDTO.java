package nl.seanderoo.inventory.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecipeAvailabilityDTO {
    private boolean canCook;
    private List<String> insufficientIngredients;
    private List<String> missingIngredients;
    private List<MakeableIngredientDTO> makeableIngredients;
}
