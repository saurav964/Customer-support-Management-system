package com.support.backend.repository;

import com.support.backend.model.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public interface TicketRepository extends JpaRepository<Ticket, Long> {

    List<Ticket> findByStatus(Ticket.TicketStatus status);

    List<Ticket> findByCategory(String category);

    List<Ticket> findByStatusAndCategory(Ticket.TicketStatus status, String category);

    List<Ticket> findByAiSentFalseAndStatusNot(Ticket.TicketStatus status);

    List<Ticket> findByFromEmailAndSubjectIgnoreCaseAndStatusNot(
            String fromEmail, String subject, Ticket.TicketStatus status);

    List<Ticket> findByStatusAndResolvedAtBefore(Ticket.TicketStatus status, LocalDateTime cutoff);

    @Query("SELECT t FROM Ticket t WHERE t.status = :status AND (t.createdAt IS NULL OR t.createdAt < :cutoff) AND (t.overdue = false OR t.overdue IS NULL)")
    List<Ticket> findOverdueTickets(@Param("status") Ticket.TicketStatus status, @Param("cutoff") LocalDateTime cutoff);

    long countByOverdueTrueAndStatus(Ticket.TicketStatus status);

    List<Ticket> findByFromEmailOrderByCreatedAtDesc(String fromEmail);

    List<Ticket> findByAssignedTo(String agentEmail);
    List<Ticket> findByAssignedToAndStatus(String agentEmail, Ticket.TicketStatus status);
    List<Ticket> findByAssignedToAndCategory(String agentEmail, String category);
    List<Ticket> findByAssignedToAndStatusAndCategory(String agentEmail, Ticket.TicketStatus status, String category);

    @Query("SELECT t.status, COUNT(t) FROM Ticket t GROUP BY t.status")
    List<Object[]> countByStatus();

    @Query("SELECT t.category, COUNT(t) FROM Ticket t GROUP BY t.category")
    List<Object[]> countByCategory();
}
