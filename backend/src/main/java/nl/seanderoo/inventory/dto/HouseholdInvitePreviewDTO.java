package nl.seanderoo.inventory.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class HouseholdInvitePreviewDTO {
    private String householdName;
    private String email;
}
