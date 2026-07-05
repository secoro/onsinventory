package nl.seanderoo.inventory.config;

import nl.seanderoo.inventory.model.Household;
import nl.seanderoo.inventory.model.Location;
import nl.seanderoo.inventory.model.InventoryItem;
import nl.seanderoo.inventory.model.Recipe;
import nl.seanderoo.inventory.model.RecipeIngredient;
import nl.seanderoo.inventory.model.User;
import nl.seanderoo.inventory.repository.HouseholdRepository;
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
            HouseholdRepository householdRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.bootstrap.enabled:true}") boolean bootstrapEnabled
    ) {
        return args -> {
            if (!bootstrapEnabled) {
                return;
            }

            Household household;
            if (userRepository.count() == 0) {
                household = householdRepository.save(Household.builder()
                        .name("Sean & Natalia's Household")
                        .build());

                userRepository.save(User.builder()
                        .username("sean")
                        .email("deroosean@gmail.com")
                        .firstName("Sean")
                        .lastName("de Roo")
                        .password(passwordEncoder.encode("Test!234"))
                        .household(household)
                        .build());
                userRepository.save(User.builder()
                        .username("natalia")
                        .email("nacardenasni@gmail.com")
                        .firstName("Natalia")
                        .lastName("Cardenas Nino")
                        .password(passwordEncoder.encode("Test!234"))
                        .household(household)
                        .build());
            } else {
                household = householdRepository.findAll().stream()
                        .findFirst()
                        .orElseThrow(() -> new IllegalStateException("Expected a bootstrap household to exist"));
            }

            // Initialize default locations
            if (locationRepository.count() == 0) {
                locationRepository.save(Location.pantry(household));
                locationRepository.save(Location.fridge(household));
                locationRepository.save(Location.freezer(household));
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
                        .household(household)
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
                        .quantity(4.0)
                        .unit("pieces")
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
                        .household(household)
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
                        .household(household)
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
                Location pantry = locationRepository.findByNameAndHouseholdId("Pantry", household.getId()).orElseThrow();
                Location fridge = locationRepository.findByNameAndHouseholdId("Fridge", household.getId()).orElseThrow();
                Location freezer = locationRepository.findByNameAndHouseholdId("Freezer", household.getId()).orElseThrow();

                inventoryItemRepository.save(InventoryItem.builder()
                        .name("Eggs")
                        .category("dairy")
                        .location(fridge)
                        .household(household)
                        .quantity(12.0)
                        .unit("pieces")
                        .expiryDate(LocalDate.now().plusDays(6))
                        .notes("Free-range")
                        .build());

                inventoryItemRepository.save(InventoryItem.builder()
                        .name("Milk")
                        .category("dairy")
                        .location(fridge)
                        .household(household)
                        .quantity(1.0)
                        .unit("liters")
                        .expiryDate(LocalDate.now().plusDays(3))
                        .build());

                inventoryItemRepository.save(InventoryItem.builder()
                        .name("Butter")
                        .category("dairy")
                        .location(fridge)
                        .household(household)
                        .quantity(250.0)
                        .unit("grams")
                        .expiryDate(LocalDate.now().plusDays(20))
                        .build());

                inventoryItemRepository.save(InventoryItem.builder()
                        .name("Tomato")
                        .category("vegetable")
                        .location(fridge)
                        .household(household)
                        .quantity(6.0)
                        .unit("pieces")
                        .expiryDate(LocalDate.now().plusDays(2))
                        .build());

                inventoryItemRepository.save(InventoryItem.builder()
                        .name("Bell pepper")
                        .category("vegetable")
                        .location(fridge)
                        .household(household)
                        .quantity(3.0)
                        .unit("pieces")
                        .expiryDate(LocalDate.now().plusDays(4))
                        .build());

                inventoryItemRepository.save(InventoryItem.builder()
                        .name("Broccoli")
                        .category("vegetable")
                        .location(fridge)
                        .household(household)
                        .quantity(1.0)
                        .unit("pieces")
                        .expiryDate(LocalDate.now().plusDays(3))
                        .build());

                inventoryItemRepository.save(InventoryItem.builder()
                        .name("Garlic")
                        .category("vegetable")
                        .location(pantry)
                        .household(household)
                        .quantity(2.0)
                        .unit("bulbs")
                        .expiryDate(LocalDate.now().plusDays(25))
                        .build());

                inventoryItemRepository.save(InventoryItem.builder()
                        .name("Onion")
                        .category("vegetable")
                        .location(pantry)
                        .household(household)
                        .quantity(5.0)
                        .unit("pieces")
                        .expiryDate(LocalDate.now().plusDays(15))
                        .build());

                inventoryItemRepository.save(InventoryItem.builder()
                        .name("Pasta")
                        .category("grains")
                        .location(pantry)
                        .household(household)
                        .quantity(1000.0)
                        .unit("grams")
                        .expiryDate(LocalDate.now().plusDays(180))
                        .build());

                inventoryItemRepository.save(InventoryItem.builder()
                        .name("Olive oil")
                        .category("oil")
                        .location(pantry)
                        .household(household)
                        .quantity(750.0)
                        .unit("ml")
                        .expiryDate(LocalDate.now().plusDays(220))
                        .build());

                inventoryItemRepository.save(InventoryItem.builder()
                        .name("Chicken breast")
                        .category("meat")
                        .location(freezer)
                        .household(household)
                        .quantity(2.0)
                        .unit("pieces")
                        .expiryDate(LocalDate.now().plusDays(90))
                        .build());

                inventoryItemRepository.save(InventoryItem.builder()
                        .name("Frozen peas")
                        .category("vegetable")
                        .location(freezer)
                        .household(household)
                        .quantity(1.0)
                        .unit("bag")
                        .expiryDate(LocalDate.now().plusDays(150))
                        .build());
            }
        };
    }
}
