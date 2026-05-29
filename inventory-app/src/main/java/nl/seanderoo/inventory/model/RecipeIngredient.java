package nl.seanderoo.inventory.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "recipe_ingredients")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecipeIngredient {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "recipe_id")
    private Recipe recipe;

    @Column(nullable = false)
    private String ingredientName;

    @Column(nullable = false)
    private Double quantity;

    @Column(nullable = false)
    private String unit; // "grams", "ml", "pieces", "cups", etc.

    private boolean optional;

    private String notes;
}
