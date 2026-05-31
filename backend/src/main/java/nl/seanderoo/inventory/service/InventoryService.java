package nl.seanderoo.inventory.service;

import nl.seanderoo.inventory.dto.CookResultDTO;
import nl.seanderoo.inventory.dto.InventoryItemDTO;
import nl.seanderoo.inventory.dto.RecipeAvailabilityDTO;
import nl.seanderoo.inventory.exception.BadRequestException;
import nl.seanderoo.inventory.exception.ResourceNotFoundException;
import nl.seanderoo.inventory.model.InventoryItem;
import nl.seanderoo.inventory.model.Location;
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
import java.util.stream.Collectors;

@Service
@Transactional
public class InventoryService {

    private static final Map<String, Double> VOLUME_TO_ML = new HashMap<>();
    private static final Map<String, Double> WEIGHT_TO_GRAMS = new HashMap<>();

    static {
        VOLUME_TO_ML.put("ml", 1.0);
        VOLUME_TO_ML.put("l", 1000.0);
        VOLUME_TO_ML.put("liter", 1000.0);
        VOLUME_TO_ML.put("liters", 1000.0);
        VOLUME_TO_ML.put("dl", 100.0);
        VOLUME_TO_ML.put("tsp", 5.0);
        VOLUME_TO_ML.put("teaspoon", 5.0);
        VOLUME_TO_ML.put("teaspoons", 5.0);
        VOLUME_TO_ML.put("tbsp", 15.0);
        VOLUME_TO_ML.put("tablespoon", 15.0);
        VOLUME_TO_ML.put("tablespoons", 15.0);
        VOLUME_TO_ML.put("cup", 240.0);
        VOLUME_TO_ML.put("cups", 240.0);
        VOLUME_TO_ML.put("floz", 29.57);

        WEIGHT_TO_GRAMS.put("g", 1.0);
        WEIGHT_TO_GRAMS.put("gram", 1.0);
        WEIGHT_TO_GRAMS.put("grams", 1.0);
        WEIGHT_TO_GRAMS.put("kg", 1000.0);
        WEIGHT_TO_GRAMS.put("oz", 28.35);
        WEIGHT_TO_GRAMS.put("ounce", 28.35);
        WEIGHT_TO_GRAMS.put("ounces", 28.35);
        WEIGHT_TO_GRAMS.put("lb", 453.6);
        WEIGHT_TO_GRAMS.put("lbs", 453.6);
        WEIGHT_TO_GRAMS.put("pound", 453.6);
        WEIGHT_TO_GRAMS.put("pounds", 453.6);
    }

    private static OptionalDouble convertUnit(double quantity, String fromUnit, String toUnit) {
        String from = fromUnit.toLowerCase().trim();
        String to = toUnit.toLowerCase().trim();
        if (from.equals(to)) return OptionalDouble.of(quantity);

        // Garlic: cloves <-> bulbs (~10 cloves per bulb)
        if ((from.equals("clove") || from.equals("cloves")) && (to.equals("bulb") || to.equals("bulbs")))
            return OptionalDouble.of(quantity / 10.0);
        if ((from.equals("bulb") || from.equals("bulbs")) && (to.equals("clove") || to.equals("cloves")))
            return OptionalDouble.of(quantity * 10.0);

        if (VOLUME_TO_ML.containsKey(from) && VOLUME_TO_ML.containsKey(to))
            return OptionalDouble.of(quantity * VOLUME_TO_ML.get(from) / VOLUME_TO_ML.get(to));

        if (WEIGHT_TO_GRAMS.containsKey(from) && WEIGHT_TO_GRAMS.containsKey(to))
            return OptionalDouble.of(quantity * WEIGHT_TO_GRAMS.get(from) / WEIGHT_TO_GRAMS.get(to));

        return OptionalDouble.empty();
    }

    private final InventoryItemRepository inventoryItemRepository;
    private final LocationRepository locationRepository;
    private final RecipeRepository recipeRepository;

    public InventoryService(InventoryItemRepository inventoryItemRepository, LocationRepository locationRepository, RecipeRepository recipeRepository) {
        this.inventoryItemRepository = inventoryItemRepository;
        this.locationRepository = locationRepository;
        this.recipeRepository = recipeRepository;
    }

