package com.support.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

@Service
@RequiredArgsConstructor
public class ClaudeAiService {

    @Value("${groq.api.key}")
    private String apiKey;

    private static final String API_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String MODEL = "llama-3.1-8b-instant";

    private final ObjectMapper objectMapper = new ObjectMapper();

    public String categorizeTicket(String subject, String body) {
        String prompt = String.format("""
                Analyze this customer support email and respond with ONLY a JSON object (no markdown, no code block, no explanation).

                Category rules:
                - Billing: payment charges, invoice, subscription fee, overcharged, payment failed
                - Account: bank account, login, password, profile, account settings, account locked, account access
                - Technical: app not working, error, bug, crash, slow, not loading, broken feature
                - Shipping: order not delivered, delivery delay, tracking, courier, shipment
                - Returns: return item, refund request, exchange, damaged product, wrong item received
                - General: anything else that does not fit above categories

                Priority rules:
                - URGENT: account hacked, fraud, data breach, system down, cannot access at all
                - HIGH: payment failed, order lost, serious complaint
                - MEDIUM: delivery delay, feature not working, billing question
                - LOW: general question, feedback, minor issue

                Respond with ONLY this JSON:
                {"category": "<Billing|Account|Technical|Shipping|Returns|General>",
                 "priority": "<LOW|MEDIUM|HIGH|URGENT>",
                 "summary": "<one sentence summary>"}

                Subject: %s
                Body: %s
                """, subject, body);

        return callGroq(prompt);
    }

    public String generateResponse(String subject, String body, String knowledgeContext) {
        String prompt = String.format("""
                You are a caring and experienced customer support agent. Your goal is to make the customer feel heard and resolve their issue completely so they are satisfied.

                Rules:
                - Read the customer's message carefully and understand exactly what they need
                - Respond like a real human — warm, empathetic, and personal
                - Directly solve or address their specific problem, not a generic response
                - If their issue is about payment/refund — confirm the action you will take and give a timeframe
                - If their issue is about delivery — give tracking advice or confirm investigation
                - If their issue is about account — give clear steps to fix it
                - If their issue is about a product — acknowledge and offer return/replacement
                - Use the knowledge base ONLY if it has relevant information
                - NEVER mention the knowledge base or list unrelated topics
                - NEVER ask unnecessary questions if the issue is already clear
                - If you truly cannot resolve it, say a specialist will contact them within 24 hours
                - Keep the response short, clear and satisfying — customer should feel their issue is handled
                - Do NOT start with "Dear" or "Hi"
                - End with exactly: "Best regards,\\nCustomer Support Team"
                - Never use "[Your Name]" or any placeholder

                KNOWLEDGE BASE (use only if relevant):
                %s

                CUSTOMER EMAIL:
                Subject: %s
                Body: %s

                Write ONLY the email body. Make the customer feel satisfied so they will reply "thank you".
                """, knowledgeContext, subject, body);

        return callGroq(prompt);
    }

    public boolean isCustomerSatisfied(String replyBody) {
        String prompt = String.format("""
                A customer sent this reply to a support email. Is the customer satisfied and their issue resolved?
                Reply with ONLY one word: YES or NO.

                Customer reply: %s
                """, replyBody);

        String result = callGroq(prompt).trim().toUpperCase();
        return result.contains("YES");
    }

    private String callGroq(String userMessage) {
        try {
            ObjectNode message = objectMapper.createObjectNode();
            message.put("role", "user");
            message.put("content", userMessage);

            ArrayNode messages = objectMapper.createArrayNode();
            messages.add(message);

            ObjectNode requestBody = objectMapper.createObjectNode();
            requestBody.put("model", MODEL);
            requestBody.put("max_tokens", 1024);
            requestBody.set("messages", messages);

            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(API_URL))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody.toString()))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            String responseBody = response.body();
            JsonNode responseNode = objectMapper.readTree(responseBody);
            if (!responseNode.has("choices")) {
                throw new RuntimeException("Groq error: " + responseBody);
            }
            return responseNode
                    .path("choices").get(0)
                    .path("message")
                    .path("content").asText();
        } catch (Exception e) {
            throw new RuntimeException("Groq API call failed: " + e.getMessage(), e);
        }
    }
}
