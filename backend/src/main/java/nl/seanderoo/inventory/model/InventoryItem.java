package nl.seanderoo.inventory.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "inventory_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String category; // vegetable, fruit, meat, dairy, spice, etc.

    @ManyToOne(optional = false)
    @JoinColumn(name = "location_id")
    private Location location;

    @Column(nullable = false)
    private Double quantity;

    @Column(nullable = false)
    private String unit; // "pieces", "grams", "ml", "liters", etc.

    private LocalDate expiryDate;

    private LocalDate addedDate;

    private boolean expired;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        addedDate = LocalDate.now();
        expired = false;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        expired = expiryDate != null && LocalDate.now().isAfter(expiryDate);
    }

    public boolean isExpiredOrExpiringSoon() {
        if (expiryDate == null) return false;
        LocalDate today = LocalDate.now();
        LocalDate soonThreshold = today.plusDays(3);
        return !today.isBefore(expiryDate.minusDays(3)) && !today.isAfter(expiryDate);
    }
}
