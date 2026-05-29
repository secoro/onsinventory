package nl.seanderoo.inventory.service;

import nl.seanderoo.inventory.dto.RecipeDTO;
import nl.seanderoo.inventory.model.Recipe;
import nl.seanderoo.inventory.repository.RecipeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class RecipeService {

    private final RecipeRepository recipeRepository;

    public RecipeService(RecipeRepository recipeRepository) {
        this.recipeRepository = recipeRepository;
    }

    public RecipeDTO addRecipe(RecipeDTO dto) {
        Recipe recipe = Recipe.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .instructions(dto.getInstructions())
                .servings(dto.getServings())
                .preparationTimeMinutes(dto.getPreparationTimeMinutes())
                .cookingTimeMinutes(dto.getCookingTimeMinutes())
                .difficulty(dto.getDifficulty())
                .cuisine(dto.getCuisine())
                .build();

        Recipe saved = recipeRepository.save(recipe);
        return toDTO(saved);
    }

    public RecipeDTO updateRecipe(Long id, RecipeDTO dto) {
        Recipe recipe = recipeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Recipe not found: " + id));

        if (dto.getName() != null) recipe.setName(dto.getName());
        if (dto.getDescription() != null) recipe.setDescription(dto.getDescription());
        if (dto.getInstructions() != null) recipe.setInstructions(dto.getInstructions());
        if (dto.getServings() != null) recipe.setServings(dto.getServings());
        if (dto.getPreparationTimeMinutes() != null) recipe.setPreparationTimeMinutes(dto.getPreparationTimeMinutes());
        if (dto.getCookingTimeMinutes() != null) recipe.setCookingTimeMinutes(dto.getCookingTimeMinutes());
        if (dto.getDifficulty() != null) recipe.setDifficulty(dto.getDifficulty());
        if (dto.getCuisine() != null) recipe.setCuisine(dto.getCuisine());

        Recipe updated = recipeRepository.save(recipe);
        return toDTO(updated);
    }

    public void deleteRecipe(Long id) {
        recipeRepository.deleteById(id);
    }

    public RecipeDTO getRecipe(Long id) {
        return recipeRepository.findById(id)
                .map(this::toDTO)
                .orElseThrow(() -> new RuntimeException("Recipe not found: " + id));
    }

    public List<RecipeDTO> getAllRecipes() {
        return recipeRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<RecipeDTO> getRecipesByDifficulty(String difficulty) {
        return recipeRepository.findByDifficulty(difficulty).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<RecipeDTO> getRecipesByCuisine(String cuisine) {
        return recipeRepository.findByCuisine(cuisine).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<RecipeDTO> searchRecipes(String query) {
        return recipeRepository.findByNameContainingIgnoreCase(query).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    private RecipeDTO toDTO(Recipe recipe) {
        return RecipeDTO.builder()
                .id(recipe.getId())
                .name(recipe.getName())
                .description(recipe.getDescription())
                .instructions(recipe.getInstructions())
                .servings(recipe.getServings())
                .preparationTimeMinutes(recipe.getPreparationTimeMinutes())
                .cookingTimeMinutes(recipe.getCookingTimeMinutes())
                .difficulty(recipe.getDifficulty())
                .cuisine(recipe.getCuisine())
                .build();
    }
}
