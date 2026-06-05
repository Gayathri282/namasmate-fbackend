import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { dbConnect } from "./lib/db";
import Admin from "./models/Admin";
import Setting from "./models/Setting";
import Product from "./models/Product";
import Order, { OrderStatus } from "./models/Order";
import { authenticateAdmin, AuthenticatedRequest } from "./middleware/auth";
import { sendOrderEmails, sendManualConfirmationEmail } from "./lib/email";

// Load Environment Variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "namas_mate_extremely_secure_jwt_token_secret_2026";

// Middlewares
app.use(cors());
app.use(express.json());

// Seeding function
async function seedDatabase() {
  try {
    // 1. Admin — NOT auto-seeded. Create your account via POST /api/auth/register or directly in DB.
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      console.log("[Seed] ⚠️  No admin account found. Please create one manually via the DB or a registration endpoint.");
    } else {
      console.log(`[Seed] ✅ Admin account(s) found: ${adminCount}`);
    }

    // 2. Settings
    const settingsCount = await Setting.countDocuments();
    if (settingsCount === 0) {
      await Setting.create({
        upiQrCode: "",
        upiId: "sujoodmate@upi",
        contactEmail: "support@sujoodmate.com",
        contactPhone: "+91 98765 43210",
        heroBannerUrl: "https://res.cloudinary.com/demo/image/upload/v1652967198/cld-sample-5.jpg",
        heroBannerType: "image"
      });
      console.log("[Seed] Created default system settings");
    }

    // 3. Product
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      await Product.create({
        name: "Sujood Mate Premium Orthopedic Mat",
        description: "Experience ultimate comfort during prayer with our Premium Orthopedic Prayer Mat. Specifically engineered with double-layered memory foam, it provides unmatched support for knees, ankles, and forehead. The surface is crafted from plush, ultra-soft Turkish velvet featuring intricate, gold-threaded Islamic geometric borders. Designed to keep you focused and pain-free, it also includes a built-in pocket for your prayer beads or booklet.",
        price: 1999,
        salePrice: 1499,
        shippingCharge: 0,
        images: [
          "https://res.cloudinary.com/demo/image/upload/v1652967198/cld-sample-5.jpg",
          "https://res.cloudinary.com/demo/image/upload/v1652967197/cld-sample-4.jpg",
        ],
        videos: [],
        variants: ["Emerald Green", "Royal Blue", "Crimson Red"],
        isActive: true,
      });
      console.log("[Seed] Created default prayer mat product");
    }
  } catch (error) {
    console.error("[Seed] Error seeding database:", error);
  }
}

