package nl.seanderoo.inventory.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CookRequestDTO {
    @Builder.Default
    private int servings = 1;
    @Builder.Default
    private List<String> skippedIngredients = new ArrayList<>();
}
