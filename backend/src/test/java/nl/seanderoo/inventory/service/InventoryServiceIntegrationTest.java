package nl.seanderoo.inventory.service;

import nl.seanderoo.inventory.dto.InventoryItemDTO;
import nl.seanderoo.inventory.dto.MakeableIngredientDTO;
import nl.seanderoo.inventory.dto.RecipeAvailabilityDTO;
import nl.seanderoo.inventory.dto.RecipeDTO;
import nl.seanderoo.inventory.dto.RecipeIngredientDTO;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.groups.Tuple.tuple;

@SpringBootTest
class InventoryServiceIntegrationTest {

    @Autowired
    private InventoryService inventoryService;

    @Autowired
    private RecipeService recipeService;

    @Test
    void checkAvailability_missingIngredientWithCookableSubRecipe_reportsMakeable() {
        addItem("Xyogurt", 500, "grams");
        addItem("Xcucumber", 2, "pieces");
        addRecipe("Xtzatziki", ingredient("xyogurt", 200, "grams"), ingredient("xcucumber", 1, "pieces"));
        RecipeDTO main = addRecipe("Xgyros", ingredient("xtzatziki", 1, "cup"));

        RecipeAvailabilityDTO availability = inventoryService.checkAvailability(main.getId(), 1);

        assertThat(availability.getMissingIngredients()).isEmpty();
        assertThat(availability.getMakeableIngredients())
                .extracting(MakeableIngredientDTO::getIngredientName, MakeableIngredientDTO::getRecipeName)
                .containsExactly(tuple("xtzatziki", "Xtzatziki"));
        assertThat(availability.isCanCook()).isTrue();
    }

    @Test
    void checkAvailability_subRecipeItselfNotCookable_reportsMissing() {
        addRecipe("Ytzatziki", ingredient("yyogurt", 200, "grams"));
        RecipeDTO main = addRecipe("Ygyros", ingredient("ytzatziki", 1, "cup"));

        RecipeAvailabilityDTO availability = inventoryService.checkAvailability(main.getId(), 1);

        assertThat(availability.getMakeableIngredients()).isEmpty();
        assertThat(availability.getMissingIngredients()).containsExactly("ytzatziki");
        assertThat(availability.isCanCook()).isFalse();
    }

    @Test
    void checkAvailability_selfReferencingRecipe_terminatesAndReportsMissing() {
        RecipeDTO main = addRecipe("Zsourdough", ingredient("zsourdough starter", 100, "grams"));
        addRecipe("Zsourdough starter", ingredient("zsourdough starter", 50, "grams"));

        RecipeAvailabilityDTO availability = inventoryService.checkAvailability(main.getId(), 1);

        assertThat(availability.getMakeableIngredients()).isEmpty();
        assertThat(availability.getMissingIngredients()).containsExactly("zsourdough starter");
        assertThat(availability.isCanCook()).isFalse();
    }

    private void addItem(String name, double quantity, String unit) {
        inventoryService.addItem(InventoryItemDTO.builder()
                .name(name)
                .category("other")
                .location("Pantry")
                .quantity(quantity)
                .unit(unit)
                .build());
    }

    private RecipeDTO addRecipe(String name, RecipeIngredientDTO... ingredients) {
        return recipeService.addRecipe(RecipeDTO.builder()
                .name(name)
                .servings(1)
                .ingredients(Set.of(ingredients))
                .build());
    }

    private static RecipeIngredientDTO ingredient(String name, double quantity, String unit) {
        return RecipeIngredientDTO.builder()
                .ingredientName(name)
                .quantity(quantity)
                .unit(unit)
                .optional(false)
                .build();
    }
}
