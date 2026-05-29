package nl.seanderoo.inventory.repository;

import nl.seanderoo.inventory.model.Recipe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RecipeRepository extends JpaRepository<Recipe, Long> {
    Optional<Recipe> findByNameIgnoreCase(String name);

    List<Recipe> findByDifficulty(String difficulty);

    List<Recipe> findByCuisine(String cuisine);

    List<Recipe> findByNameContainingIgnoreCase(String name);
}
