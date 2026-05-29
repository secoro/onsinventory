package nl.seanderoo.inventory.repository;

import nl.seanderoo.inventory.model.RecipeIngredient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RecipeIngredientRepository extends JpaRepository<RecipeIngredient, Long> {
    List<RecipeIngredient> findByRecipeId(Long recipeId);

    List<RecipeIngredient> findByIngredientNameIgnoreCase(String ingredientName);
}
