// ─────────────────────────────────────────────────────────────────────────────
// backend/src/lib/email.ts
// Transactional email via Brevo (https://api.brevo.com/v3/smtp/email).
// All Resend SDK dependencies have been removed; this file uses native fetch only.
// ─────────────────────────────────────────────────────────────────────────────

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Sends a single transactional email through the Brevo REST API.
 * Returns `{ logged: true }` when the API key is absent (dev / staging mode).
 */
async function sendViaBrevo({
  to,
  subject,
  htmlContent,
}: {
  to: { email: string; name: string };
  subject: string;
  htmlContent: string;
}): Promise<{ success: boolean; logged?: boolean }> {
  const apiKey   = process.env.BREVO_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || "orders@namasmate.com";
  const fromName  = "Namas Mate";

  // ── No API key → simulate (console-only, dev/staging mode) ────────────────
  if (!apiKey || apiKey.trim() === "") {
    console.warn("[Brevo] BREVO_API_KEY is not configured. Email will be logged to console only.");
    console.log(`[Brevo Simulated] TO: ${to.email} | SUBJECT: ${subject}`);
    return { success: true, logged: true };
  }

  const payload = {
    sender:      { name: fromName, email: fromEmail },
    to:          [to],
    bcc:         [{ email: fromEmail, name: "Admin Order Alert" }],
    subject,
    htmlContent,
  };

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept:           "application/json",
      "api-key":        apiKey,
      "content-type":   "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let errBody: unknown;
    try { errBody = await res.json(); } catch { errBody = res.statusText; }
    throw new Error(`Brevo API error (HTTP ${res.status}): ${JSON.stringify(errBody)}`);
  }

  return { success: true };
}

// ── HTML builders ─────────────────────────────────────────────────────────────

