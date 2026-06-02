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

import java.util.ArrayList;
import java.util.List;
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
            helper.setText(body, false);
            mailSender.send(message);
            log.info("Reply sent to {}", to);
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
            throw new RuntimeException("Email send failed", e);
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
