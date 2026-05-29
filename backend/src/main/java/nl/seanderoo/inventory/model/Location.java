package nl.seanderoo.inventory.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "locations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Location {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name; // "pantry", "fridge", "freezer"

    private String description;
    private String icon; // Optional emoji or icon identifier

    public static Location pantry() {
        return Location.builder()
                .name("Pantry")
                .description("Pantry/dry storage")
                .icon("🗄️")
                .build();
    }

    public static Location fridge() {
        return Location.builder()
                .name("Fridge")
                .description("Refrigerator")
                .icon("🧊")
                .build();
    }

    public static Location freezer() {
        return Location.builder()
                .name("Freezer")
                .description("Freezer compartment")
                .icon("❄️")
                .build();
    }
}
