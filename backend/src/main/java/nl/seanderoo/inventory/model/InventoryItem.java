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

    @ManyToOne(optional = false)
    @JoinColumn(name = "household_id")
    private Household household;

    @Column(nullable = false)
    private Double quantity;

    @Column(nullable = false)
    private String unit; // "pieces", "grams", "ml", "liters", etc.

    private LocalDate expiryDate;

    private LocalDate addedDate;

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
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public boolean isExpired() {
        return expiryDate != null && expiryDate.isBefore(LocalDate.now());
    }

    /** True from three days before the expiry date up to and including the date itself. */
    public boolean isExpiringSoon() {
        if (expiryDate == null) return false;
        LocalDate today = LocalDate.now();
        return !today.isBefore(expiryDate.minusDays(3)) && !today.isAfter(expiryDate);
    }
}
