import { Resend } from "resend";

const getResend = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.includes("your_")) {
    console.warn("[Resend] RESEND_API_KEY is not configured. Emails will be logged to console only.");
    return null;
  }
  return new Resend(apiKey);
};

export async function sendOrderEmails({
  order,
  productName,
}: {
  order: any;
  productName: string;
}) {
  const resend = getResend();
  const fromEmail = process.env.EMAIL_FROM || "orders@namasmate.com";
  const fromLabel = `Namas Mate <${fromEmail}>`;

  const customerHtml = `
    <div style="font-family: 'Outfit', Arial, sans-serif; color: #374151; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #ffffff;">
      <div style="border-bottom: 2px solid #7B9E87; padding-bottom: 20px; margin-bottom: 24px;">
        <h2 style="color: #7B9E87; margin: 0; font-size: 22px; font-weight: 600;">Namas Mate — Order Received</h2>
      </div>
      <p>Assalamu Alaikum <strong>${order.customerName}</strong>,</p>
      <p>Thank you for ordering with Namas Mate. We have received your order and transaction ID for review.</p>
      
      <div style="background-color: #F8FAFC; padding: 20px; border-left: 3px solid #7B9E87; margin: 24px 0; border-radius: 0 8px 8px 0;">
        <h3 style="margin-top: 0; color: #334155; font-size: 15px;">Order Summary</h3>
        <p style="margin: 6px 0;"><strong>Product:</strong> ${productName}</p>
        <p style="margin: 6px 0;"><strong>Amount Paid:</strong> ₹${order.amount}</p>
        <p style="margin: 6px 0;"><strong>Transaction ID / UTR:</strong> ${order.transactionId}</p>
        <p style="margin: 6px 0;"><strong>Shipping To:</strong><br>
          ${order.address},<br>
          ${order.city}, ${order.state} — ${order.pincode}
        </p>
      </div>

      <p style="font-weight: 600; color: #334155;">Your order is now under review. We will confirm it and begin shipping once your payment is verified.</p>
      <p>If you have any questions, feel free to reply to this email or contact our support.</p>
      
      <div style="margin-top: 36px; padding-top: 20px; border-top: 1px solid #E5E7EB; color: #6B7280; font-size: 13px;">
        <p style="margin: 0;">JazakAllah Khair,<br><strong>Namas Mate Team</strong></p>
      </div>
    </div>
  `;

  const adminHtml = `
    <div style="font-family: Arial, sans-serif; color: #111; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #334155;">🛒 New Order on Namas Mate</h2>
      <p>A new order has been submitted and is pending payment verification.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <tr style="background-color: #F8FAFC;"><td style="padding: 10px; border: 1px solid #E5E7EB;"><strong>Customer Name</strong></td><td style="padding: 10px; border: 1px solid #E5E7EB;">${order.customerName}</td></tr>
        <tr><td style="padding: 10px; border: 1px solid #E5E7EB;"><strong>Email</strong></td><td style="padding: 10px; border: 1px solid #E5E7EB;">${order.email}</td></tr>
        <tr style="background-color: #F8FAFC;"><td style="padding: 10px; border: 1px solid #E5E7EB;"><strong>Phone</strong></td><td style="padding: 10px; border: 1px solid #E5E7EB;">${order.phone}</td></tr>
        <tr><td style="padding: 10px; border: 1px solid #E5E7EB;"><strong>Amount</strong></td><td style="padding: 10px; border: 1px solid #E5E7EB;">₹${order.amount}</td></tr>
        <tr style="background-color: #F8FAFC;"><td style="padding: 10px; border: 1px solid #E5E7EB;"><strong>Transaction ID</strong></td><td style="padding: 10px; border: 1px solid #E5E7EB;">${order.transactionId}</td></tr>
        <tr><td style="padding: 10px; border: 1px solid #E5E7EB;"><strong>Product</strong></td><td style="padding: 10px; border: 1px solid #E5E7EB;">${productName}</td></tr>
        <tr style="background-color: #F8FAFC;"><td style="padding: 10px; border: 1px solid #E5E7EB;"><strong>Address</strong></td><td style="padding: 10px; border: 1px solid #E5E7EB;">${order.address}, ${order.city}, ${order.state} — ${order.pincode}</td></tr>
      </table>
    </div>
  `;

  if (!resend) {
    console.log("=== SIMULATING ORDER EMAILS ===");
    console.log(`[Customer Email] TO: ${order.email} | SUBJECT: Namas Mate - Order Received`);
    console.log(`[Admin Email] TO: ${fromEmail} | SUBJECT: [Admin] New Order on Namas Mate`);
    console.log("================================");
    return { success: true, logged: true };
  }

  const [customerResult, adminResult] = await Promise.all([
    resend.emails.send({
      from: fromLabel,
      to: order.email,
      subject: "Namas Mate — Order Received",
      html: customerHtml,
    }),
    resend.emails.send({
      from: fromLabel,
      to: fromEmail,
      subject: `[Admin] New Order — ${order.customerName}`,
      html: adminHtml,
    }),
  ]);

  if (customerResult.error || adminResult.error) {
    console.error("[Resend] Error sending order emails:", customerResult.error ?? adminResult.error);
    throw new Error(customerResult.error?.message ?? adminResult.error?.message);
  }

  return { success: true };
}

