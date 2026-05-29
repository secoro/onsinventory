package nl.seanderoo.inventory.service;

import nl.seanderoo.inventory.dto.RecipeDTO;
import nl.seanderoo.inventory.dto.RecipeIngredientDTO;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class RecipeServiceIntegrationTest {

    @Autowired
    private RecipeService recipeService;

    @Test
    void addRecipe_withIngredients_persistsAndReturnsIngredients() {
        RecipeDTO request = RecipeDTO.builder()
                .name("Test Soup")
                .description("Simple soup")
                .instructions("Mix and cook")
                .servings(2)
                .preparationTimeMinutes(5)
                .cookingTimeMinutes(20)
                .difficulty("easy")
                .cuisine("Dutch")
                .ingredients(Set.of(
                        RecipeIngredientDTO.builder()
                                .ingredientName("Water")
                                .quantity(500.0)
                                .unit("ml")
                                .optional(false)
                                .build(),
                        RecipeIngredientDTO.builder()
                                .ingredientName("Salt")
                                .quantity(1.0)
                                .unit("tsp")
                                .optional(true)
                                .build()))
                .build();

        RecipeDTO created = recipeService.addRecipe(request);

        assertThat(created.getId()).isNotNull();
        assertThat(created.getIngredients()).hasSize(2);
        assertThat(created.getIngredients())
                .extracting(RecipeIngredientDTO::getIngredientName)
                .containsExactlyInAnyOrder("Water", "Salt");
    }

    @Test
    void updateRecipe_withIngredients_replacesIngredientSet() {
        RecipeDTO created = recipeService.addRecipe(RecipeDTO.builder()
                .name("Test Pasta")
                .description("Test")
                .instructions("Cook")
                .servings(1)
                .difficulty("easy")
                .cuisine("Italian")
                .ingredients(Set.of(RecipeIngredientDTO.builder()
                        .ingredientName("Pasta")
                        .quantity(200.0)
                        .unit("grams")
                        .optional(false)
                        .build()))
                .build());

        RecipeDTO update = RecipeDTO.builder()
                .name("Updated Pasta")
                .ingredients(Set.of(
                        RecipeIngredientDTO.builder()
                                .ingredientName("Pasta")
                                .quantity(250.0)
                                .unit("grams")
                                .optional(false)
                                .build(),
                        RecipeIngredientDTO.builder()
                                .ingredientName("Tomato")
                                .quantity(2.0)
                                .unit("pieces")
                                .optional(false)
                                .build()))
                .build();

        RecipeDTO updated = recipeService.updateRecipe(created.getId(), update);

        assertThat(updated.getName()).isEqualTo("Updated Pasta");
        assertThat(updated.getIngredients()).hasSize(2);
        assertThat(updated.getIngredients())
                .extracting(RecipeIngredientDTO::getIngredientName)
                .containsExactlyInAnyOrder("Pasta", "Tomato");
    }
}