    public InventoryItemDTO addItem(InventoryItemDTO dto) {
        validateCreateRequest(dto);
        Location location = resolveLocation(dto.getLocation());

        InventoryItem item = InventoryItem.builder()
                .name(dto.getName())
                .category(dto.getCategory())
                .location(location)
                .quantity(dto.getQuantity())
                .unit(dto.getUnit())
                .expiryDate(dto.getExpiryDate())
                .notes(dto.getNotes())
                .build();

        InventoryItem saved = inventoryItemRepository.save(item);
        return toDTO(saved);
    }

    public InventoryItemDTO updateItem(Long id, InventoryItemDTO dto) {
        InventoryItem item = inventoryItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Item not found: " + id));

        if (dto.getName() != null) item.setName(dto.getName());
        if (dto.getCategory() != null) item.setCategory(dto.getCategory());
        if (dto.getQuantity() != null) item.setQuantity(dto.getQuantity());
        if (dto.getUnit() != null) item.setUnit(dto.getUnit());
        if (dto.getExpiryDate() != null) item.setExpiryDate(dto.getExpiryDate());
        if (dto.getNotes() != null) item.setNotes(dto.getNotes());
        if (dto.getLocation() != null) item.setLocation(resolveLocation(dto.getLocation()));

        InventoryItem updated = inventoryItemRepository.save(item);
        return toDTO(updated);
    }

    public void deleteItem(Long id) {
        if (!inventoryItemRepository.existsById(id)) {
            throw new ResourceNotFoundException("Item not found: " + id);
        }
        inventoryItemRepository.deleteById(id);
    }

    public InventoryItemDTO getItem(Long id) {
        return inventoryItemRepository.findById(id)
                .map(this::toDTO)
                .orElseThrow(() -> new ResourceNotFoundException("Item not found: " + id));
    }

