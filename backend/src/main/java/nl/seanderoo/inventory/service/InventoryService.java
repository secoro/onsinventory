package nl.seanderoo.inventory.service;

import nl.seanderoo.inventory.dto.CookResultDTO;
import nl.seanderoo.inventory.dto.InventoryItemDTO;
import nl.seanderoo.inventory.dto.MakeableIngredientDTO;
import nl.seanderoo.inventory.dto.RecipeAvailabilityDTO;
import nl.seanderoo.inventory.exception.BadRequestException;
import nl.seanderoo.inventory.exception.ResourceNotFoundException;
import nl.seanderoo.inventory.model.InventoryItem;
import nl.seanderoo.inventory.model.Location;
import nl.seanderoo.inventory.model.Recipe;
import nl.seanderoo.inventory.model.RecipeIngredient;
import nl.seanderoo.inventory.repository.InventoryItemRepository;
import nl.seanderoo.inventory.repository.LocationRepository;
import nl.seanderoo.inventory.repository.RecipeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.OptionalDouble;
import java.util.Set;

@Service
@Transactional
public class InventoryService {

    private static final Set<String> ALWAYS_AVAILABLE = Set.of(
            "water", "tap water", "cold water", "hot water", "boiling water", "ice water"
    );

    // Keyed by normalized unit — all variants map to one canonical form
    private static final Map<String, Double> VOLUME_TO_ML = Map.of(
            "ml", 1.0,
            "liters", 1000.0,
            "dl", 100.0,
            "tsp", 5.0,
            "tbsp", 15.0,
            "cup", 240.0,
            "floz", 29.57
    );

    private static final Map<String, Double> WEIGHT_TO_GRAMS = Map.of(
            "grams", 1.0,
            "kg", 1000.0,
            "oz", 28.35,
            "lbs", 453.6
    );

    static String normalizeUnit(String unit) {
        return switch (unit.toLowerCase().trim()) {
            case "piece", "pieces", "stuk", "stuks" -> "pieces";
            case "gram", "grams", "g" -> "grams";
            case "kilogram", "kilograms", "kg" -> "kg";
            case "liter", "liters", "litre", "litres", "l" -> "liters";
            case "deciliter", "deciliters", "dl" -> "dl";
            case "milliliter", "milliliters", "millilitre", "millilitres", "ml" -> "ml";
            case "clove", "cloves" -> "cloves";
            case "bulb", "bulbs" -> "bulbs";
            case "tbsp", "tablespoon", "tablespoons" -> "tbsp";
            case "tsp", "teaspoon", "teaspoons" -> "tsp";
            case "cup", "cups" -> "cup";
            case "ounce", "ounces", "oz" -> "oz";
            case "pound", "pounds", "lb", "lbs" -> "lbs";
            case "bag", "bags", "zak" -> "bag";
            case "bunch", "bunches", "bos" -> "bunch";
            default -> unit.toLowerCase().trim();
        };
    }

    static OptionalDouble convertUnit(double quantity, String fromUnit, String toUnit) {
        String from = normalizeUnit(fromUnit);
        String to = normalizeUnit(toUnit);
        if (from.equals(to)) return OptionalDouble.of(quantity);

        if (from.equals("cloves") && to.equals("bulbs")) return OptionalDouble.of(quantity / 10.0);
        if (from.equals("bulbs") && to.equals("cloves")) return OptionalDouble.of(quantity * 10.0);

        if (VOLUME_TO_ML.containsKey(from) && VOLUME_TO_ML.containsKey(to))
            return OptionalDouble.of(quantity * VOLUME_TO_ML.get(from) / VOLUME_TO_ML.get(to));

        if (WEIGHT_TO_GRAMS.containsKey(from) && WEIGHT_TO_GRAMS.containsKey(to))
            return OptionalDouble.of(quantity * WEIGHT_TO_GRAMS.get(from) / WEIGHT_TO_GRAMS.get(to));

        return OptionalDouble.empty();
    }

