package nl.seanderoo.inventory.controller;

import nl.seanderoo.inventory.dto.CookRequestDTO;
import nl.seanderoo.inventory.dto.CookResultDTO;
import nl.seanderoo.inventory.dto.RecipeAvailabilityDTO;
import nl.seanderoo.inventory.dto.RecipeDTO;
import nl.seanderoo.inventory.service.InventoryService;
import nl.seanderoo.inventory.service.RecipeService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recipes")
@CrossOrigin(origins = "*", maxAge = 3600)
public class RecipeController {

    private final RecipeService recipeService;
    private final InventoryService inventoryService;

    public RecipeController(RecipeService recipeService, InventoryService inventoryService) {
        this.recipeService = recipeService;
        this.inventoryService = inventoryService;
    }

    @PostMapping
    public ResponseEntity<RecipeDTO> addRecipe(@RequestBody RecipeDTO dto) {
        RecipeDTO created = recipeService.addRecipe(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/{id}")
    public ResponseEntity<RecipeDTO> getRecipe(@PathVariable Long id) {
        RecipeDTO recipe = recipeService.getRecipe(id);
        return ResponseEntity.ok(recipe);
    }

    @GetMapping
    public ResponseEntity<List<RecipeDTO>> getAllRecipes() {
        List<RecipeDTO> recipes = recipeService.getAllRecipes();
        return ResponseEntity.ok(recipes);
    }

    @GetMapping("/difficulty/{difficulty}")
    public ResponseEntity<List<RecipeDTO>> getRecipesByDifficulty(@PathVariable String difficulty) {
        List<RecipeDTO> recipes = recipeService.getRecipesByDifficulty(difficulty);
        return ResponseEntity.ok(recipes);
    }

    @GetMapping("/cuisine/{cuisine}")
    public ResponseEntity<List<RecipeDTO>> getRecipesByCuisine(@PathVariable String cuisine) {
        List<RecipeDTO> recipes = recipeService.getRecipesByCuisine(cuisine);
        return ResponseEntity.ok(recipes);
    }

    @GetMapping("/search")
    public ResponseEntity<List<RecipeDTO>> searchRecipes(@RequestParam String q) {
        List<RecipeDTO> recipes = recipeService.searchRecipes(q);
        return ResponseEntity.ok(recipes);
    }

    @PutMapping("/{id}")
    public ResponseEntity<RecipeDTO> updateRecipe(@PathVariable Long id, @RequestBody RecipeDTO dto) {
        RecipeDTO updated = recipeService.updateRecipe(id, dto);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRecipe(@PathVariable Long id) {
        recipeService.deleteRecipe(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/availability")
    public ResponseEntity<RecipeAvailabilityDTO> checkAvailability(
            @PathVariable Long id,
            @RequestParam(defaultValue = "1") int servings) {
        return ResponseEntity.ok(inventoryService.checkAvailability(id, servings));
    }

    @PostMapping("/{id}/cook")
    public ResponseEntity<CookResultDTO> cookRecipe(
            @PathVariable Long id,
            @RequestBody(required = false) CookRequestDTO request) {
        int servings = (request != null && request.getServings() > 0) ? request.getServings() : 1;
        List<String> skipped = (request != null && request.getSkippedIngredients() != null)
                ? request.getSkippedIngredients()
                : List.of();
        return ResponseEntity.ok(inventoryService.cookRecipe(id, servings, skipped));
    }
}
