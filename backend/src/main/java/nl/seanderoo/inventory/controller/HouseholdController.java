package nl.seanderoo.inventory.controller;

import nl.seanderoo.inventory.dto.HouseholdDTO;
import nl.seanderoo.inventory.dto.HouseholdInvitePreviewDTO;
import nl.seanderoo.inventory.dto.HouseholdMemberDTO;
import nl.seanderoo.inventory.dto.InviteRequestDTO;
import nl.seanderoo.inventory.dto.RenameHouseholdRequestDTO;
import nl.seanderoo.inventory.model.Household;
import nl.seanderoo.inventory.model.HouseholdInvite;
import nl.seanderoo.inventory.model.User;
import nl.seanderoo.inventory.repository.UserRepository;
import nl.seanderoo.inventory.service.HouseholdService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/household")
@CrossOrigin(origins = "*", maxAge = 3600)
public class HouseholdController {

    private final HouseholdService householdService;
    private final UserRepository userRepository;

    public HouseholdController(HouseholdService householdService, UserRepository userRepository) {
        this.householdService = householdService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<HouseholdDTO> getCurrentHousehold(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(toDTO(user.getHousehold()));
    }

    @PutMapping
    public ResponseEntity<HouseholdDTO> renameHousehold(
            @AuthenticationPrincipal User user,
            @RequestBody RenameHouseholdRequestDTO request) {
        Household updated = householdService.renameHousehold(user.getHousehold(), request.getName());
        return ResponseEntity.ok(toDTO(updated));
    }

    @PostMapping("/invite")
    public ResponseEntity<Void> invite(@AuthenticationPrincipal User user, @RequestBody InviteRequestDTO request) {
        householdService.invite(user, request.getEmail());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/invite/{token}")
    public ResponseEntity<HouseholdInvitePreviewDTO> previewInvite(@PathVariable String token) {
        HouseholdInvite invite = householdService.getValidInvite(token);
        return ResponseEntity.ok(new HouseholdInvitePreviewDTO(invite.getHousehold().getName(), invite.getEmail()));
    }

    private HouseholdDTO toDTO(Household household) {
        List<HouseholdMemberDTO> members = userRepository.findByHouseholdId(household.getId()).stream()
                .map(u -> new HouseholdMemberDTO(u.getUsername(), u.getFirstName(), u.getLastName()))
                .toList();
        return new HouseholdDTO(household.getName(), members);
    }
}