    private final InventoryItemRepository inventoryItemRepository;
    private final LocationRepository locationRepository;
    private final RecipeRepository recipeRepository;
    private final CurrentHouseholdProvider currentHouseholdProvider;

    public InventoryService(InventoryItemRepository inventoryItemRepository,
                             LocationRepository locationRepository,
                             RecipeRepository recipeRepository,
                             CurrentHouseholdProvider currentHouseholdProvider) {
        this.inventoryItemRepository = inventoryItemRepository;
        this.locationRepository = locationRepository;
        this.recipeRepository = recipeRepository;
        this.currentHouseholdProvider = currentHouseholdProvider;
    }

    public InventoryItemDTO addItem(InventoryItemDTO dto) {
        validateCreateRequest(dto);
        Location location = resolveLocation(dto.getLocation(), currentHouseholdProvider.getHouseholdId());

        InventoryItem item = InventoryItem.builder()
                .name(dto.getName())
                .category(dto.getCategory())
                .location(location)
                .household(currentHouseholdProvider.getHousehold())
                .quantity(dto.getQuantity())
                .unit(dto.getUnit())
                .expiryDate(dto.getExpiryDate())
                .notes(dto.getNotes())
                .build();

        return toDTO(inventoryItemRepository.save(item));
    }

    public InventoryItemDTO updateItem(Long id, InventoryItemDTO dto) {
        InventoryItem item = findOwnedItem(id);

        if (dto.getName() != null) item.setName(dto.getName());
        if (dto.getCategory() != null) item.setCategory(dto.getCategory());
        if (dto.getQuantity() != null) item.setQuantity(dto.getQuantity());
        if (dto.getUnit() != null) item.setUnit(dto.getUnit());
        if (dto.getExpiryDate() != null) item.setExpiryDate(dto.getExpiryDate());
        if (dto.getNotes() != null) item.setNotes(dto.getNotes());
        if (dto.getLocation() != null) item.setLocation(resolveLocation(dto.getLocation(), currentHouseholdProvider.getHouseholdId()));

        return toDTO(inventoryItemRepository.save(item));
    }

    public void deleteItem(Long id) {
        inventoryItemRepository.delete(findOwnedItem(id));
    }

    public InventoryItemDTO getItem(Long id) {
        return toDTO(findOwnedItem(id));
    }

    public List<InventoryItemDTO> getAllItems() {
        return inventoryItemRepository.findByHouseholdId(currentHouseholdProvider.getHouseholdId()).stream()
                .map(this::toDTO)
                .toList();
    }

    public RecipeAvailabilityDTO checkAvailability(Long recipeId, int requestedServings) {
        Recipe recipe = findOwnedRecipe(recipeId);

        double scale = scale(recipe.getServings(), requestedServings);
        List<String> insufficient = new ArrayList<>();
        List<String> missing = new ArrayList<>();
        List<MakeableIngredientDTO> makeable = new ArrayList<>();

        for (RecipeIngredient ingredient : recipe.getIngredients()) {
            if (isAlwaysAvailable(ingredient)) continue;
            List<InventoryItem> candidates = findCandidates(ingredient.getIngredientName());
            if (candidates.isEmpty()) {
                Recipe subRecipe = findMakeableSubRecipe(ingredient.getIngredientName(), new HashSet<>(Set.of(recipe.getId())));
                if (subRecipe != null) {
                    makeable.add(MakeableIngredientDTO.builder()
                            .ingredientName(ingredient.getIngredientName())
                            .recipeId(subRecipe.getId())
                            .recipeName(subRecipe.getName())
                            .build());
                } else {
                    missing.add(ingredient.getIngredientName());
                }
                continue;
            }
            if (containsHerb(candidates)) continue;

            IngredientMatch match = matchIngredient(candidates, ingredient, ingredient.getQuantity() * scale);
            if (match.item().getQuantity() >= match.neededQuantity()) continue;

            if (match.approximated()) {
                missing.add(ingredient.getIngredientName());
            } else {
                insufficient.add(ingredient.getIngredientName()
                        + " (need " + formatQty(match.neededQuantity()) + " " + match.item().getUnit()
                        + ", have " + formatQty(match.item().getQuantity()) + " " + match.item().getUnit() + ")");
            }
        }

        return RecipeAvailabilityDTO.builder()
                .canCook(insufficient.isEmpty() && missing.isEmpty())
                .insufficientIngredients(insufficient)
                .missingIngredients(missing)
                .makeableIngredients(makeable)
                .build();
    }

