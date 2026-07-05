package nl.seanderoo.inventory.repository;

import nl.seanderoo.inventory.model.Recipe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RecipeRepository extends JpaRepository<Recipe, Long> {
    List<Recipe> findAllByHouseholdId(Long householdId);

    Optional<Recipe> findByIdAndHouseholdId(Long id, Long householdId);

    List<Recipe> findByDifficultyAndHouseholdId(String difficulty, Long householdId);

    List<Recipe> findByCuisineAndHouseholdId(String cuisine, Long householdId);

    List<Recipe> findByNameContainingIgnoreCaseAndHouseholdId(String name, Long householdId);
}
