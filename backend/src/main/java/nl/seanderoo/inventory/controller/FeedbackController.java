package nl.seanderoo.inventory.controller;

import nl.seanderoo.inventory.dto.FeedbackRequestDTO;
import nl.seanderoo.inventory.exception.BadRequestException;
import nl.seanderoo.inventory.service.EmailService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/feedback")
public class FeedbackController {

    private static final int MAX_MESSAGE_LENGTH = 5000;

    private final EmailService emailService;

    public FeedbackController(EmailService emailService) {
        this.emailService = emailService;
    }

    // Deliberately ignores the authenticated principal: feedback is anonymous.
    @PostMapping
    public ResponseEntity<Void> submitFeedback(@RequestBody FeedbackRequestDTO request) {
        String message = request.getMessage() == null ? "" : request.getMessage().trim();
        if (message.isEmpty()) {
            throw new BadRequestException("Feedback message must not be empty");
        }
        if (message.length() > MAX_MESSAGE_LENGTH) {
            throw new BadRequestException("Feedback message must be at most " + MAX_MESSAGE_LENGTH + " characters");
        }
        emailService.sendFeedback(message);
        return ResponseEntity.noContent().build();
    }
}
