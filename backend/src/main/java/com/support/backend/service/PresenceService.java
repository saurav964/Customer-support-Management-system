package com.support.backend.service;

import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PresenceService {

    private record ViewerEntry(String email, String name, LocalDateTime lastSeen) {}

    private final Map<Long, Map<String, ViewerEntry>> presence = new ConcurrentHashMap<>();

    public void heartbeat(Long ticketId, String agentEmail, String agentName) {
        presence.computeIfAbsent(ticketId, k -> new ConcurrentHashMap<>())
                .put(agentEmail, new ViewerEntry(agentEmail, agentName, LocalDateTime.now()));
    }

    public List<Map<String, String>> getViewers(Long ticketId, String excludeEmail) {
        Map<String, ViewerEntry> viewers = presence.getOrDefault(ticketId, Map.of());
        LocalDateTime cutoff = LocalDateTime.now().minusSeconds(15);
        List<Map<String, String>> result = new ArrayList<>();
        for (ViewerEntry entry : viewers.values()) {
            if (!entry.email().equals(excludeEmail) && entry.lastSeen().isAfter(cutoff)) {
                Map<String, String> v = new HashMap<>();
                v.put("email", entry.email());
                v.put("name", entry.name());
                result.add(v);
            }
        }
        return result;
    }
}
