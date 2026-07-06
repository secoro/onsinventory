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
            @Value("${app.mail.from:noreply@onsinventory.com}") String fromAddress,
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
        String body = "<p style=\"margin:0 0 16px;\">Hi " + escape(firstName) + ",</p>"
                + "<p style=\"margin:0 0 24px;\">Click the button below to reset your OnsInventory password. "
                + "This link expires in <strong>1 hour</strong>.</p>"
                + button(link, "Reset password")
                + "<p style=\"margin:24px 0 0;color:#64748b;font-size:14px;\">"
                + "If you didn't request this, you can safely ignore this email — your password won't be changed.</p>";
        send(toEmail, "Reset your OnsInventory password", wrap("Reset your password", body, link));
    }

    public void sendHouseholdInvite(String toEmail, String inviterFirstName, String householdName, String token) {
        String link = frontendUrl + "/join?token=" + token;
        String body = "<p style=\"margin:0 0 24px;\"><strong>" + escape(inviterFirstName) + "</strong> invited you to join "
                + "<strong>\"" + escape(householdName) + "\"</strong> on OnsInventory.</p>"
                + button(link, "Join household")
                + "<p style=\"margin:24px 0 0;color:#64748b;font-size:14px;\">This invite expires in 7 days.</p>";
        send(toEmail, inviterFirstName + " invited you to OnsInventory", wrap("You're invited", body, link));
    }

    private static String escape(String value) {
        return value == null ? "" : value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    private static String button(String href, String label) {
        return "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">"
                + "<tr><td style=\"border-radius:8px;background-color:#2563eb;\">"
                + "<a href=\"" + href + "\" target=\"_blank\" "
                + "style=\"display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;"
                + "color:#ffffff;text-decoration:none;border-radius:8px;\">" + label + "</a>"
                + "</td></tr></table>";
    }

    private static String wrap(String heading, String bodyHtml, String fallbackLink) {
        return "<!DOCTYPE html>"
                + "<html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
                + "<title>OnsInventory</title></head>"
                + "<body style=\"margin:0;padding:0;background-color:#f8fafc;"
                + "font-family:Inter,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;\">"
                + "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" "
                + "style=\"background-color:#f8fafc;padding:32px 16px;\"><tr><td align=\"center\">"
                + "<table role=\"presentation\" width=\"480\" cellpadding=\"0\" cellspacing=\"0\" "
                + "style=\"max-width:480px;width:100%;\">"
                + "<tr><td style=\"padding:0 8px 24px;\">"
                + "<span style=\"font-size:20px;font-weight:700;color:#0f172a;\">OnsInventory</span>"
                + "</td></tr>"
                + "<tr><td style=\"background-color:#ffffff;border-radius:12px;padding:32px;"
                + "box-shadow:0 1px 3px rgba(15,23,42,0.08);\">"
                + "<h1 style=\"margin:0 0 16px;font-size:20px;font-weight:700;color:#0f172a;\">" + heading + "</h1>"
                + bodyHtml
                + "<p style=\"margin:24px 0 0;font-size:13px;color:#94a3b8;word-break:break-all;\">"
                + "Or copy this link into your browser:<br><a href=\"" + fallbackLink + "\" "
                + "style=\"color:#2563eb;\">" + fallbackLink + "</a></p>"
                + "</td></tr>"
                + "<tr><td style=\"padding:24px 8px 0;text-align:center;font-size:12px;color:#94a3b8;\">"
                + "OnsInventory &middot; This is an automated message, please don't reply to this email."
                + "</td></tr>"
                + "</table></td></tr></table></body></html>";
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