function buildOrderReceivedCustomerHtml(order: any, productName: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#0E0D0C;font-family:'Georgia',serif;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#0E0D0C;padding:40px 16px;">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" width="600"
  style="max-width:600px;width:100%;background:rgba(20,18,16,0.98);
         border:1px solid rgba(212,163,115,0.2);border-radius:20px;overflow:hidden;">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#1a1612,#0E0D0C);
                  border-bottom:1px solid rgba(212,163,115,0.2);
                  padding:32px 40px;text-align:center;">
    <p style="margin:0 0 4px;font-size:10px;letter-spacing:6px;text-transform:uppercase;
               color:rgba(212,163,115,0.55);font-family:Arial,sans-serif;">✦ &nbsp; NAMAS MATE &nbsp; ✦</p>
    <h1 style="margin:12px 0 0;font-size:24px;font-weight:400;letter-spacing:2px;
                color:#D4A373;line-height:1.3;">Order Received</h1>
  </td></tr>

  <!-- Greeting -->
  <tr><td style="padding:32px 40px 0;">
    <p style="margin:0;font-size:17px;color:#D4A373;">Assalamu Alaikum, <strong>${order.customerName}</strong></p>
    <p style="margin:12px 0 0;font-size:14px;line-height:1.8;color:#A89F95;font-family:Arial,sans-serif;">
      Thank you for ordering with Namas Mate. We have received your order and UPI
      transaction ID for manual accounting review. Your order will be confirmed and dispatched
      once your payment is verified — typically within <strong style="color:#D4A373;">1–3 business days</strong>.
    </p>
  </td></tr>

  <!-- Order Summary -->
  <tr><td style="padding:24px 40px 0;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
      style="background:rgba(14,13,12,0.85);border:1px solid rgba(212,163,115,0.12);
             border-radius:14px;overflow:hidden;">
      <tr><td colspan="2" style="padding:14px 24px;border-bottom:1px solid rgba(212,163,115,0.1);
                                   font-size:10px;letter-spacing:4px;text-transform:uppercase;
                                   color:rgba(212,163,115,0.6);font-family:Arial,sans-serif;">
        Order Summary
      </td></tr>
      <tr>
        <td style="padding:14px 24px 6px;font-size:13px;color:#A89F95;font-family:Arial,sans-serif;">Item</td>
        <td style="padding:14px 24px 6px;font-size:13px;color:#D4A373;text-align:right;font-family:Arial,sans-serif;">${productName}</td>
      </tr>
      <tr>
        <td style="padding:4px 24px 14px;font-size:13px;color:#A89F95;font-family:Arial,sans-serif;">Amount Paid</td>
        <td style="padding:4px 24px 14px;font-size:13px;color:#D4A373;text-align:right;font-family:Georgia,serif;font-weight:600;">₹${order.amount}</td>
      </tr>
      <tr><td colspan="2" style="padding:0 24px;"><div style="height:1px;background:rgba(212,163,115,0.1);"></div></td></tr>
      <tr>
        <td style="padding:14px 24px;font-size:12px;color:#A89F95;font-family:Arial,sans-serif;">Transaction ID / UTR</td>
        <td style="padding:14px 24px;font-size:14px;color:#D4A373;text-align:right;font-family:'Courier New',monospace;letter-spacing:1px;">${order.transactionId}</td>
      </tr>
      <tr>
        <td style="padding:0 24px 14px;font-size:12px;color:#A89F95;font-family:Arial,sans-serif;vertical-align:top;">Ship To</td>
        <td style="padding:0 24px 14px;font-size:12px;color:#A89F95;text-align:right;font-family:Arial,sans-serif;line-height:1.7;">
          ${order.address},<br/>${order.city}, ${order.state} — ${order.pincode}
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:28px 40px 32px;border-top:1px solid rgba(212,163,115,0.1);margin-top:28px;text-align:center;">
    <p style="margin:0 0 4px;font-size:13px;letter-spacing:3px;text-transform:uppercase;
               color:rgba(212,163,115,0.5);font-family:Arial,sans-serif;">Namas Mate</p>
    <p style="margin:0;font-size:11px;color:rgba(168,159,149,0.4);font-family:Arial,sans-serif;">
      JazakAllah Khair &nbsp;·&nbsp; Crafted with reverence in India
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`.trim();
}

function buildOrderReceivedAdminHtml(order: any, productName: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f8fafc;color:#111;">
<div style="max-width:600px;margin:40px auto;padding:32px;background:#fff;
             border-radius:12px;border:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
  <h2 style="color:#334155;margin:0 0 8px;">🛒 New Order — Namas Mate</h2>
  <p style="margin:0 0 24px;color:#64748b;font-size:14px;">
    A new order has been submitted and requires payment verification.
  </p>
  <table style="width:100%;border-collapse:collapse;font-size:13px;">
    <tr style="background:#f8fafc;"><td style="padding:10px 14px;border:1px solid #e2e8f0;font-weight:600;width:40%;">Customer</td><td style="padding:10px 14px;border:1px solid #e2e8f0;">${order.customerName}</td></tr>
    <tr><td style="padding:10px 14px;border:1px solid #e2e8f0;font-weight:600;">Email</td><td style="padding:10px 14px;border:1px solid #e2e8f0;">${order.email}</td></tr>
    <tr style="background:#f8fafc;"><td style="padding:10px 14px;border:1px solid #e2e8f0;font-weight:600;">Phone</td><td style="padding:10px 14px;border:1px solid #e2e8f0;">${order.phone}</td></tr>
    <tr><td style="padding:10px 14px;border:1px solid #e2e8f0;font-weight:600;">Product</td><td style="padding:10px 14px;border:1px solid #e2e8f0;">${productName}</td></tr>
    <tr style="background:#f8fafc;"><td style="padding:10px 14px;border:1px solid #e2e8f0;font-weight:600;">Amount</td><td style="padding:10px 14px;border:1px solid #e2e8f0;font-weight:700;color:#D4A373;">₹${order.amount}</td></tr>
    <tr><td style="padding:10px 14px;border:1px solid #e2e8f0;font-weight:600;">Transaction ID / UTR</td><td style="padding:10px 14px;border:1px solid #e2e8f0;font-family:monospace;font-size:14px;">${order.transactionId}</td></tr>
    <tr style="background:#f8fafc;"><td style="padding:10px 14px;border:1px solid #e2e8f0;font-weight:600;">Delivery Address</td><td style="padding:10px 14px;border:1px solid #e2e8f0;line-height:1.6;">${order.address}, ${order.city}, ${order.state} — ${order.pincode}</td></tr>
  </table>
</div>
</body></html>`.trim();
}

