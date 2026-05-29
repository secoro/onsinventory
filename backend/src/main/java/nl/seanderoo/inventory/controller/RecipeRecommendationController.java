package nl.seanderoo.inventory.controller;

import nl.seanderoo.inventory.dto.RecipeRecommendationDTO;
import nl.seanderoo.inventory.service.RecipeRecommendationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recommendations")
@CrossOrigin(origins = "*", maxAge = 3600)
public class RecipeRecommendationController {

    private final RecipeRecommendationService recommendationService;

    public RecipeRecommendationController(RecipeRecommendationService recommendationService) {
        this.recommendationService = recommendationService;
    }

    @GetMapping
    public ResponseEntity<List<RecipeRecommendationDTO>> getRecommendations(
            @RequestParam(defaultValue = "10") Integer limit) {
        List<RecipeRecommendationDTO> recommendations = recommendationService.getRecommendations(limit);
        return ResponseEntity.ok(recommendations);
    }

    @GetMapping("/cuisine/{cuisine}")
    public ResponseEntity<List<RecipeRecommendationDTO>> getRecommendationsByCategory(
            @PathVariable String cuisine,
            @RequestParam(defaultValue = "10") Integer limit) {
        List<RecipeRecommendationDTO> recommendations = recommendationService.getRecommendationsByCategory(cuisine, limit);
        return ResponseEntity.ok(recommendations);
    }

    @GetMapping("/recipe/{recipeId}")
    public ResponseEntity<RecipeRecommendationDTO> getRecommendationForRecipe(@PathVariable Long recipeId) {
        RecipeRecommendationDTO recommendation = recommendationService.getRecommendationForRecipe(recipeId);
        return ResponseEntity.ok(recommendation);
    }

    @GetMapping("/expiring")
    public ResponseEntity<List<RecipeRecommendationDTO>> getRecipesUsingExpiringItems(
            @RequestParam(defaultValue = "5") Integer limit) {
        List<RecipeRecommendationDTO> recommendations = recommendationService.getRecipesUsingExpiringItems(limit);
        return ResponseEntity.ok(recommendations);
    }
}
