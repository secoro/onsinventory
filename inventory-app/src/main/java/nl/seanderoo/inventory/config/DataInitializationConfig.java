package nl.seanderoo.inventory.config;

import nl.seanderoo.inventory.model.Location;
import nl.seanderoo.inventory.model.Recipe;
import nl.seanderoo.inventory.model.RecipeIngredient;
import nl.seanderoo.inventory.repository.LocationRepository;
import nl.seanderoo.inventory.repository.RecipeRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.HashSet;
import java.util.Set;

@Configuration
public class DataInitializationConfig {

    @Bean
    public CommandLineRunner initializeData(LocationRepository locationRepository, RecipeRepository recipeRepository) {
        return args -> {
            // Initialize default locations
            if (locationRepository.count() == 0) {
                locationRepository.save(Location.pantry());
                locationRepository.save(Location.fridge());
                locationRepository.save(Location.freezer());
            }

            // Initialize sample recipes
            if (recipeRepository.count() == 0) {
                // Recipe 1: Simple Tomato Pasta
                Recipe tomatoPasta = Recipe.builder()
                        .name("Tomato Pasta")
                        .description("Classic Italian pasta with fresh tomato sauce")
                        .instructions("1. Cook pasta. 2. Heat olive oil, add tomatoes, garlic, and basil. 3. Mix pasta with sauce. 4. Serve hot.")
                        .servings(2)
                        .preparationTimeMinutes(10)
                        .cookingTimeMinutes(15)
                        .difficulty("easy")
                        .cuisine("Italian")
                        .build();

                Set<RecipeIngredient> tomatoIngredients = new HashSet<>();
                tomatoIngredients.add(RecipeIngredient.builder()
                        .recipe(tomatoPasta)
                        .ingredientName("Pasta")
                        .quantity(400.0)
                        .unit("grams")
                        .optional(false)
                        .build());
                tomatoIngredients.add(RecipeIngredient.builder()
                        .recipe(tomatoPasta)
                        .ingredientName("Tomato")
                        .quantity(500.0)
                        .unit("grams")
                        .optional(false)
                        .build());
                tomatoIngredients.add(RecipeIngredient.builder()
                        .recipe(tomatoPasta)
                        .ingredientName("Garlic")
                        .quantity(3.0)
                        .unit("cloves")
                        .optional(false)
                        .build());
                tomatoIngredients.add(RecipeIngredient.builder()
                        .recipe(tomatoPasta)
                        .ingredientName("Olive oil")
                        .quantity(3.0)
                        .unit("tbsp")
                        .optional(false)
                        .build());
                tomatoPasta.setIngredients(tomatoIngredients);
                recipeRepository.save(tomatoPasta);

                // Recipe 2: Vegetable Stir Fry
                Recipe stirFry = Recipe.builder()
                        .name("Vegetable Stir Fry")
                        .description("Quick and healthy mixed vegetable stir fry")
                        .instructions("1. Heat wok. 2. Add oil and garlic. 3. Add vegetables one by one. 4. Season and serve over rice.")
                        .servings(4)
                        .preparationTimeMinutes(15)
                        .cookingTimeMinutes(10)
                        .difficulty("easy")
                        .cuisine("Asian")
                        .build();

                Set<RecipeIngredient> stirFryIngredients = new HashSet<>();
                stirFryIngredients.add(RecipeIngredient.builder()
                        .recipe(stirFry)
                        .ingredientName("Broccoli")
                        .quantity(300.0)
                        .unit("grams")
                        .optional(false)
                        .build());
                stirFryIngredients.add(RecipeIngredient.builder()
                        .recipe(stirFry)
                        .ingredientName("Bell pepper")
                        .quantity(2.0)
                        .unit("pieces")
                        .optional(false)
                        .build());
                stirFryIngredients.add(RecipeIngredient.builder()
                        .recipe(stirFry)
                        .ingredientName("Soy sauce")
                        .quantity(3.0)
                        .unit("tbsp")
                        .optional(false)
                        .build());
                stirFry.setIngredients(stirFryIngredients);
                recipeRepository.save(stirFry);

                // Recipe 3: Cheese Omelette
                Recipe omelette = Recipe.builder()
                        .name("Cheese Omelette")
                        .description("Fluffy cheese omelette perfect for breakfast")
                        .instructions("1. Beat eggs. 2. Heat butter in pan. 3. Pour eggs. 4. Add cheese when half-cooked. 5. Fold and serve.")
                        .servings(1)
                        .preparationTimeMinutes(5)
                        .cookingTimeMinutes(5)
                        .difficulty("easy")
                        .cuisine("French")
                        .build();

                Set<RecipeIngredient> omeletteIngredients = new HashSet<>();
                omeletteIngredients.add(RecipeIngredient.builder()
                        .recipe(omelette)
                        .ingredientName("Eggs")
                        .quantity(3.0)
                        .unit("pieces")
                        .optional(false)
                        .build());
                omeletteIngredients.add(RecipeIngredient.builder()
                        .recipe(omelette)
                        .ingredientName("Cheese")
                        .quantity(100.0)
                        .unit("grams")
                        .optional(false)
                        .build());
                omeletteIngredients.add(RecipeIngredient.builder()
                        .recipe(omelette)
                        .ingredientName("Butter")
                        .quantity(1.0)
                        .unit("tbsp")
                        .optional(false)
                        .build());
                omelette.setIngredients(omeletteIngredients);
                recipeRepository.save(omelette);
            }
        };
    }
}