function buildStatusUpdateHtml(order: any, productName: string): string {
  const statusColors: Record<string, string> = {
    Confirmed: "#D4A373", // Gold
    Shipped: "#4ade80",   // Green
    Delivered: "#3b82f6", // Blue
    Cancelled: "#ef4444", // Red
  };
  const titleColor = statusColors[order.status] || "#D4A373";

  let bodyMessage = "";
  if (order.status === "Confirmed") {
    bodyMessage = `Great news — your payment has been verified and your order for <strong style="color:${titleColor};">${productName}</strong> is now <strong style="color:${titleColor};">Confirmed</strong>. We are preparing your package and will send tracking information as soon as it ships.`;
  } else if (order.status === "Shipped") {
    bodyMessage = `Your order for <strong style="color:${titleColor};">${productName}</strong> has been <strong style="color:${titleColor};">Shipped</strong>! It is now on its way to you.`;
  } else if (order.status === "Delivered") {
    bodyMessage = `Your order for <strong style="color:${titleColor};">${productName}</strong> has been <strong style="color:${titleColor};">Delivered</strong>. We hope you love your new prayer mat!`;
  } else if (order.status === "Cancelled") {
    bodyMessage = `Your order for <strong style="color:${titleColor};">${productName}</strong> has been <strong style="color:${titleColor};">Cancelled</strong>. If you believe this is an error, please reply to this email.`;
  } else {
    bodyMessage = `The status of your order for <strong style="color:${titleColor};">${productName}</strong> has been updated to <strong style="color:${titleColor};">${order.status}</strong>.`;
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#0E0D0C;font-family:'Georgia',serif;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#0E0D0C;padding:40px 16px;">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" width="600"
  style="max-width:600px;width:100%;background:rgba(20,18,16,0.98);
         border:1px solid rgba(212,163,115,0.2);border-radius:20px;overflow:hidden;">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#1a1612,#0E0D0C);
                  border-bottom:1px solid rgba(212,163,115,0.2);
                  padding:32px 40px;text-align:center;">
    <p style="margin:0 0 4px;font-size:10px;letter-spacing:6px;text-transform:uppercase;
               color:rgba(212,163,115,0.55);font-family:Arial,sans-serif;">✦ &nbsp; NAMAS MATE &nbsp; ✦</p>
    <h1 style="margin:12px 0 0;font-size:24px;font-weight:400;letter-spacing:2px;color:${titleColor};line-height:1.3;">
      Order ${order.status}
    </h1>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:32px 40px 0;">
    <p style="margin:0;font-size:17px;color:#D4A373;">Assalamu Alaikum, <strong>${order.customerName}</strong></p>
    <p style="margin:12px 0 0;font-size:14px;line-height:1.8;color:#A89F95;font-family:Arial,sans-serif;">
      ${bodyMessage}
    </p>
  </td></tr>

  <!-- Summary -->
  <tr><td style="padding:24px 40px 0;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
      style="background:rgba(14,13,12,0.85);border:1px solid rgba(212,163,115,0.12);
             border-radius:14px;overflow:hidden;">
      <tr>
        <td style="padding:14px 24px 6px;font-size:13px;color:#A89F95;font-family:Arial,sans-serif;">Status</td>
        <td style="padding:14px 24px 6px;font-size:13px;color:${titleColor};text-align:right;font-family:Arial,sans-serif;font-weight:600;">${order.status}</td>
      </tr>
      <tr>
        <td style="padding:4px 24px;font-size:13px;color:#A89F95;font-family:Arial,sans-serif;">Amount Paid</td>
        <td style="padding:4px 24px;font-size:13px;color:#D4A373;text-align:right;font-family:Georgia,serif;font-weight:600;">₹${order.amount}</td>
      </tr>
      <tr>
        <td style="padding:4px 24px 14px;font-size:12px;color:#A89F95;font-family:Arial,sans-serif;">Transaction ID</td>
        <td style="padding:4px 24px 14px;font-size:13px;color:#D4A373;text-align:right;font-family:'Courier New',monospace;">${order.transactionId}</td>
      </tr>
      <tr><td colspan="2" style="padding:0 24px;"><div style="height:1px;background:rgba(212,163,115,0.1);"></div></td></tr>
      <tr>
        <td style="padding:12px 24px 14px;font-size:12px;color:#A89F95;font-family:Arial,sans-serif;vertical-align:top;">Ship To</td>
        <td style="padding:12px 24px 14px;font-size:12px;color:#A89F95;text-align:right;font-family:Arial,sans-serif;line-height:1.7;">
          ${order.address},<br/>${order.city}, ${order.state} — ${order.pincode}
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:28px 40px 32px;border-top:1px solid rgba(212,163,115,0.1);margin-top:28px;text-align:center;">
    <p style="margin:0 0 4px;font-size:13px;letter-spacing:3px;text-transform:uppercase;
               color:rgba(212,163,115,0.5);font-family:Arial,sans-serif;">Namas Mate</p>
    <p style="margin:0;font-size:11px;color:rgba(168,159,149,0.4);font-family:Arial,sans-serif;">
      JazakAllah Khair &nbsp;·&nbsp; Crafted with reverence in India
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`.trim();
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Sends two emails when a new order is placed:
 *  1. Customer confirmation (order received + UTR reference).
 *  2. Admin alert (full order details for fulfilment team).
 */
export async function sendOrderEmails({
  order,
  productName,
}: {
  order: any;
  productName: string;
}): Promise<{ success: boolean; logged?: boolean }> {
  const [customerResult, adminResult] = await Promise.all([
    sendViaBrevo({
      to: { email: order.email, name: order.customerName },
      subject: "Namas Mate — Order Received",
      htmlContent: buildOrderReceivedCustomerHtml(order, productName),
    }),
    sendViaBrevo({
      to: { email: process.env.EMAIL_FROM || "orders@namasmate.com", name: "Admin Order Alert" },
      subject: `[Admin] New Order — ${order.customerName}`,
      htmlContent: buildOrderReceivedAdminHtml(order, productName),
    }),
  ]);

  return {
    success: true,
    logged: !!(customerResult.logged || adminResult.logged),
  };
}

/**
 * Sends a status update email to the customer (Confirmed, Shipped, Delivered, Cancelled).
 * Triggered automatically when the order status is updated from the admin dashboard.
 */
export async function sendStatusUpdateEmail({
  order,
  productName,
}: {
  order: any;
  productName: string;
}): Promise<{ success: boolean; logged?: boolean }> {
  const subjects: Record<string, string> = {
    Confirmed: "Namas Mate — Your Order is Confirmed ✓",
    Shipped: "Namas Mate — Your Order has Shipped 🚚",
    Delivered: "Namas Mate — Your Order has been Delivered 📦",
    Cancelled: "Namas Mate — Order Cancelled",
  };
  const subject = subjects[order.status] || `Namas Mate — Order ${order.status}`;

  return sendViaBrevo({
    to: { email: order.email, name: order.customerName },
    subject,
    htmlContent: buildStatusUpdateHtml(order, productName),
  });
}
