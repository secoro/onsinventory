package nl.seanderoo.inventory.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "locations", uniqueConstraints = @UniqueConstraint(columnNames = {"name", "household_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Location {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name; // "pantry", "fridge", "freezer"

    private String description;
    private String icon; // Optional emoji or icon identifier

    @ManyToOne(optional = false)
    @JoinColumn(name = "household_id")
    private Household household;

    public static Location pantry(Household household) {
        return Location.builder()
                .name("Pantry")
                .description("Pantry/dry storage")
                .icon("🗄️")
                .household(household)
                .build();
    }

    public static Location fridge(Household household) {
        return Location.builder()
                .name("Fridge")
                .description("Refrigerator")
                .icon("🧊")
                .household(household)
                .build();
    }

    public static Location freezer(Household household) {
        return Location.builder()
                .name("Freezer")
                .description("Freezer compartment")
                .icon("❄️")
                .household(household)
                .build();
    }
}
