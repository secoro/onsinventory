package nl.seanderoo.inventory.service;

import nl.seanderoo.inventory.model.Household;
import nl.seanderoo.inventory.model.User;
import nl.seanderoo.inventory.repository.HouseholdRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class CurrentHouseholdProvider {

    private final HouseholdRepository householdRepository;

    public CurrentHouseholdProvider(HouseholdRepository householdRepository) {
        this.householdRepository = householdRepository;
    }

    public Long getHouseholdId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            return user.getHousehold().getId();
        }

        // app.security.enabled=false (local dev without auth) - only one household is ever seeded there
        return householdRepository.findAll().stream()
                .findFirst()
                .map(Household::getId)
                .orElseThrow(() -> new IllegalStateException("No household exists"));
    }

    public Household getHousehold() {
        return householdRepository.getReferenceById(getHouseholdId());
    }
}
