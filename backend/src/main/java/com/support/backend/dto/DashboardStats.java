package com.support.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
public class DashboardStats {
    private long totalTickets;
    private long openTickets;
    private long resolvedTickets;
    private long closedTickets;
    private long overdueTickets;
    private long aiResolvedTickets;
    private Map<String, Long> byStatus;
    private Map<String, Long> byCategory;
}
