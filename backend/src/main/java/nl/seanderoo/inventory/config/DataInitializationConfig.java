package nl.seanderoo.inventory.config;

import nl.seanderoo.inventory.model.Household;
import nl.seanderoo.inventory.model.InventoryItem;
import nl.seanderoo.inventory.model.Location;
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

import java.time.LocalDate;
import java.util.Set;

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
                userRepository.save(user(household, passwordEncoder, "sean", "deroosean@gmail.com", "Sean", "de Roo"));
                userRepository.save(user(household, passwordEncoder, "natalia", "nacardenasni@gmail.com", "Natalia", "Cardenas Nino"));
            } else {
                household = householdRepository.findAll().stream()
                        .findFirst()
                        .orElseThrow(() -> new IllegalStateException("Expected a bootstrap household to exist"));
            }

            if (locationRepository.count() == 0) {
                locationRepository.save(Location.pantry(household));
                locationRepository.save(Location.fridge(household));
                locationRepository.save(Location.freezer(household));
            }

            if (recipeRepository.count() == 0) {
                Recipe tomatoPasta = recipe(household, "Tomato Pasta",
                        "Classic Italian pasta with fresh tomato sauce",
                        "1. Cook pasta. 2. Heat olive oil, add tomatoes, garlic, and basil. 3. Mix pasta with sauce. 4. Serve hot.",
                        2, 10, 15, "Italian");
                tomatoPasta.setIngredients(Set.of(
                        ingredient(tomatoPasta, "Pasta", 400.0, "grams"),
                        ingredient(tomatoPasta, "Tomato", 4.0, "pieces"),
                        ingredient(tomatoPasta, "Garlic", 3.0, "cloves"),
                        ingredient(tomatoPasta, "Olive oil", 3.0, "tbsp")));
                recipeRepository.save(tomatoPasta);

                Recipe stirFry = recipe(household, "Vegetable Stir Fry",
                        "Quick and healthy mixed vegetable stir fry",
                        "1. Heat wok. 2. Add oil and garlic. 3. Add vegetables one by one. 4. Season and serve over rice.",
                        4, 15, 10, "Asian");
                stirFry.setIngredients(Set.of(
                        ingredient(stirFry, "Broccoli", 300.0, "grams"),
                        ingredient(stirFry, "Bell pepper", 2.0, "pieces"),
                        ingredient(stirFry, "Soy sauce", 3.0, "tbsp")));
                recipeRepository.save(stirFry);

                Recipe omelette = recipe(household, "Cheese Omelette",
                        "Fluffy cheese omelette perfect for breakfast",
                        "1. Beat eggs. 2. Heat butter in pan. 3. Pour eggs. 4. Add cheese when half-cooked. 5. Fold and serve.",
                        1, 5, 5, "French");
                omelette.setIngredients(Set.of(
                        ingredient(omelette, "Eggs", 3.0, "pieces"),
                        ingredient(omelette, "Cheese", 100.0, "grams"),
                        ingredient(omelette, "Butter", 1.0, "tbsp")));
                recipeRepository.save(omelette);
            }

            // Realistic inventory data (mainly useful for H2/dev restarts)
            if (inventoryItemRepository.count() == 0) {
                Location pantry = locationRepository.findByNameAndHouseholdId("Pantry", household.getId()).orElseThrow();
                Location fridge = locationRepository.findByNameAndHouseholdId("Fridge", household.getId()).orElseThrow();
                Location freezer = locationRepository.findByNameAndHouseholdId("Freezer", household.getId()).orElseThrow();

                inventoryItemRepository.saveAll(Set.of(
                        item(household, fridge, "Eggs", "dairy", 12.0, "pieces", 6, "Free-range"),
                        item(household, fridge, "Milk", "dairy", 1.0, "liters", 3, null),
                        item(household, fridge, "Butter", "dairy", 250.0, "grams", 20, null),
                        item(household, fridge, "Tomato", "vegetable", 6.0, "pieces", 2, null),
                        item(household, fridge, "Bell pepper", "vegetable", 3.0, "pieces", 4, null),
                        item(household, fridge, "Broccoli", "vegetable", 1.0, "pieces", 3, null),
                        item(household, pantry, "Garlic", "vegetable", 2.0, "bulbs", 25, null),
                        item(household, pantry, "Onion", "vegetable", 5.0, "pieces", 15, null),
                        item(household, pantry, "Pasta", "grains", 1000.0, "grams", 180, null),
                        item(household, pantry, "Olive oil", "oil", 750.0, "ml", 220, null),
                        item(household, freezer, "Chicken breast", "meat", 2.0, "pieces", 90, null),
                        item(household, freezer, "Frozen peas", "vegetable", 1.0, "bag", 150, null)));
            }
        };
    }

    private static User user(Household household, PasswordEncoder encoder,
                             String username, String email, String firstName, String lastName) {
        return User.builder()
                .username(username)
                .email(email)
                .firstName(firstName)
                .lastName(lastName)
                .password(encoder.encode("Test!234"))
                .household(household)
                .build();
    }

    private static Recipe recipe(Household household, String name, String description, String instructions,
                                 int servings, int prepMinutes, int cookMinutes, String cuisine) {
        return Recipe.builder()
                .name(name)
                .description(description)
                .instructions(instructions)
                .servings(servings)
                .preparationTimeMinutes(prepMinutes)
                .cookingTimeMinutes(cookMinutes)
                .difficulty("easy")
                .cuisine(cuisine)
                .household(household)
                .build();
    }

    private static RecipeIngredient ingredient(Recipe recipe, String name, double quantity, String unit) {
        return RecipeIngredient.builder()
                .recipe(recipe)
                .ingredientName(name)
                .quantity(quantity)
                .unit(unit)
                .optional(false)
                .build();
    }

    private static InventoryItem item(Household household, Location location, String name, String category,
                                      double quantity, String unit, int daysUntilExpiry, String notes) {
        return InventoryItem.builder()
                .name(name)
                .category(category)
                .location(location)
                .household(household)
                .quantity(quantity)
                .unit(unit)
                .expiryDate(LocalDate.now().plusDays(daysUntilExpiry))
                .notes(notes)
                .build();
    }
}
