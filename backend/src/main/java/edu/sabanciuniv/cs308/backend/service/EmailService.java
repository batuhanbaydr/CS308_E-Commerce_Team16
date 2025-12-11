package edu.sabanciuniv.cs308.backend.service;

import com.itextpdf.text.Document;
import com.itextpdf.text.Paragraph;
import com.itextpdf.text.pdf.PdfPTable;
import com.itextpdf.text.pdf.PdfWriter;
import edu.sabanciuniv.cs308.backend.dto.OrderDetailDTO;
import edu.sabanciuniv.cs308.backend.entity.UserEntity;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:no-reply@tidl-store.com}")
    private String fromAddress;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /**
     * Send order confirmation email with:
     *  - HTML summary in the body
     *  - PDF invoice attached
     */
    public void sendOrderConfirmation(UserEntity user, OrderDetailDTO order) {
        if (user == null || order == null) {
            log.warn("User or order is null, skipping email.");
            return;
        }

        String to = user.getEmailAddress();
        if (to == null || to.isBlank()) {
            log.warn("User {} has no email address, skipping order confirmation for order {}",
                    user.getId(), order.getId());
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();

            // multipart = true so we can attach the PDF
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(to);
            helper.setFrom(fromAddress);
            helper.setSubject("Your TIDL order " + order.getId());

            String html = buildOrderHtml(user, order);
            helper.setText(html, true); // HTML body

            // Generate PDF invoice and attach it
            byte[] pdfBytes = generateInvoicePdf(user, order);
            if (pdfBytes != null && pdfBytes.length > 0) {
                helper.addAttachment(
                        "invoice-" + order.getId() + ".pdf",
                        new ByteArrayResource(pdfBytes)
                );
            }

            mailSender.send(message);
            log.info("Sent order confirmation email to {} for order {}", to, order.getId());
        } catch (Exception e) {
            // Do NOT fail checkout just because email failed
            log.warn("Failed to send order confirmation email for order {}", order.getId(), e);
        }
    }

    // ---------- HTML BODY ----------

    private String buildOrderHtml(UserEntity user, OrderDetailDTO order) {
        String customerName = Optional.ofNullable(user.getName()).orElse("Customer");
        OrderDetailDTO.MoneyDTO totals = order.getTotals();

        StringBuilder sb = new StringBuilder();
        sb.append("<html><body style=\"font-family: Arial, sans-serif;\">");

        sb.append("<h2>Thank you for your purchase, ")
          .append(escape(customerName))
          .append("!</h2>");

        sb.append("<p>Your order <strong>")
          .append(escape(order.getId()))
          .append("</strong> has been received.</p>");

        if (order.getCreatedAt() != null) {
            String formattedDate = DateTimeFormatter.ISO_INSTANT.format(order.getCreatedAt());
            sb.append("<p><strong>Date:</strong> ")
              .append(escape(formattedDate))
              .append("</p>");
        }

        sb.append("<h3>Order Summary</h3>");
        sb.append("<ul>");

        if (order.getItems() != null) {
            for (OrderDetailDTO.OrderItemDTO item : order.getItems()) {
                sb.append("<li>")
                  .append(escape(item.getName()))
                  .append(" (x").append(item.getQuantity()).append(") - $")
                  .append(item.getLineTotal())
                  .append("</li>");
            }
        }

        sb.append("</ul>");

        if (totals != null) {
            sb.append("<p><strong>Total: </strong>$")
              .append(totals.getGrandTotal())
              .append("</p>");
        }

        sb.append("<p>You can also view your invoice on the website.</p>");
        sb.append("<p>&mdash; TIDL</p>");
        sb.append("</body></html>");

        return sb.toString();
    }

    private String escape(String s) {
        if (s == null) return "";
        return s
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;");
    }

    // ---------- PDF GENERATION ----------

    private byte[] generateInvoicePdf(UserEntity user, OrderDetailDTO order) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document();

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            String customerName = Optional.ofNullable(user.getName()).orElse("Customer");
            OrderDetailDTO.MoneyDTO totals = order.getTotals();

            // Title & basic info
            document.add(new Paragraph("TIDL Invoice"));
            document.add(new Paragraph(" "));
            document.add(new Paragraph("Order ID: " + order.getId()));
            document.add(new Paragraph("Customer: " + customerName));

            if (order.getCreatedAt() != null) {
                String formattedDate = DateTimeFormatter.ISO_INSTANT.format(order.getCreatedAt());
                document.add(new Paragraph("Date: " + formattedDate));
            }

            document.add(new Paragraph(" "));
            document.add(new Paragraph("Order Items:"));
            document.add(new Paragraph(" "));

            // Table: Item, Qty, Unit Price, Total
            PdfPTable table = new PdfPTable(4);
            table.setWidthPercentage(100);
            table.addCell("Item");
            table.addCell("Qty");
            table.addCell("Unit Price");
            table.addCell("Total");

            if (order.getItems() != null) {
                for (OrderDetailDTO.OrderItemDTO item : order.getItems()) {
                    table.addCell(item.getName());
                    table.addCell(String.valueOf(item.getQuantity()));
                    table.addCell(String.valueOf(item.getUnitPrice()));
                    table.addCell(String.valueOf(item.getLineTotal()));
                }
            }

            document.add(table);
            document.add(new Paragraph(" "));

            // Totals
            if (totals != null) {
                document.add(new Paragraph("Subtotal: " + totals.getSubtotal()));
                if (totals.getTax() != null) {
                    document.add(new Paragraph("Tax: " + totals.getTax()));
                }
                if (totals.getShipping() != null) {
                    document.add(new Paragraph("Shipping: " + totals.getShipping()));
                }
                document.add(new Paragraph("Total: " + totals.getGrandTotal()));
            }

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            log.warn("Failed to generate invoice PDF for order {}", order.getId(), e);
            try {
                document.close();
            } catch (Exception ignored) {}
            return null;
        }
    }
}