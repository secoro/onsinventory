package nl.seanderoo.inventory.controller;

import nl.seanderoo.inventory.dto.ChangePasswordDTO;
import nl.seanderoo.inventory.dto.ForgotPasswordRequestDTO;
import nl.seanderoo.inventory.dto.LoginRequestDTO;
import nl.seanderoo.inventory.dto.LoginResponseDTO;
import nl.seanderoo.inventory.dto.RegisterRequestDTO;
import nl.seanderoo.inventory.dto.ResetPasswordRequestDTO;
import nl.seanderoo.inventory.model.User;
import nl.seanderoo.inventory.service.JwtService;
import nl.seanderoo.inventory.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AuthController {

    @Value("${app.security.enabled:true}")
    private boolean securityEnabled;

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserService userService;

    public AuthController(AuthenticationManager authenticationManager, JwtService jwtService, UserService userService) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.userService = userService;
    }

    @GetMapping("/config")
    public ResponseEntity<Map<String, Boolean>> config() {
        return ResponseEntity.ok(Map.of("securityEnabled", securityEnabled));
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponseDTO> login(@RequestBody LoginRequestDTO request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );
        User user = (User) userService.loadUserByUsername(request.getUsername());
        String token = jwtService.generateToken(user);
        return ResponseEntity.ok(toLoginResponse(user, token));
    }

    @PostMapping("/register")
    public ResponseEntity<LoginResponseDTO> register(@RequestBody RegisterRequestDTO request) {
        User user = userService.register(request);
        String token = jwtService.generateToken(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(toLoginResponse(user, token));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Void> forgotPassword(@RequestBody ForgotPasswordRequestDTO request) {
        userService.requestPasswordReset(request.getEmail());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@RequestBody ResetPasswordRequestDTO request) {
        userService.resetPassword(request.getToken(), request.getNewPassword());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<LoginResponseDTO> me(@AuthenticationPrincipal UserDetails userDetails) {
        User user = (User) userDetails;
        return ResponseEntity.ok(toLoginResponse(user, null));
    }

    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(
            @RequestBody ChangePasswordDTO request,
            @AuthenticationPrincipal UserDetails userDetails) {
        userService.changePassword(userDetails.getUsername(), request.getCurrentPassword(), request.getNewPassword());
        return ResponseEntity.noContent().build();
    }

    private LoginResponseDTO toLoginResponse(User user, String token) {
        return LoginResponseDTO.builder()
                .token(token)
                .username(user.getUsername())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .householdName(user.getHousehold().getName())
                .build();
    }
}
