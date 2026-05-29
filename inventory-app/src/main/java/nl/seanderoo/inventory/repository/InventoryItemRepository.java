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
    List<InventoryItem> findByLocationId(Long locationId);

    List<InventoryItem> findByCategory(String category);

    Optional<InventoryItem> findByNameIgnoreCase(String name);

    @Query("SELECT i FROM InventoryItem i WHERE i.expiryDate IS NOT NULL AND i.expiryDate <= :date")
    List<InventoryItem> findExpiringItems(LocalDate date);

    @Query("SELECT i FROM InventoryItem i WHERE i.expired = true")
    List<InventoryItem> findExpiredItems();

    @Query("SELECT i FROM InventoryItem i WHERE i.expiryDate IS NOT NULL AND i.expiryDate > :today AND i.expiryDate <= :soon")
    List<InventoryItem> findExpiringSoonItems(LocalDate today, LocalDate soon);

    List<InventoryItem> findByNameContainingIgnoreCase(String name);
}
