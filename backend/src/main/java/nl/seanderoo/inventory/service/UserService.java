package nl.seanderoo.inventory.service;

import nl.seanderoo.inventory.dto.RegisterRequestDTO;
import nl.seanderoo.inventory.exception.BadRequestException;
import nl.seanderoo.inventory.exception.ResourceNotFoundException;
import nl.seanderoo.inventory.model.Household;
import nl.seanderoo.inventory.model.HouseholdInvite;
import nl.seanderoo.inventory.model.PasswordResetToken;
import nl.seanderoo.inventory.model.User;
import nl.seanderoo.inventory.repository.PasswordResetTokenRepository;
import nl.seanderoo.inventory.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@Transactional
public class UserService implements UserDetailsService {

    private static final int RESET_TOKEN_EXPIRY_MINUTES = 60;
    private static final int MIN_PASSWORD_LENGTH = 8;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final HouseholdService householdService;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailService emailService;

    public UserService(UserRepository userRepository,
                        PasswordEncoder passwordEncoder,
                        HouseholdService householdService,
                        PasswordResetTokenRepository passwordResetTokenRepository,
                        EmailService emailService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.householdService = householdService;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.emailService = emailService;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
    }

    public void changePassword(String username, String currentPassword, String newPassword) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new BadRequestException("Current password is incorrect");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    public User register(RegisterRequestDTO request) {
        if (request.getUsername() == null || request.getUsername().isBlank()) {
            throw new BadRequestException("Username is required");
        }
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new BadRequestException("Email is required");
        }
        if (request.getFirstName() == null || request.getFirstName().isBlank()) {
            throw new BadRequestException("First name is required");
        }
        if (request.getLastName() == null || request.getLastName().isBlank()) {
            throw new BadRequestException("Last name is required");
        }
        if (request.getPassword() == null || request.getPassword().length() < MIN_PASSWORD_LENGTH) {
            throw new BadRequestException("Password must be at least " + MIN_PASSWORD_LENGTH + " characters");
        }
        if (userRepository.findByUsername(request.getUsername().trim()).isPresent()) {
            throw new BadRequestException("Username is already taken");
        }
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        if (userRepository.findByEmail(normalizedEmail).isPresent()) {
            throw new BadRequestException("An account with this email already exists");
        }

        Household household;
        HouseholdInvite invite = null;
        if (request.getInviteToken() != null && !request.getInviteToken().isBlank()) {
            invite = householdService.getValidInvite(request.getInviteToken());
            household = invite.getHousehold();
        } else {
            household = householdService.createHouseholdWithDefaultLocations(request.getFirstName() + "'s Household");
        }

        User user = userRepository.save(User.builder()
                .username(request.getUsername().trim())
                .email(normalizedEmail)
                .firstName(request.getFirstName().trim())
                .lastName(request.getLastName().trim())
                .password(passwordEncoder.encode(request.getPassword()))
                .household(household)
                .build());

        if (invite != null) {
            householdService.markAccepted(invite);
        }

        return user;
    }

    public void requestPasswordReset(String email) {
        if (email == null || email.isBlank()) {
            return;
        }
        userRepository.findByEmail(email.trim().toLowerCase()).ifPresent(user -> {
            PasswordResetToken resetToken = passwordResetTokenRepository.save(PasswordResetToken.builder()
                    .user(user)
                    .token(UUID.randomUUID().toString())
                    .expiresAt(LocalDateTime.now().plusMinutes(RESET_TOKEN_EXPIRY_MINUTES))
                    .build());
            emailService.sendPasswordReset(user.getEmail(), user.getFirstName(), resetToken.getToken());
        });
        // Always returns normally, regardless of whether the email matched a user,
        // so callers can't use response behavior to enumerate registered accounts.
    }

    public void deleteAccount(String username, String password) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new BadRequestException("Password is incorrect");
        }

        Household household = user.getHousehold();

        passwordResetTokenRepository.deleteAll(passwordResetTokenRepository.findAllByUserId(user.getId()));
        userRepository.delete(user);

        boolean householdStillHasMembers = !userRepository.findByHouseholdId(household.getId()).isEmpty();
        if (!householdStillHasMembers) {
            householdService.deleteHouseholdAndData(household);
        }
    }

    public void resetPassword(String token, String newPassword) {
        if (newPassword == null || newPassword.length() < MIN_PASSWORD_LENGTH) {
            throw new BadRequestException("Password must be at least " + MIN_PASSWORD_LENGTH + " characters");
        }

        PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(token)
                .filter(PasswordResetToken::isValid)
                .orElseThrow(() -> new BadRequestException("This reset link is invalid or has expired"));

        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        resetToken.setUsedAt(LocalDateTime.now());
        passwordResetTokenRepository.save(resetToken);
    }
}
