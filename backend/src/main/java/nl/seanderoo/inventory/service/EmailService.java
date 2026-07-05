package nl.seanderoo.inventory.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.Map;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final RestClient restClient;
    private final String fromAddress;
    private final String frontendUrl;

    public EmailService(
            @Value("${app.resend.api-key:}") String apiKey,
            @Value("${app.mail.from:onsinventory@onsinventory.com}") String fromAddress,
            @Value("${app.frontend-url:https://onsinventory.com}") String frontendUrl
    ) {
        this.fromAddress = fromAddress;
        this.frontendUrl = frontendUrl;
        this.restClient = RestClient.builder()
                .baseUrl("https://api.resend.com")
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .build();
    }

    public void sendPasswordReset(String toEmail, String firstName, String token) {
        String link = frontendUrl + "/reset-password?token=" + token;
        String html = "<p>Hi " + firstName + ",</p>"
                + "<p>Click the link below to reset your OnsInventory password. This link expires in 1 hour.</p>"
                + "<p><a href=\"" + link + "\">" + link + "</a></p>"
                + "<p>If you didn't request this, you can safely ignore this email.</p>";
        send(toEmail, "Reset your OnsInventory password", html);
    }

    public void sendHouseholdInvite(String toEmail, String inviterFirstName, String householdName, String token) {
        String link = frontendUrl + "/join?token=" + token;
        String html = "<p>" + inviterFirstName + " invited you to join \"" + householdName + "\" on OnsInventory.</p>"
                + "<p><a href=\"" + link + "\">" + link + "</a></p>"
                + "<p>This invite expires in 7 days.</p>";
        send(toEmail, inviterFirstName + " invited you to OnsInventory", html);
    }

    private void send(String to, String subject, String html) {
        try {
            restClient.post()
                    .uri("/emails")
                    .body(Map.of(
                            "from", fromAddress,
                            "to", List.of(to),
                            "subject", subject,
                            "html", html
                    ))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException e) {
            log.warn("Failed to send email to {}: {}", to, e.getMessage());
        }
    }
}
