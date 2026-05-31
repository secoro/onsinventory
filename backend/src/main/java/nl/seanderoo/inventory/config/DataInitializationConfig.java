package nl.seanderoo.inventory.config;

import nl.seanderoo.inventory.model.Location;
import nl.seanderoo.inventory.model.InventoryItem;
import nl.seanderoo.inventory.model.Recipe;
import nl.seanderoo.inventory.model.RecipeIngredient;
import nl.seanderoo.inventory.model.User;
import nl.seanderoo.inventory.repository.InventoryItemRepository;
import nl.seanderoo.inventory.repository.LocationRepository;
import nl.seanderoo.inventory.repository.RecipeRepository;
import nl.seanderoo.inventory.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.HashSet;
import java.util.Set;
import java.time.LocalDate;

@Configuration
public class DataInitializationConfig {

    @Bean
    public CommandLineRunner initializeData(
            LocationRepository locationRepository,
            RecipeRepository recipeRepository,
            InventoryItemRepository inventoryItemRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.bootstrap.enabled:true}") boolean bootstrapEnabled
    ) {
        return args -> {
            if (!bootstrapEnabled) {
                return;
            }

            if (userRepository.count() == 0) {
                userRepository.save(User.builder()
                        .username("sean")
                        .firstName("Sean")
                        .password(passwordEncoder.encode("Test!234"))
                        .build());
                userRepository.save(User.builder()
                        .username("natalia")
                        .firstName("Natalia")
                        .password(passwordEncoder.encode("Test!234"))
                        .build());
            }

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

            // Initialize realistic inventory data (mainly useful for H2/dev restarts)
            if (inventoryItemRepository.count() == 0) {
                Location pantry = locationRepository.findByName("Pantry").orElseThrow();
                Location fridge = locationRepository.findByName("Fridge").orElseThrow();
                Location freezer = locationRepository.findByName("Freezer").orElseThrow();

                inventoryItemRepository.save(InventoryItem.builder()
                        .name("Eggs")
                        .category("dairy")
                        .location(fridge)
                        .quantity(12)
                        .unit("pieces")
                        .expiryDate(LocalDate.now().plusDays(6))
                        .notes("Free-range")
                        .build());

                inventoryItemRepository.save(InventoryItem.builder()
                        .name("Milk")
                        .category("dairy")
                        .location(fridge)
                        .quantity(1)
                        .unit("liters")
                        .expiryDate(LocalDate.now().plusDays(3))
                        .build());

                inventoryItemRepository.save(InventoryItem.builder()
                        .name("Butter")
                        .category("dairy")
                        .location(fridge)
                        .quantity(250)
                        .unit("grams")
                        .expiryDate(LocalDate.now().plusDays(20))
                        .build());

                inventoryItemRepository.save(InventoryItem.builder()
                        .name("Tomato")
                        .category("vegetable")
                        .location(fridge)
                        .quantity(6)
                        .unit("pieces")
                        .expiryDate(LocalDate.now().plusDays(2))
                        .build());

                inventoryItemRepository.save(InventoryItem.builder()
                        .name("Bell pepper")
                        .category("vegetable")
                        .location(fridge)
                        .quantity(3)
                        .unit("pieces")
                        .expiryDate(LocalDate.now().plusDays(4))
                        .build());

                inventoryItemRepository.save(InventoryItem.builder()
                        .name("Broccoli")
                        .category("vegetable")
                        .location(fridge)
                        .quantity(1)
                        .unit("pieces")
                        .expiryDate(LocalDate.now().plusDays(3))
                        .build());

                inventoryItemRepository.save(InventoryItem.builder()
                        .name("Garlic")
                        .category("vegetable")
                        .location(pantry)
                        .quantity(2)
                        .unit("bulbs")
                        .expiryDate(LocalDate.now().plusDays(25))
                        .build());

                inventoryItemRepository.save(InventoryItem.builder()
                        .name("Onion")
                        .category("vegetable")
                        .location(pantry)
                        .quantity(5)
                        .unit("pieces")
                        .expiryDate(LocalDate.now().plusDays(15))
                        .build());

                inventoryItemRepository.save(InventoryItem.builder()
                        .name("Pasta")
                        .category("grains")
                        .location(pantry)
                        .quantity(1000)
                        .unit("grams")
                        .expiryDate(LocalDate.now().plusDays(180))
                        .build());

                inventoryItemRepository.save(InventoryItem.builder()
                        .name("Olive oil")
                        .category("oil")
                        .location(pantry)
                        .quantity(750)
                        .unit("ml")
                        .expiryDate(LocalDate.now().plusDays(220))
                        .build());

                inventoryItemRepository.save(InventoryItem.builder()
                        .name("Chicken breast")
                        .category("meat")
                        .location(freezer)
                        .quantity(2)
                        .unit("pieces")
                        .expiryDate(LocalDate.now().plusDays(90))
                        .build());

                inventoryItemRepository.save(InventoryItem.builder()
                        .name("Frozen peas")
                        .category("vegetable")
                        .location(freezer)
                        .quantity(1)
                        .unit("bag")
                        .expiryDate(LocalDate.now().plusDays(150))
                        .build());
            }
        };
    }
}
