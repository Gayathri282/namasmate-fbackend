import nodemailer from "nodemailer";

const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass || user.includes("your_") || pass.includes("your_")) {
    console.warn("[Nodemailer] SMTP settings are not configured. Emails will be logged to console.");
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user,
      pass,
    },
  });
};

export async function sendOrderEmails({
  order,
  productName,
}: {
  order: any;
  productName: string;
}) {
  const transporter = getTransporter();
  const fromEmail = process.env.EMAIL_FROM || "orders@sujoodmate.com";

  const customerHtml = `
    <div style="font-family: serif; color: #1B4332; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #FAF7F0; background-color: #FAF7F0;">
      <h2 style="color: #C9A84C; border-bottom: 2px solid #C9A84C; padding-bottom: 10px;">Sujood Mate Order Received</h2>
      <p>Assalamu Alaikum <strong>${order.customerName}</strong>,</p>
      <p>Thank you for ordering with Sujood Mate. We have received your order details and transaction ID.</p>
      
      <div style="background-color: #ffffff; padding: 15px; border-left: 4px solid #1B4332; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #1B4332;">Order Summary</h3>
        <p><strong>Product:</strong> ${productName}</p>
        <p><strong>Amount Paid:</strong> ₹${order.amount}</p>
        <p><strong>Transaction ID / UTR:</strong> ${order.transactionId}</p>
        <p><strong>Shipping Address:</strong><br>
          ${order.address},<br>
          ${order.city}, ${order.state} - ${order.pincode}
        </p>
      </div>

      <p style="font-weight: bold;">Your order is under review. We will confirm your order and initiate shipping once your payment is verified.</p>
      
      <p>If you have any questions, feel free to contact us.</p>
      
      <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #1B4332; font-style: italic; color: #2D6A4F;">
        <p>JazakAllah Khair,<br><strong>Sujood Mate Team</strong></p>
      </div>
    </div>
  `;

  const adminHtml = `
    <div style="font-family: sans-serif; color: #111; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>New Order Placed on Sujood Mate</h2>
      <p>A new order has been submitted and is pending verification.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <tr style="background-color: #f8f9fa;"><td style="padding: 8px; border: 1px solid #ddd;"><strong>Customer Name</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${order.customerName}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Email</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${order.email}</td></tr>
        <tr style="background-color: #f8f9fa;"><td style="padding: 8px; border: 1px solid #ddd;"><strong>Phone</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${order.phone}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Amount</strong></td><td style="padding: 8px; border: 1px solid #ddd;">₹${order.amount}</td></tr>
        <tr style="background-color: #f8f9fa;"><td style="padding: 8px; border: 1px solid #ddd;"><strong>Transaction ID</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${order.transactionId}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Address</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${order.address}, ${order.city}, ${order.state} - ${order.pincode}</td></tr>
        <tr style="background-color: #f8f9fa;"><td style="padding: 8px; border: 1px solid #ddd;"><strong>Product Name</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${productName}</td></tr>
      </table>
    </div>
  `;

  if (!transporter) {
    console.log("=== SIMULATING ORDER EMAILS ===");
    console.log(`FROM: ${fromEmail}`);
    console.log(`TO (Customer): ${order.email}`);
    console.log(`SUBJECT: Sujood Mate - Order Received`);
    console.log(`CUSTOMER BODY:\n`, customerHtml);
    console.log("===============================");
    console.log(`TO (Admin): ${fromEmail}`);
    console.log(`SUBJECT: [Admin Alert] New Sujood Mate Order`);
    console.log(`ADMIN BODY:\n`, adminHtml);
    console.log("===============================");
    return { success: true, logged: true };
  }

  try {
    await transporter.sendMail({
      from: `"Sujood Mate" <${fromEmail}>`,
      to: order.email,
      subject: "Sujood Mate - Order Received",
      html: customerHtml,
    });

    await transporter.sendMail({
      from: `"Sujood Mate Notification" <${fromEmail}>`,
      to: fromEmail,
      subject: "[Admin Alert] New Sujood Mate Order",
      html: adminHtml,
    });

    return { success: true };
  } catch (error) {
    console.error("[Nodemailer] Error sending order emails:", error);
    throw error;
  }
}

export async function sendManualConfirmationEmail({
  order,
  productName,
}: {
  order: any;
  productName: string;
}) {
  const transporter = getTransporter();
  const fromEmail = process.env.EMAIL_FROM || "orders@sujoodmate.com";

  const customerHtml = `
    <div style="font-family: serif; color: #1B4332; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #FAF7F0; background-color: #FAF7F0;">
      <h2 style="color: #C9A84C; border-bottom: 2px solid #C9A84C; padding-bottom: 10px;">Sujood Mate Order Confirmed!</h2>
      <p>Assalamu Alaikum <strong>${order.customerName}</strong>,</p>
      <p>We are pleased to inform you that your payment has been verified, and your order for <strong>${productName}</strong> is now <strong>Confirmed</strong>!</p>
      
      <div style="background-color: #ffffff; padding: 15px; border-left: 4px solid #C9A84C; margin: 20px 0;">
        <p><strong>Order Status:</strong> ${order.status}</p>
        <p><strong>Amount Paid:</strong> ₹${order.amount}</p>
        <p><strong>Transaction ID:</strong> ${order.transactionId}</p>
        <p><strong>Shipping Details:</strong><br>
          ${order.address},<br>
          ${order.city}, ${order.state} - ${order.pincode}
        </p>
      </div>

      <p>We are preparing your package and will share tracking information as soon as it is shipped.</p>
      
      <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #1B4332; font-style: italic; color: #2D6A4F;">
        <p>JazakAllah Khair,<br><strong>Sujood Mate Team</strong></p>
      </div>
    </div>
  `;

  if (!transporter) {
    console.log("=== SIMULATING MANUAL EMAIL ===");
    console.log(`FROM: ${fromEmail}`);
    console.log(`TO: ${order.email}`);
    console.log(`SUBJECT: Sujood Mate - Order Confirmed!`);
    console.log(`BODY:\n`, customerHtml);
    console.log("================================");
    return { success: true, logged: true };
  }

  try {
    await transporter.sendMail({
      from: `"Sujood Mate" <${fromEmail}>`,
      to: order.email,
      subject: "Sujood Mate - Order Confirmed!",
      html: customerHtml,
    });
    return { success: true };
  } catch (error) {
    console.error("[Nodemailer] Error sending manual confirmation email:", error);
    throw error;
  }
}