    /**
     * Finds a household recipe that produces the given ingredient (matched by name, exact match
     * preferred) and can itself be made from current stock — so a missing ingredient like
     * "tzatziki" counts as makeable when there is a cookable Tzatziki recipe.
     * {@code visited} holds recipe ids already being checked, to break recipe cycles.
     */
    private Recipe findMakeableSubRecipe(String ingredientName, Set<Long> visited) {
        String needle = ingredientName.toLowerCase().trim();
        return recipeRepository.findAllByHouseholdId(currentHouseholdProvider.getHouseholdId()).stream()
                .filter(recipe -> !visited.contains(recipe.getId()))
                .filter(recipe -> {
                    String name = recipe.getName().toLowerCase().trim();
                    return name.contains(needle) || needle.contains(name);
                })
                .sorted(Comparator.comparing(recipe -> !recipe.getName().trim().equalsIgnoreCase(needle)))
                .filter(recipe -> canMake(recipe, visited))
                .findFirst()
                .orElse(null);
    }

    /** Whether one batch of the recipe (at its base servings) can be made from current stock. */
    private boolean canMake(Recipe recipe, Set<Long> visited) {
        visited.add(recipe.getId());
        for (RecipeIngredient ingredient : recipe.getIngredients()) {
            if (isAlwaysAvailable(ingredient)) continue;
            List<InventoryItem> candidates = findCandidates(ingredient.getIngredientName());
            if (candidates.isEmpty()) {
                if (findMakeableSubRecipe(ingredient.getIngredientName(), visited) == null) return false;
                continue;
            }
            if (containsHerb(candidates)) continue;

            IngredientMatch match = matchIngredient(candidates, ingredient, ingredient.getQuantity());
            if (match.item().getQuantity() < match.neededQuantity()) return false;
        }
        return true;
    }

    public CookResultDTO cookRecipe(Long recipeId, int requestedServings, List<String> skippedIngredients) {
        Recipe recipe = findOwnedRecipe(recipeId);

        double scale = scale(recipe.getServings(), requestedServings);
        List<String> consumed = new ArrayList<>();
        List<String> unmatched = new ArrayList<>();

        for (RecipeIngredient ingredient : recipe.getIngredients()) {
            if (isAlwaysAvailable(ingredient)) continue;
            if (skippedIngredients.stream().anyMatch(s -> s.equalsIgnoreCase(ingredient.getIngredientName()))) continue;
            List<InventoryItem> candidates = findCandidates(ingredient.getIngredientName());
            if (candidates.isEmpty()) {
                unmatched.add(ingredient.getIngredientName());
                continue;
            }
            if (containsHerb(candidates)) continue;

            IngredientMatch match = matchIngredient(candidates, ingredient, ingredient.getQuantity() * scale);
            InventoryItem item = match.item();
            double remaining = item.getQuantity() - match.neededQuantity();
            String suffix = match.approximated() ? " (unit approximated)" : "";

            if (remaining <= 0) {
                inventoryItemRepository.delete(item);
                consumed.add(item.getName() + " (fully used — removed" + suffix + ")");
            } else {
                item.setQuantity(remaining);
                inventoryItemRepository.save(item);
                consumed.add(item.getName() + ": −" + formatQty(match.neededQuantity()) + " " + item.getUnit() + suffix);
            }
        }

        return CookResultDTO.builder()
                .consumed(consumed)
                .unmatched(unmatched)
                .build();
    }

    /** The inventory item chosen for an ingredient, with the needed quantity converted to that item's unit. */
    private record IngredientMatch(InventoryItem item, double neededQuantity, boolean approximated) {}

