package com.support.backend.service;

import jakarta.mail.*;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Properties;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String supportEmail;

    @Value("${mail.imap.host:imap.gmail.com}")
    private String imapHost;

    @Value("${mail.imap.port:993}")
    private int imapPort;

    @Value("${spring.mail.password}")
    private String emailPassword;

    public record EmailMessage(String from, String fromName, String subject, String body) {}

    public List<EmailMessage> fetchUnreadEmails() {
        List<EmailMessage> emails = new ArrayList<>();
        try {
            Properties props = new Properties();
            props.put("mail.store.protocol", "imaps");
            props.put("mail.imaps.host", imapHost);
            props.put("mail.imaps.port", String.valueOf(imapPort));
            props.put("mail.imaps.ssl.enable", "true");
            props.put("mail.imaps.connectiontimeout", "10000");
            props.put("mail.imaps.timeout", "10000");
            props.put("mail.imaps.writetimeout", "10000");

            Session session = Session.getInstance(props);
            Store store = session.getStore("imaps");
            store.connect(imapHost, supportEmail, emailPassword);

            Folder inbox = store.getFolder("INBOX");
            inbox.open(Folder.READ_WRITE);

            Message[] messages = inbox.search(
                    new jakarta.mail.search.FlagTerm(new Flags(Flags.Flag.SEEN), false)
            );

            for (Message msg : messages) {
                String from = ((InternetAddress) msg.getFrom()[0]).getAddress();
                String fromName = ((InternetAddress) msg.getFrom()[0]).getPersonal();
                String subject = msg.getSubject() != null ? msg.getSubject() : "(no subject)";
                String body = extractText(msg);
                emails.add(new EmailMessage(from, fromName != null ? fromName : from, subject, body));
                msg.setFlag(Flags.Flag.SEEN, true);
            }

            inbox.close(false);
            store.close();
        } catch (Exception e) {
            log.error("Failed to fetch emails: {}", e.getMessage());
        }
        return emails;
    }

    public void sendReply(String to, String subject, String body) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setTo(to);
            helper.setFrom(supportEmail);
            helper.setSubject("Re: " + subject);
            String signature = "\n\n--\nSupport Desk | Available 24/7\nEmail: " + supportEmail + "\nPowered by AI Support System";
            helper.setText(body + signature, false);
            mailSender.send(message);
            log.info("Reply sent to {}", to);
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
            throw new RuntimeException("Email send failed", e);
        }
    }

    public void sendAcknowledgment(String to, String name, Long ticketId, String subject) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setTo(to);
            helper.setFrom(supportEmail);
            helper.setSubject("[Ticket #" + ticketId + "] We received your request");
            String body = "Hi " + name + ",\n\n"
                + "Thank you for reaching out! We've received your request and created a support ticket.\n\n"
                + "Ticket ID: #" + ticketId + "\n"
                + "Subject: " + subject + "\n\n"
                + "Our team is reviewing your request and will respond as soon as possible.\n"
                + "You can track your ticket status at any time using your email address.\n\n"
                + "--\nSupport Desk | Available 24/7\nEmail: " + supportEmail;
            helper.setText(body, false);
            mailSender.send(message);
            log.info("Acknowledgment sent to {} for ticket #{}", to, ticketId);
        } catch (Exception e) {
            log.error("Failed to send acknowledgment: {}", e.getMessage());
        }
    }

    public void sendCsatSurvey(String to, String name, Long ticketId, String subject, String baseUrl) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(to);
            helper.setFrom(supportEmail);
            helper.setSubject("[Ticket #" + ticketId + "] How did we do?");
            String rateUrl = baseUrl + "/api/portal/csat/" + ticketId + "?score=";

            String html = """
                <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#f8fafc;padding:30px;border-radius:12px;">
                  <div style="background:white;border-radius:10px;padding:30px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

                    <h2 style="color:#1e293b;margin:0 0 6px 0;">How did we do? 💬</h2>
                    <p style="color:#64748b;margin:0 0 20px 0;font-size:14px;">
                      Hi <strong>%s</strong>, your ticket has been resolved!
                    </p>

                    <div style="background:#f1f5f9;border-radius:8px;padding:14px;margin-bottom:24px;">
                      <p style="margin:0;font-size:13px;color:#475569;">
                        <strong>Ticket #%d</strong> — %s
                      </p>
                    </div>

                    <p style="color:#374151;font-size:15px;font-weight:600;margin:0 0 16px 0;">
                      Click a star to rate your experience:
                    </p>

                    <table style="width:100%%;border-collapse:separate;border-spacing:6px;">
                      <tr>
                        <td style="text-align:center;">
                          <a href="%s1" style="display:inline-block;background:#fee2e2;color:#dc2626;text-decoration:none;padding:12px 8px;border-radius:8px;font-size:13px;font-weight:600;width:80px;">
                            ⭐<br/>Terrible
                          </a>
                        </td>
                        <td style="text-align:center;">
                          <a href="%s2" style="display:inline-block;background:#ffedd5;color:#ea580c;text-decoration:none;padding:12px 8px;border-radius:8px;font-size:13px;font-weight:600;width:80px;">
                            ⭐⭐<br/>Bad
                          </a>
                        </td>
                        <td style="text-align:center;">
                          <a href="%s3" style="display:inline-block;background:#fef9c3;color:#ca8a04;text-decoration:none;padding:12px 8px;border-radius:8px;font-size:13px;font-weight:600;width:80px;">
                            ⭐⭐⭐<br/>Okay
                          </a>
                        </td>
                        <td style="text-align:center;">
                          <a href="%s4" style="display:inline-block;background:#dcfce7;color:#16a34a;text-decoration:none;padding:12px 8px;border-radius:8px;font-size:13px;font-weight:600;width:80px;">
                            ⭐⭐⭐⭐<br/>Good
                          </a>
                        </td>
                        <td style="text-align:center;">
                          <a href="%s5" style="display:inline-block;background:#dbeafe;color:#2563eb;text-decoration:none;padding:12px 8px;border-radius:8px;font-size:13px;font-weight:600;width:80px;">
                            ⭐⭐⭐⭐⭐<br/>Excellent
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="color:#94a3b8;font-size:12px;margin:24px 0 0 0;text-align:center;">
                      Thank you for your feedback! It helps us improve our service.
                    </p>
                  </div>
                  <p style="color:#94a3b8;font-size:11px;text-align:center;margin-top:16px;">
                    Support Desk | Available 24/7
                  </p>
                </div>
                """.formatted(name, ticketId, subject,
                    rateUrl, rateUrl, rateUrl, rateUrl, rateUrl);

            helper.setText(html, true);
            mailSender.send(message);
            log.info("CSAT survey sent to {} for ticket #{}", to, ticketId);
        } catch (Exception e) {
            log.error("Failed to send CSAT survey: {}", e.getMessage());
        }
    }

    public void sendMentionNotification(String to, String mentionedName, Long ticketId, String ticketSubject, String commentBy) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            String actualTo = (to != null && to.contains("@gmail.com")) ? to : supportEmail;
            helper.setTo(actualTo);
            helper.setFrom(supportEmail);
            helper.setSubject("[Mention] " + commentBy + " mentioned you on Ticket #" + ticketId);
            String body = "Hi " + mentionedName + ",\n\n"
                + commentBy + " mentioned you in an internal note on Ticket #" + ticketId + ".\n\n"
                + "Subject: " + ticketSubject + "\n\n"
                + "Log in to the dashboard to view the note.\n\n--\nSupport Desk";
            helper.setText(body, false);
            mailSender.send(message);
            log.info("Mention notification sent to {} for ticket #{}", to, ticketId);
        } catch (Exception e) {
            log.error("Failed to send mention notification: {}", e.getMessage());
        }
    }

    public void sendReminderEmail(String to, Long ticketId, String ticketSubject, String note) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            // If fake internal email OR sending to self → use support email
            // Gmail doesn't deliver self-sent SMTP emails to inbox
            String actualTo = (to != null && to.contains("@gmail.com") && !to.equals(supportEmail))
                    ? to : supportEmail;
            // If still sending to self, log warning
            if (actualTo.equals(supportEmail)) {
                log.warn("Reminder sending to support inbox itself — check agent profile email");
            }
            helper.setTo(actualTo);
            helper.setFrom(supportEmail);
            helper.setSubject("[Reminder] Follow up on Ticket #" + ticketId);
            String body = "Hi,\n\nThis is your scheduled reminder for Ticket #" + ticketId + ".\n\n"
                + "Subject: " + ticketSubject + "\n"
                + (note != null && !note.isEmpty() ? "Your note: " + note + "\n" : "")
                + "\nLog in to the dashboard to view and respond to this ticket.\n\n--\nSupport Desk";
            helper.setText(body, false);
            mailSender.send(message);
            log.info("Reminder sent to {} for ticket #{}", to, ticketId);
        } catch (Exception e) {
            log.error("Failed to send reminder email: {}", e.getMessage());
        }
    }

    public void sendDailyPerformanceReport(Map<String, Object> agentStats) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setTo(supportEmail);
            helper.setFrom(supportEmail);
            helper.setSubject("📊 Daily Agent Performance Report — " + java.time.LocalDate.now());
            StringBuilder body = new StringBuilder();
            body.append("Daily Agent Performance Report\n");
            body.append("Date: ").append(java.time.LocalDate.now()).append("\n\n");
            body.append("─────────────────────────────────\n");
            agentStats.forEach((agentName, stats) -> {
                @SuppressWarnings("unchecked")
                Map<String, Object> s = (Map<String, Object>) stats;
                body.append("Agent: ").append(agentName).append("\n");
                body.append("  Total Assigned: ").append(s.get("total")).append("\n");
                body.append("  Resolved:       ").append(s.get("resolved")).append("\n");
                long total = ((Number) s.get("total")).longValue();
                long resolved = ((Number) s.get("resolved")).longValue();
                double rate = total > 0 ? Math.round((double) resolved / total * 100) : 0;
                body.append("  Success Rate:   ").append(rate).append("%\n");
                body.append("─────────────────────────────────\n");
            });
            body.append("\nLog in to dashboard for full analytics.\n\n--\nSupport Desk");
            helper.setText(body.toString(), false);
            mailSender.send(message);
            log.info("Daily performance report sent");
        } catch (Exception e) {
            log.error("Failed to send daily report: {}", e.getMessage());
        }
    }

    public void sendSlaBreachAlert(String to, Long ticketId, String subject, String priority, LocalDateTime deadline) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            String actualTo = (to != null && to.contains("@gmail.com") && !to.equals(supportEmail)) ? to : supportEmail;
            helper.setTo(actualTo);
            helper.setFrom(supportEmail);
            helper.setSubject("⚠️ SLA Breach Warning — Ticket #" + ticketId);
            String body = "URGENT: SLA Breach Warning!\n\n"
                + "Ticket #" + ticketId + " is about to breach its SLA deadline.\n\n"
                + "Subject:  " + subject + "\n"
                + "Priority: " + priority + "\n"
                + "Deadline: " + deadline + "\n\n"
                + "Please respond to this ticket immediately!\n\n"
                + "--\nSupport Desk";
            helper.setText(body, false);
            mailSender.send(message);
            log.info("SLA breach alert sent for ticket #{}", ticketId);
        } catch (Exception e) {
            log.error("Failed to send SLA breach alert: {}", e.getMessage());
        }
    }

    public void sendFollowUpEmail(String to, String name, Long ticketId, String subject, String status) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setTo(to);
            helper.setFrom(supportEmail);
            helper.setSubject("[Ticket #" + ticketId + "] We are still working on your issue");
            String body = "Hi " + name + ",\n\n"
                + "We wanted to let you know that we are still working on your issue.\n\n"
                + "Ticket ID: #" + ticketId + "\n"
                + "Subject: " + subject + "\n"
                + "Status: " + status + "\n\n"
                + "We apologize for the delay. Our team will resolve this as soon as possible.\n"
                + "You don't need to send another email — we have your request and are on it.\n\n"
                + "--\nSupport Desk | Available 24/7\nEmail: " + supportEmail;
            helper.setText(body, false);
            mailSender.send(message);
            log.info("Follow-up email sent to {} for ticket #{}", to, ticketId);
        } catch (Exception e) {
            log.error("Failed to send follow-up email: {}", e.getMessage());
        }
    }

    public void sendAgentNotification(Long ticketId, String subject, String fromEmail, String priority) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setTo(supportEmail);
            helper.setFrom(supportEmail);
            helper.setSubject("[" + priority + "] New ticket: " + subject);
            helper.setText(String.format(
                    "A new %s priority ticket requires attention.\n\nTicket #%d\nFrom: %s\nSubject: %s\n\nLog in to the dashboard to handle it.",
                    priority, ticketId, fromEmail, subject), false);
            mailSender.send(message);
            log.info("Agent notification sent for ticket #{}", ticketId);
        } catch (Exception e) {
            log.error("Failed to send agent notification: {}", e.getMessage());
        }
    }

    private String extractText(Message message) throws Exception {
        return extractFromPart(message);
    }

    private String extractFromPart(Part part) throws Exception {
        String contentType = part.getContentType().toLowerCase();
        if (contentType.startsWith("text/plain")) {
            return part.getContent().toString();
        }
        if (contentType.startsWith("text/html")) {
            return part.getContent().toString()
                    .replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
        }
        if (part.getContent() instanceof Multipart multipart) {
            String plainText = "";
            String htmlText = "";
            for (int i = 0; i < multipart.getCount(); i++) {
                BodyPart bp = multipart.getBodyPart(i);
                String ct = bp.getContentType().toLowerCase();
                if (ct.startsWith("text/plain")) {
                    plainText = bp.getContent().toString();
                } else if (ct.startsWith("text/html")) {
                    htmlText = bp.getContent().toString()
                            .replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
                } else if (bp.getContent() instanceof Multipart) {
                    String nested = extractFromPart(bp);
                    if (!nested.isEmpty()) plainText = nested;
                }
            }
            return !plainText.isEmpty() ? plainText : htmlText;
        }
        return "";
    }
}
