package nl.seanderoo.inventory.controller;

import nl.seanderoo.inventory.dto.RecipeRecommendationDTO;
import nl.seanderoo.inventory.service.RecipeRecommendationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/recommendations")
public class RecipeRecommendationController {

    private final RecipeRecommendationService recommendationService;

    public RecipeRecommendationController(RecipeRecommendationService recommendationService) {
        this.recommendationService = recommendationService;
    }

    @GetMapping
    public ResponseEntity<List<RecipeRecommendationDTO>> getRecommendations(
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(recommendationService.getRecommendations(limit));
    }
}