    public List<InventoryItemDTO> getAllItems() {
        return inventoryItemRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<InventoryItemDTO> getItemsByLocation(String location) {
        Location loc = locationRepository.findByName(location)
                .orElseThrow(() -> new ResourceNotFoundException("Location not found: " + location));
        return inventoryItemRepository.findByLocationId(loc.getId()).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<InventoryItemDTO> getItemsByCategory(String category) {
        return inventoryItemRepository.findByCategory(category).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<InventoryItemDTO> searchItems(String query) {
        return inventoryItemRepository.findByNameContainingIgnoreCase(query).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<InventoryItemDTO> getExpiringItems() {
        LocalDate soon = LocalDate.now().plusDays(3);
        return inventoryItemRepository.findExpiringSoonItems(LocalDate.now(), soon).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<InventoryItemDTO> getExpiredItems() {
        return inventoryItemRepository.findExpiredItems().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public RecipeAvailabilityDTO checkAvailability(Long recipeId, int requestedServings) {
        var recipe = recipeRepository.findById(recipeId)
                .orElseThrow(() -> new ResourceNotFoundException("Recipe not found: " + recipeId));

        double scale = scale(recipe.getServings(), requestedServings);
        List<String> insufficient = new ArrayList<>();
        List<String> missing = new ArrayList<>();

        for (RecipeIngredient ingredient : recipe.getIngredients()) {
            double needed = ingredient.getQuantity() * scale;
            List<InventoryItem> candidates = findCandidates(ingredient.getIngredientName());

            if (candidates.isEmpty()) {
                missing.add(ingredient.getIngredientName());
                continue;
            }

            Optional<InventoryItem> exactMatch = candidates.stream()
                    .filter(item -> item.getUnit().equalsIgnoreCase(ingredient.getUnit()))
                    .findFirst();

            if (exactMatch.isPresent()) {
                InventoryItem item = exactMatch.get();
                if (item.getQuantity() < (int) Math.ceil(needed)) {
                    insufficient.add(ingredient.getIngredientName()
                            + " (need " + (int) Math.ceil(needed) + " " + ingredient.getUnit()
                            + ", have " + item.getQuantity() + " " + item.getUnit() + ")");
                }
                continue;
            }

            Optional<InventoryItem> convertibleMatch = candidates.stream()
                    .filter(c -> convertUnit(needed, ingredient.getUnit(), c.getUnit()).isPresent())
                    .findFirst();

            if (convertibleMatch.isPresent()) {
                InventoryItem item = convertibleMatch.get();
                int convertedNeeded = Math.max(1, (int) Math.ceil(
                        convertUnit(needed, ingredient.getUnit(), item.getUnit()).getAsDouble()));
                if (item.getQuantity() < convertedNeeded) {
                    insufficient.add(ingredient.getIngredientName()
                            + " (need " + convertedNeeded + " " + item.getUnit()
                            + ", have " + item.getQuantity() + " " + item.getUnit() + ")");
                }
                continue;
            }

            // Approximation fallback: always deduct 1, so available if quantity >= 1
            if (candidates.get(0).getQuantity() < 1) {
                missing.add(ingredient.getIngredientName());
            }
        }

        return RecipeAvailabilityDTO.builder()
                .canCook(insufficient.isEmpty() && missing.isEmpty())
                .insufficientIngredients(insufficient)
                .missingIngredients(missing)
                .build();
    }

    public CookResultDTO cookRecipe(Long recipeId, int requestedServings) {
        var recipe = recipeRepository.findById(recipeId)
                .orElseThrow(() -> new ResourceNotFoundException("Recipe not found: " + recipeId));

        double scale = scale(recipe.getServings(), requestedServings);
        List<String> consumed = new ArrayList<>();
        List<String> unmatched = new ArrayList<>();

        for (RecipeIngredient ingredient : recipe.getIngredients()) {
            double scaledQuantity = ingredient.getQuantity() * scale;
            List<InventoryItem> candidates = findCandidates(ingredient.getIngredientName());

            if (candidates.isEmpty()) {
                unmatched.add(ingredient.getIngredientName());
                continue;
            }

            Optional<InventoryItem> exactMatch = candidates.stream()
                    .filter(item -> item.getUnit().equalsIgnoreCase(ingredient.getUnit()))
                    .findFirst();

            InventoryItem item;
            int toDeduct;
            boolean approximated = false;

            if (exactMatch.isPresent()) {
                item = exactMatch.get();
                toDeduct = (int) Math.ceil(scaledQuantity);
            } else {
                Optional<InventoryItem> convertibleMatch = candidates.stream()
                        .filter(c -> convertUnit(scaledQuantity, ingredient.getUnit(), c.getUnit()).isPresent())
                        .findFirst();

                if (convertibleMatch.isPresent()) {
                    item = convertibleMatch.get();
                    double converted = convertUnit(scaledQuantity, ingredient.getUnit(), item.getUnit()).getAsDouble();
                    toDeduct = Math.max(1, (int) Math.ceil(converted));
                } else {
                    item = candidates.get(0);
                    toDeduct = 1;
                    approximated = true;
                }
            }

            int remaining = item.getQuantity() - toDeduct;
            String suffix = approximated ? " (unit approximated)" : "";

            if (remaining <= 0) {
                inventoryItemRepository.delete(item);
                consumed.add(item.getName() + " (fully used — removed" + suffix + ")");
            } else {
                item.setQuantity(remaining);
                inventoryItemRepository.save(item);
                consumed.add(item.getName() + ": −" + toDeduct + " " + item.getUnit() + suffix);
            }
        }

        return CookResultDTO.builder()
                .consumed(consumed)
                .unmatched(unmatched)
                .build();
    }

    private List<InventoryItem> findCandidates(String ingredientName) {
        List<InventoryItem> candidates = inventoryItemRepository.findByNameContainingIgnoreCase(ingredientName);
        if (candidates.isEmpty()) {
            String lower = ingredientName.toLowerCase();
            candidates = inventoryItemRepository.findAll().stream()
                    .filter(item -> lower.contains(item.getName().toLowerCase()))
                    .collect(Collectors.toList());
        }
        return candidates;
    }

    private static double scale(Integer baseServings, int requestedServings) {
        int base = (baseServings != null && baseServings > 0) ? baseServings : 1;
        return (double) requestedServings / base;
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
        if (dto.getQuantity() == null || dto.getQuantity() <= 0) {
            throw new BadRequestException("Quantity must be greater than 0");
        }
        if (dto.getUnit() == null || dto.getUnit().isBlank()) {
            throw new BadRequestException("Unit is required");
        }
    }

    private Location resolveLocation(String locationName) {
        return locationRepository.findByName(locationName)
                .orElseThrow(() -> new ResourceNotFoundException("Location not found: " + locationName));
    }
}
