package nl.seanderoo.inventory.service;

import nl.seanderoo.inventory.dto.CookResultDTO;
import nl.seanderoo.inventory.dto.InventoryItemDTO;
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

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.OptionalDouble;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional
public class InventoryService {

    private static final Set<String> ALWAYS_AVAILABLE = Set.of(
            "water", "tap water", "cold water", "hot water", "boiling water", "ice water"
    );

    // Keyed by normalized unit — all variants map to one canonical form
    private static final Map<String, Double> VOLUME_TO_ML = new HashMap<>();
    private static final Map<String, Double> WEIGHT_TO_GRAMS = new HashMap<>();

    static {
        VOLUME_TO_ML.put("ml", 1.0);
        VOLUME_TO_ML.put("liters", 1000.0);
        VOLUME_TO_ML.put("dl", 100.0);
        VOLUME_TO_ML.put("tsp", 5.0);
        VOLUME_TO_ML.put("tbsp", 15.0);
        VOLUME_TO_ML.put("cup", 240.0);
        VOLUME_TO_ML.put("floz", 29.57);

        WEIGHT_TO_GRAMS.put("grams", 1.0);
        WEIGHT_TO_GRAMS.put("kg", 1000.0);
        WEIGHT_TO_GRAMS.put("oz", 28.35);
        WEIGHT_TO_GRAMS.put("lbs", 453.6);
    }

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
        Long householdId = currentHouseholdProvider.getHouseholdId();
        Location location = resolveLocation(dto.getLocation(), householdId);

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

        InventoryItem saved = inventoryItemRepository.save(item);
        return toDTO(saved);
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