// ---------------------------------------------------------------------------
// 1. AUTH ROUTES
// ---------------------------------------------------------------------------
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, admin.hashedPassword);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: admin._id.toString(), email: admin.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      admin: {
        id: admin._id.toString(),
        email: admin.email,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// One-time admin registration — only works when NO admin exists in the DB yet
app.post("/api/auth/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const adminCount = await Admin.countDocuments();
    if (adminCount > 0) {
      return res.status(403).json({ error: "Admin already exists. Registration is disabled." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await Admin.create({ email, hashedPassword });
    console.log(`[Auth] ✅ New admin registered: ${email}`);

    const token = jwt.sign(
      { id: admin._id.toString(), email: admin.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      message: "Admin account created successfully",
      token,
      admin: { id: admin._id.toString(), email: admin.email },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.put("/api/auth/credentials", authenticateAdmin as any, async (req: AuthenticatedRequest, res) => {
  const { currentPassword, newEmail, newPassword } = req.body;
  if (!currentPassword) {
    return res.status(400).json({ error: "Current password is required to make changes" });
  }

  try {
    const admin = await Admin.findById(req.admin?.id);
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, admin.hashedPassword);
    if (!isMatch) {
      return res.status(401).json({ error: "Incorrect current password" });
    }

    // Update email if provided
    if (newEmail && newEmail !== admin.email) {
      const existing = await Admin.findOne({ email: newEmail });
      if (existing) {
        return res.status(400).json({ error: "Email is already in use" });
      }
      admin.email = newEmail;
    }

    // Update password if provided
    if (newPassword && newPassword.length > 0) {
      admin.hashedPassword = await bcrypt.hash(newPassword, 10);
    }

    await admin.save();
    return res.json({ message: "Credentials updated successfully. Please log in again." });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// 2. SETTINGS ROUTES
// ---------------------------------------------------------------------------
app.get("/api/settings", async (req, res) => {
  try {
    const settings = await Setting.findOne();
    return res.json(settings);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.put("/api/settings", authenticateAdmin as any, async (req: AuthenticatedRequest, res) => {
  try {
    const body = req.body;
    let settings = await Setting.findOne();
    
    if (!settings) {
      settings = new Setting(body);
    } else {
      settings.upiQrCode = body.upiQrCode ?? settings.upiQrCode;
      settings.upiId = body.upiId ?? settings.upiId;
      settings.contactEmail = body.contactEmail ?? settings.contactEmail;
      settings.contactPhone = body.contactPhone ?? settings.contactPhone;
      settings.heroBannerUrl = body.heroBannerUrl ?? settings.heroBannerUrl;
      settings.heroBannerType = body.heroBannerType ?? settings.heroBannerType;
    }

    await settings.save();
    return res.json(settings);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// 3. PRODUCTS ROUTES
// ---------------------------------------------------------------------------
app.get("/api/products", async (req, res) => {
  const activeOnly = req.query.activeOnly === "true";
  const filter = activeOnly ? { isActive: true } : {};
  try {
    const products = await Product.find(filter).sort({ createdAt: -1 });
    return res.json(products);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post("/api/products", authenticateAdmin as any, async (req: AuthenticatedRequest, res) => {
  const { name, description, price, salePrice, shippingCharge, images, videos, video, variants, isActive } = req.body;
  if (!name || !description || price === undefined) {
    return res.status(400).json({ error: "Name, description and price are required" });
  }

  try {
    // Support legacy single `video` string — merge into videos array
    const videosArray: string[] = Array.isArray(videos) ? videos : [];
    if (video && !videosArray.includes(video)) videosArray.push(video);

    const newProduct = await Product.create({
      name,
      description,
      price: Number(price),
      salePrice: salePrice !== undefined ? Number(salePrice) : 0,
      shippingCharge: shippingCharge !== undefined ? Number(shippingCharge) : 0,
      images: images || [],
      videos: videosArray,
      variants: variants || [],
      isActive: isActive !== undefined ? isActive : true,
    });
    return res.status(201).json(newProduct);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.put("/api/products/:id", authenticateAdmin as any, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const body = req.body;

  try {
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    product.name = body.name ?? product.name;
    product.description = body.description ?? product.description;
    product.price = body.price !== undefined ? Number(body.price) : product.price;
    product.salePrice = body.salePrice !== undefined ? Number(body.salePrice) : (product.salePrice ?? 0);
    product.shippingCharge = body.shippingCharge !== undefined ? Number(body.shippingCharge) : product.shippingCharge;
    product.images = body.images ?? product.images;
    product.videos = body.videos ?? product.videos;
    product.variants = body.variants ?? product.variants;
    product.isActive = body.isActive !== undefined ? body.isActive : product.isActive;

    await product.save();
    return res.json(product);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.delete("/api/products/:id", authenticateAdmin as any, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  try {
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    return res.json({ message: "Product deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// 4. ORDERS ROUTES
// ---------------------------------------------------------------------------
app.get("/api/orders", authenticateAdmin as any, async (req: AuthenticatedRequest, res) => {
  try {
    const orders = await Order.find()
      .populate("productId", "name price")
      .sort({ createdAt: -1 });
    return res.json(orders);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post("/api/orders", async (req, res) => {
  const {
    customerName,
    email,
    phone,
    address,
    city,
    state,
    pincode,
    productId,
    amount,
    transactionId,
  } = req.body;

  if (
    !customerName ||
    !email ||
    !phone ||
    !address ||
    !city ||
    !state ||
    !pincode ||
    !productId ||
    !amount ||
    !transactionId
  ) {
    return res.status(400).json({ error: "All order fields are required" });
  }

  try {
    // Check for duplicate Transaction ID
    const duplicate = await Order.findOne({ transactionId });
    if (duplicate) {
      return res.status(400).json({ error: "An order with this Transaction ID has already been submitted." });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const newOrder = await Order.create({
      customerName,
      email,
      phone,
      address,
      city,
      state,
      pincode,
      productId,
      amount: Number(amount),
      transactionId,
      status: OrderStatus.PENDING,
    });

    // Send emails (ignores if config is default SMTP settings)
    try {
      await sendOrderEmails({
        order: newOrder,
        productName: product.name,
      });
    } catch (emailErr) {
      console.error("[Email Error] Failed to send order emails:", emailErr);
    }

    return res.status(201).json({ message: "Order placed successfully", order: newOrder });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.put("/api/orders/:id", authenticateAdmin as any, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: "Status is required" });
  }

  try {
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    order.status = status as OrderStatus;
    await order.save();
    return res.json(order);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// 5. EMAIL TRIGGER ROUTES
// ---------------------------------------------------------------------------
app.post("/api/email/manual", authenticateAdmin as any, async (req: AuthenticatedRequest, res) => {
  const { orderId } = req.body;
  if (!orderId) {
    return res.status(400).json({ error: "Order ID is required" });
  }

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const product = await Product.findById(order.productId);
    const productName = product ? product.name : "Premium Prayer Mat";

    const emailResult = await sendManualConfirmationEmail({
      order,
      productName,
    });

    return res.json({
      message: "Manual confirmation email sent successfully",
      logged: !!emailResult.logged,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Start Server
app.listen(PORT, async () => {
  console.log(`[Server] Running on port ${PORT}`);
  await dbConnect();
  await seedDatabase();
});
