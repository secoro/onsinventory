package nl.seanderoo.inventory.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryItemDTO {
    private Long id;
    private String name;
    private String category;
    private String location;
    private Integer quantity;
    private String unit;
    private LocalDate expiryDate;
    private LocalDate addedDate;
    private boolean expired;
    private boolean expiringsoon;
    private String notes;
}