        InventoryItem updated = inventoryItemRepository.save(item);
        return toDTO(updated);
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
                .collect(Collectors.toList());
    }

    public List<InventoryItemDTO> getItemsByLocation(String location) {
        Long householdId = currentHouseholdProvider.getHouseholdId();
        Location loc = locationRepository.findByNameAndHouseholdId(location, householdId)
                .orElseThrow(() -> new ResourceNotFoundException("Location not found: " + location));
        return inventoryItemRepository.findByLocationIdAndHouseholdId(loc.getId(), householdId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<InventoryItemDTO> getItemsByCategory(String category) {
        return inventoryItemRepository.findByCategoryAndHouseholdId(category, currentHouseholdProvider.getHouseholdId()).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<InventoryItemDTO> searchItems(String query) {
        return inventoryItemRepository.findByNameContainingIgnoreCaseAndHouseholdId(query, currentHouseholdProvider.getHouseholdId()).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<InventoryItemDTO> getExpiringItems() {
        Long householdId = currentHouseholdProvider.getHouseholdId();
        LocalDate soon = LocalDate.now().plusDays(3);
        return inventoryItemRepository.findExpiringSoonItems(householdId, LocalDate.now(), soon).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<InventoryItemDTO> getExpiredItems() {
        return inventoryItemRepository.findExpiredItems(currentHouseholdProvider.getHouseholdId()).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public RecipeAvailabilityDTO checkAvailability(Long recipeId, int requestedServings) {
        Recipe recipe = findOwnedRecipe(recipeId);

        double scale = scale(recipe.getServings(), requestedServings);
        List<String> insufficient = new ArrayList<>();
        List<String> missing = new ArrayList<>();

        for (RecipeIngredient ingredient : recipe.getIngredients()) {
            if (ALWAYS_AVAILABLE.contains(ingredient.getIngredientName().toLowerCase().trim())) continue;
            double needed = ingredient.getQuantity() * scale;
            List<InventoryItem> candidates = findCandidates(ingredient.getIngredientName());

            if (candidates.isEmpty()) {
                missing.add(ingredient.getIngredientName());
                continue;
            }

            if (candidates.stream().anyMatch(c -> "herbs".equalsIgnoreCase(c.getCategory()))) continue;

            Optional<InventoryItem> exactMatch = candidates.stream()
                    .filter(item -> normalizeUnit(item.getUnit()).equals(normalizeUnit(ingredient.getUnit())))
                    .findFirst();

            if (exactMatch.isPresent()) {
                InventoryItem item = exactMatch.get();
                if (item.getQuantity() < needed) {
                    insufficient.add(ingredient.getIngredientName()
                            + " (need " + formatQty(needed) + " " + ingredient.getUnit()
                            + ", have " + formatQty(item.getQuantity()) + " " + item.getUnit() + ")");
                }
                continue;
            }

            Optional<InventoryItem> convertibleMatch = candidates.stream()
                    .filter(c -> convertUnit(needed, ingredient.getUnit(), c.getUnit()).isPresent())
                    .findFirst();

            if (convertibleMatch.isPresent()) {
                InventoryItem item = convertibleMatch.get();
                double convertedNeeded = convertUnit(needed, ingredient.getUnit(), item.getUnit()).getAsDouble();
                if (item.getQuantity() < convertedNeeded) {
                    insufficient.add(ingredient.getIngredientName()
                            + " (need " + formatQty(convertedNeeded) + " " + item.getUnit()
                            + ", have " + formatQty(item.getQuantity()) + " " + item.getUnit() + ")");
                }
                continue;
            }

            // Approximation fallback: always deduct 1, so available if quantity >= 1
            if (candidates.get(0).getQuantity() < 1.0) {
                missing.add(ingredient.getIngredientName());
            }
        }

        return RecipeAvailabilityDTO.builder()
                .canCook(insufficient.isEmpty() && missing.isEmpty())
                .insufficientIngredients(insufficient)
                .missingIngredients(missing)
                .build();
    }

    public CookResultDTO cookRecipe(Long recipeId, int requestedServings, List<String> skippedIngredients) {
        Recipe recipe = findOwnedRecipe(recipeId);

        double scale = scale(recipe.getServings(), requestedServings);
        List<String> consumed = new ArrayList<>();
        List<String> unmatched = new ArrayList<>();

        for (RecipeIngredient ingredient : recipe.getIngredients()) {
            if (ALWAYS_AVAILABLE.contains(ingredient.getIngredientName().toLowerCase().trim())) continue;
            if (skippedIngredients.stream().anyMatch(s -> s.equalsIgnoreCase(ingredient.getIngredientName()))) continue;
            double scaledQuantity = ingredient.getQuantity() * scale;
            List<InventoryItem> candidates = findCandidates(ingredient.getIngredientName());

            if (candidates.isEmpty()) {
                unmatched.add(ingredient.getIngredientName());
                continue;
            }

            if (candidates.stream().anyMatch(c -> "herbs".equalsIgnoreCase(c.getCategory()))) continue;

            Optional<InventoryItem> exactMatch = candidates.stream()
                    .filter(item -> normalizeUnit(item.getUnit()).equals(normalizeUnit(ingredient.getUnit())))
                    .findFirst();

            InventoryItem item;
            double toDeduct;
            boolean approximated = false;

            if (exactMatch.isPresent()) {
                item = exactMatch.get();
                toDeduct = scaledQuantity;
            } else {
                Optional<InventoryItem> convertibleMatch = candidates.stream()
                        .filter(c -> convertUnit(scaledQuantity, ingredient.getUnit(), c.getUnit()).isPresent())
                        .findFirst();

                if (convertibleMatch.isPresent()) {
                    item = convertibleMatch.get();
                    toDeduct = convertUnit(scaledQuantity, ingredient.getUnit(), item.getUnit()).getAsDouble();
                } else {
                    item = candidates.get(0);
                    toDeduct = 1.0;
                    approximated = true;
                }
            }

            double remaining = item.getQuantity() - toDeduct;
            String suffix = approximated ? " (unit approximated)" : "";

            if (remaining <= 0) {
                inventoryItemRepository.delete(item);
                consumed.add(item.getName() + " (fully used — removed" + suffix + ")");
            } else {
                item.setQuantity(remaining);
                inventoryItemRepository.save(item);
                consumed.add(item.getName() + ": −" + formatQty(toDeduct) + " " + item.getUnit() + suffix);
            }
        }

        return CookResultDTO.builder()
                .consumed(consumed)
                .unmatched(unmatched)
                .build();
    }

    private List<InventoryItem> findCandidates(String ingredientName) {
        Long householdId = currentHouseholdProvider.getHouseholdId();
        List<InventoryItem> candidates = inventoryItemRepository.findByNameContainingIgnoreCaseAndHouseholdId(ingredientName, householdId);
        if (candidates.isEmpty()) {
            String lower = ingredientName.toLowerCase();
            candidates = inventoryItemRepository.findByHouseholdId(householdId).stream()
                    .filter(item -> lower.contains(item.getName().toLowerCase()))
                    .collect(Collectors.toList());
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
                .expiringsoon(item.isExpiredOrExpiringSoon())
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
