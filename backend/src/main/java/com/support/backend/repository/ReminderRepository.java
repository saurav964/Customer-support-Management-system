package com.support.backend.repository;

import com.support.backend.model.Reminder;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface ReminderRepository extends JpaRepository<Reminder, Long> {
    List<Reminder> findByTicketId(Long ticketId);
    List<Reminder> findBySentFalseAndRemindAtBefore(LocalDateTime now);
}