    /**
     * Picks the first candidate whose unit the needed quantity can be converted to.
     * When no unit is compatible, falls back to the first candidate and approximates
     * the ingredient as 1 of that item's unit.
     */
    private static IngredientMatch matchIngredient(List<InventoryItem> candidates, RecipeIngredient ingredient, double neededQuantity) {
        for (InventoryItem candidate : candidates) {
            OptionalDouble converted = convertUnit(neededQuantity, ingredient.getUnit(), candidate.getUnit());
            if (converted.isPresent()) {
                return new IngredientMatch(candidate, converted.getAsDouble(), false);
            }
        }
        return new IngredientMatch(candidates.get(0), 1.0, true);
    }

    private static boolean isAlwaysAvailable(RecipeIngredient ingredient) {
        return ALWAYS_AVAILABLE.contains(ingredient.getIngredientName().toLowerCase().trim());
    }

    // Herbs are assumed to be used in negligible quantities, so having any match is enough
    private static boolean containsHerb(List<InventoryItem> candidates) {
        return candidates.stream().anyMatch(c -> "herbs".equalsIgnoreCase(c.getCategory()));
    }

    private List<InventoryItem> findCandidates(String ingredientName) {
        Long householdId = currentHouseholdProvider.getHouseholdId();
        List<InventoryItem> candidates = inventoryItemRepository.findByNameContainingIgnoreCaseAndHouseholdId(ingredientName, householdId);
        if (candidates.isEmpty()) {
            String lower = ingredientName.toLowerCase();
            candidates = inventoryItemRepository.findByHouseholdId(householdId).stream()
                    .filter(item -> lower.contains(item.getName().toLowerCase()))
                    .toList();
        }
        return candidates;
    }

    private Recipe findOwnedRecipe(Long recipeId) {
        return recipeRepository.findByIdAndHouseholdId(recipeId, currentHouseholdProvider.getHouseholdId())
                .orElseThrow(() -> new ResourceNotFoundException("Recipe not found: " + recipeId));
    }

    private InventoryItem findOwnedItem(Long id) {
        return inventoryItemRepository.findByIdAndHouseholdId(id, currentHouseholdProvider.getHouseholdId())
                .orElseThrow(() -> new ResourceNotFoundException("Item not found: " + id));
    }

    private static double scale(Integer baseServings, int requestedServings) {
        int base = (baseServings != null && baseServings > 0) ? baseServings : 1;
        return (double) requestedServings / base;
    }

    private static String formatQty(double qty) {
        return qty == Math.floor(qty) ? String.valueOf((long) qty) : String.valueOf(qty);
    }

    private InventoryItemDTO toDTO(InventoryItem item) {
        return InventoryItemDTO.builder()
                .id(item.getId())
                .name(item.getName())
                .category(item.getCategory())
                .location(item.getLocation().getName())
                .quantity(item.getQuantity())
                .unit(item.getUnit())
                .expiryDate(item.getExpiryDate())
                .addedDate(item.getAddedDate())
                .expired(item.isExpired())
                .expiringsoon(item.isExpiringSoon())
                .notes(item.getNotes())
                .build();
    }

    private void validateCreateRequest(InventoryItemDTO dto) {
        if (dto.getName() == null || dto.getName().isBlank()) {
            throw new BadRequestException("Item name is required");
        }
        if (dto.getCategory() == null || dto.getCategory().isBlank()) {
            throw new BadRequestException("Category is required");
        }
        if (dto.getLocation() == null || dto.getLocation().isBlank()) {
            throw new BadRequestException("Location is required");
        }
        if (dto.getQuantity() == null || dto.getQuantity() <= 0.0) {
            throw new BadRequestException("Quantity must be greater than 0");
        }
        if (dto.getUnit() == null || dto.getUnit().isBlank()) {
            throw new BadRequestException("Unit is required");
        }
    }

    private Location resolveLocation(String locationName, Long householdId) {
        return locationRepository.findByNameAndHouseholdId(locationName, householdId)
                .orElseThrow(() -> new ResourceNotFoundException("Location not found: " + locationName));
    }
}
