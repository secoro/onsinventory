package nl.seanderoo.inventory.repository;

import nl.seanderoo.inventory.model.InventoryItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface InventoryItemRepository extends JpaRepository<InventoryItem, Long> {
    List<InventoryItem> findByHouseholdId(Long householdId);

    Optional<InventoryItem> findByIdAndHouseholdId(Long id, Long householdId);

    List<InventoryItem> findByLocationIdAndHouseholdId(Long locationId, Long householdId);

    List<InventoryItem> findByCategoryAndHouseholdId(String category, Long householdId);

    Optional<InventoryItem> findByNameIgnoreCaseAndHouseholdId(String name, Long householdId);

    List<InventoryItem> findByNameContainingIgnoreCaseAndHouseholdId(String name, Long householdId);

    @Query("SELECT i FROM InventoryItem i WHERE i.household.id = :householdId AND i.expired = true")
    List<InventoryItem> findExpiredItems(Long householdId);

    @Query("SELECT i FROM InventoryItem i WHERE i.household.id = :householdId AND i.expiryDate IS NOT NULL AND i.expiryDate > :today AND i.expiryDate <= :soon")
    List<InventoryItem> findExpiringSoonItems(Long householdId, LocalDate today, LocalDate soon);
}
