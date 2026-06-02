package com.support.backend.repository;

import com.support.backend.model.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Map;

public interface TicketRepository extends JpaRepository<Ticket, Long> {

    List<Ticket> findByStatus(Ticket.TicketStatus status);

    List<Ticket> findByCategory(String category);

    List<Ticket> findByStatusAndCategory(Ticket.TicketStatus status, String category);

    List<Ticket> findByAiSentFalseAndStatusNot(Ticket.TicketStatus status);

    List<Ticket> findByFromEmailAndSubjectIgnoreCaseAndStatusNot(
            String fromEmail, String subject, Ticket.TicketStatus status);

    @Query("SELECT t.status, COUNT(t) FROM Ticket t GROUP BY t.status")
    List<Object[]> countByStatus();

    @Query("SELECT t.category, COUNT(t) FROM Ticket t GROUP BY t.category")
    List<Object[]> countByCategory();
}
