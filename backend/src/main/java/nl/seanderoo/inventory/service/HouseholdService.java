package nl.seanderoo.inventory.service;

import nl.seanderoo.inventory.exception.BadRequestException;
import nl.seanderoo.inventory.exception.ResourceNotFoundException;
import nl.seanderoo.inventory.model.Household;
import nl.seanderoo.inventory.model.HouseholdInvite;
import nl.seanderoo.inventory.model.Location;
import nl.seanderoo.inventory.model.User;
import nl.seanderoo.inventory.repository.HouseholdInviteRepository;
import nl.seanderoo.inventory.repository.HouseholdRepository;
import nl.seanderoo.inventory.repository.InventoryItemRepository;
import nl.seanderoo.inventory.repository.LocationRepository;
import nl.seanderoo.inventory.repository.RecipeRepository;
import nl.seanderoo.inventory.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class HouseholdService {

    private static final int INVITE_EXPIRY_DAYS = 7;

    private final HouseholdRepository householdRepository;
    private final HouseholdInviteRepository householdInviteRepository;
    private final LocationRepository locationRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final RecipeRepository recipeRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    public HouseholdService(HouseholdRepository householdRepository,
                             HouseholdInviteRepository householdInviteRepository,
                             LocationRepository locationRepository,
                             InventoryItemRepository inventoryItemRepository,
                             RecipeRepository recipeRepository,
                             UserRepository userRepository,
                             EmailService emailService) {
        this.householdRepository = householdRepository;
        this.householdInviteRepository = householdInviteRepository;
        this.locationRepository = locationRepository;
        this.inventoryItemRepository = inventoryItemRepository;
        this.recipeRepository = recipeRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
    }

    public Household createHouseholdWithDefaultLocations(String ownerFirstName) {
        Household household = householdRepository.save(Household.builder().name(nameFor(List.of(ownerFirstName))).build());
        locationRepository.save(Location.pantry(household));
        locationRepository.save(Location.fridge(household));
        locationRepository.save(Location.freezer(household));
        return household;
    }

    /**
     * Recomputes the household's name from its current members' first names
     * (e.g. "Sean & Natalia's Household", "Sean, Natalia & Ciaran's Household"),
     * so it never goes stale as people join or leave. Call this after any
     * membership change. A no-op if the household has no members left (it's
     * about to be deleted in that case).
     */
    public void regenerateName(Household household) {
        List<User> members = userRepository.findByHouseholdId(household.getId()).stream()
                .sorted(Comparator.comparing(User::getId))
                .toList();
        if (members.isEmpty()) {
            return;
        }
        household.setName(nameFor(members.stream().map(User::getFirstName).toList()));
        householdRepository.save(household);
    }

    private String nameFor(List<String> firstNames) {
        String joinedNames = firstNames.size() == 1
                ? firstNames.get(0)
                : String.join(", ", firstNames.subList(0, firstNames.size() - 1)) + " & " + firstNames.get(firstNames.size() - 1);
        return joinedNames + "'s Household";
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

    /**
     * Wipes everything that belongs to a household - inventory, recipes (and their
     * ingredients, via JPA cascade), locations, and pending invites - before removing
     * the household itself. Only call this once the last member has been removed.
     */
    public void deleteHouseholdAndData(Household household) {
        inventoryItemRepository.deleteAll(inventoryItemRepository.findByHouseholdId(household.getId()));
        recipeRepository.deleteAll(recipeRepository.findAllByHouseholdId(household.getId()));
        locationRepository.deleteAll(locationRepository.findAllByHouseholdId(household.getId()));
        householdInviteRepository.deleteAll(householdInviteRepository.findAllByHouseholdId(household.getId()));
        householdRepository.delete(household);
    }
}