export async function sendManualConfirmationEmail({
  order,
  productName,
}: {
  order: any;
  productName: string;
}) {
  const resend = getResend();
  const fromEmail = process.env.EMAIL_FROM || "orders@namasmate.com";
  const fromLabel = `Namas Mate <${fromEmail}>`;

  const customerHtml = `
    <div style="font-family: 'Outfit', Arial, sans-serif; color: #374151; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #ffffff;">
      <div style="border-bottom: 2px solid #7B9E87; padding-bottom: 20px; margin-bottom: 24px;">
        <h2 style="color: #7B9E87; margin: 0; font-size: 22px; font-weight: 600;">Namas Mate — Order Confirmed! ✅</h2>
      </div>
      <p>Assalamu Alaikum <strong>${order.customerName}</strong>,</p>
      <p>Great news! Your payment has been verified and your order for <strong>${productName}</strong> is now <strong>Confirmed</strong>!</p>
      
      <div style="background-color: #F8FAFC; padding: 20px; border-left: 3px solid #7B9E87; margin: 24px 0; border-radius: 0 8px 8px 0;">
        <p style="margin: 6px 0;"><strong>Order Status:</strong> ${order.status}</p>
        <p style="margin: 6px 0;"><strong>Amount Paid:</strong> ₹${order.amount}</p>
        <p style="margin: 6px 0;"><strong>Transaction ID:</strong> ${order.transactionId}</p>
        <p style="margin: 6px 0;"><strong>Shipping To:</strong><br>
          ${order.address},<br>
          ${order.city}, ${order.state} — ${order.pincode}
        </p>
      </div>

      <p>We are preparing your package and will share tracking information as soon as it ships.</p>
      
      <div style="margin-top: 36px; padding-top: 20px; border-top: 1px solid #E5E7EB; color: #6B7280; font-size: 13px;">
        <p style="margin: 0;">JazakAllah Khair,<br><strong>Namas Mate Team</strong></p>
      </div>
    </div>
  `;

  if (!resend) {
    console.log("=== SIMULATING CONFIRMATION EMAIL ===");
    console.log(`[Customer Email] TO: ${order.email} | SUBJECT: Namas Mate - Order Confirmed!`);
    console.log("=====================================");
    return { success: true, logged: true };
  }

  const result = await resend.emails.send({
    from: fromLabel,
    to: order.email,
    subject: "Namas Mate — Your Order is Confirmed! ✅",
    html: customerHtml,
  });

  if (result.error) {
    console.error("[Resend] Error sending confirmation email:", result.error);
    throw new Error(result.error.message);
  }

  return { success: true };
}
