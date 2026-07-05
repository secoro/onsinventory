package nl.seanderoo.inventory.service;

import nl.seanderoo.inventory.exception.BadRequestException;
import nl.seanderoo.inventory.exception.ResourceNotFoundException;
import nl.seanderoo.inventory.model.Household;
import nl.seanderoo.inventory.model.HouseholdInvite;
import nl.seanderoo.inventory.model.Location;
import nl.seanderoo.inventory.model.User;
import nl.seanderoo.inventory.repository.HouseholdInviteRepository;
import nl.seanderoo.inventory.repository.HouseholdRepository;
import nl.seanderoo.inventory.repository.LocationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@Transactional
public class HouseholdService {

    private static final int INVITE_EXPIRY_DAYS = 7;

    private final HouseholdRepository householdRepository;
    private final HouseholdInviteRepository householdInviteRepository;
    private final LocationRepository locationRepository;
    private final EmailService emailService;

    public HouseholdService(HouseholdRepository householdRepository,
                             HouseholdInviteRepository householdInviteRepository,
                             LocationRepository locationRepository,
                             EmailService emailService) {
        this.householdRepository = householdRepository;
        this.householdInviteRepository = householdInviteRepository;
        this.locationRepository = locationRepository;
        this.emailService = emailService;
    }

    public Household createHouseholdWithDefaultLocations(String name) {
        Household household = householdRepository.save(Household.builder().name(name).build());
        locationRepository.save(Location.pantry(household));
        locationRepository.save(Location.fridge(household));
        locationRepository.save(Location.freezer(household));
        return household;
    }

    public HouseholdInvite invite(User inviter, String email) {
        if (email == null || email.isBlank()) {
            throw new BadRequestException("Email is required");
        }

        HouseholdInvite invite = householdInviteRepository.save(HouseholdInvite.builder()
                .household(inviter.getHousehold())
                .email(email.trim().toLowerCase())
                .token(UUID.randomUUID().toString())
                .invitedBy(inviter.getUsername())
                .expiresAt(LocalDateTime.now().plusDays(INVITE_EXPIRY_DAYS))
                .build());

        emailService.sendHouseholdInvite(
                invite.getEmail(),
                inviter.getFirstName(),
                inviter.getHousehold().getName(),
                invite.getToken()
        );

        return invite;
    }

    public HouseholdInvite getValidInvite(String token) {
        HouseholdInvite invite = householdInviteRepository.findByToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Invite not found or expired"));
        if (!invite.isValid()) {
            throw new ResourceNotFoundException("Invite not found or expired");
        }
        return invite;
    }

    public void markAccepted(HouseholdInvite invite) {
        invite.setAcceptedAt(LocalDateTime.now());
        householdInviteRepository.save(invite);
    }
}
