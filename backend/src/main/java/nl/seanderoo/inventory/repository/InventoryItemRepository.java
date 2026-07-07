package nl.seanderoo.inventory.repository;

import nl.seanderoo.inventory.model.InventoryItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InventoryItemRepository extends JpaRepository<InventoryItem, Long> {
    List<InventoryItem> findByHouseholdId(Long householdId);

    Optional<InventoryItem> findByIdAndHouseholdId(Long id, Long householdId);

    List<InventoryItem> findByNameContainingIgnoreCaseAndHouseholdId(String name, Long householdId);
}
