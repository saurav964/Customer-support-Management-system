package com.support.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TicketReplyRequest {
    @NotBlank
    private String message;
}
