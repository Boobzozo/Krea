const express = require("express");
const session = require("express-session");
const sessionFileStore = require("session-file-store");
const { createServer: createViteServer } = require("vite");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const { Resend } = require("resend");
const axios = require("axios");
const { Server } = require("socket.io");
const http = require("http");

dotenv.config();

// Add global error handlers for early crash detection on Hostinger
process.on('uncaughtException', (err) => {
  console.error('CRITICAL: Uncaught Exception!', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log("Starting server process (CommonJS mode)...");
console.log("Node version:", process.versions.node);
console.log("Current working directory:", process.cwd());

const FileStore = sessionFileStore(session);

// Emplacement de la base — elle DOIT être persistante entre les déploiements.
// Sur Hostinger, l'app tourne dans .../public_html qui est effacé à chaque
// déploiement Git : y stocker krea.db la réinitialise à chaque fois.
// Résolution (par ordre de priorité) :
//   1. DB_PATH explicite (absolu, ou relatif au dossier personnel os.homedir()).
//   2. Détection auto Hostinger : si l'app tourne dans "public_html", on place
//      la base dans ~/krea-data (dossier personnel, JAMAIS écrasé au déploiement).
//   3. Sinon (dev local), krea.db à côté de l'app.
const os = require("os");
let dbPath;
if (process.env.DB_PATH) {
  dbPath = path.isAbsolute(process.env.DB_PATH)
    ? process.env.DB_PATH
    : path.join(os.homedir(), process.env.DB_PATH);
} else if (__dirname.includes("public_html") && os.homedir()) {
  // Serveur Hostinger : hors du dossier déployé.
  dbPath = path.join(os.homedir(), "krea-data", "krea.db");
} else {
  // Développement local.
  dbPath = path.join(__dirname, "krea.db");
}
console.log(`[DB] Chemin de la base retenu : ${dbPath}`);
// Crée le dossier de destination s'il n'existe pas encore (évite un crash au 1er lancement).
try {
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
} catch (e) {
  console.error("[DB] Impossible de créer le dossier de la base:", e.message);
}
const resendSecret = process.env.RESEND_API_KEY;
const resend = resendSecret ? new Resend(resendSecret) : null;

let db;
let dbInitializationError = null;

/**
 * Robust Database Initialization Function for Hostinger
 */
function initializeDatabase() {
  try {
    console.log(`[DB] Starting initialization...`);
    
    let BetterSqlite3;
    try {
      BetterSqlite3 = require("better-sqlite3");
      console.log(`[DB] better-sqlite3 required successfully`);
    } catch (importErr) {
      console.error("[DB] CRITICAL: Failed to require better-sqlite3. Database will not be available.", importErr.message);
      dbInitializationError = importErr;
      return;
    }
    
    console.log(`[DB] Opening database at: ${dbPath}`);
    db = new BetterSqlite3(dbPath);
    
    // Basic tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        service_type TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        status TEXT DEFAULT 'confirmed',
        google_event_id TEXT
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS google_tokens (
        id INTEGER PRIMARY KEY DEFAULT 1,
        access_token TEXT,
        refresh_token TEXT,
        expiry_date INTEGER
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reservation_id TEXT,
        customer TEXT,
        service TEXT,
        date TEXT,
        time TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_read INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS webhook_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event TEXT,
        url TEXT,
        payload TEXT,
        response TEXT,
        status INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      INSERT OR IGNORE INTO settings (key, value) VALUES ('show_gallery', 'true');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('show_about', 'true');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('admin_password', 'admin123');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('opening_hours', '{"monday":{"open":"09:00","close":"19:00","closed":true},"tuesday":{"open":"09:00","close":"19:00","closed":true},"wednesday":{"open":"14:00","close":"18:00","closed":false},"thursday":{"open":"14:00","close":"19:00","closed":false},"friday":{"open":"09:00","close":"19:00","closed":true},"saturday":{"open":"09:00","close":"18:00","closed":true},"sunday":{"open":"09:00","close":"12:00","closed":true}}');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('hero_image', 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&q=80&w=2000');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('profile_image', 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?auto=format&fit=crop&q=80&w=1000');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('discount_rules', '[{"participants":2,"discount":10},{"participants":3,"discount":15},{"participants":4,"discount":20},{"participants":5,"discount":25}]');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('price_kids', '25');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('price_adults', '35');
    `);

    // Sync admin password from environment variable if provided
    const envAdminPassword = (process.env.ADMIN_PASSWORD || process.env.admin_password || "").trim();
    if (envAdminPassword) {
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('admin_password', ?)").run(envAdminPassword);
      console.log("Admin password synced from environment variables.");
    }

    // Extended tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS services (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        duration INTEGER NOT NULL,
        category_id TEXT,
        capacity INTEGER DEFAULT 8,
        day_of_week TEXT,
        start_time TEXT,
        is_group_rate INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        display_order INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS gallery (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        caption TEXT,
        display_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migrations & Seeding
    try { db.prepare("ALTER TABLE gallery ADD COLUMN display_order INTEGER DEFAULT 0").run(); } catch (e) {}
    try { db.prepare("ALTER TABLE services ADD COLUMN is_group_rate INTEGER DEFAULT 1").run(); } catch (e) {}
    try { db.prepare("ALTER TABLE services ADD COLUMN category_id TEXT").run(); } catch (e) {}
    try { db.prepare("ALTER TABLE bookings ADD COLUMN participants INTEGER DEFAULT 1").run(); } catch (e) {}
    try { db.prepare("ALTER TABLE bookings ADD COLUMN total_price REAL").run(); } catch (e) {}
    try { db.prepare("ALTER TABLE bookings ADD COLUMN customer_phone TEXT").run(); } catch (e) {}
    try { db.prepare("ALTER TABLE bookings ADD COLUMN message TEXT").run(); } catch (e) {}
    try { db.prepare("ALTER TABLE bookings ADD COLUMN reservation_id TEXT").run(); } catch (e) {}
    try { db.prepare("ALTER TABLE bookings ADD COLUMN google_event_id TEXT").run(); } catch (e) {}

    // Seed gallery if empty
    const galleryCount = db.prepare("SELECT COUNT(*) as count FROM gallery").get() as { count: number };
    if (galleryCount.count === 0) {
      const insertGallery = db.prepare("INSERT INTO gallery (url, caption, display_order) VALUES (?, ?, ?)");
      insertGallery.run('https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?auto=format&fit=crop&q=80&w=800', 'Exploration chromatique', 1);
      insertGallery.run('https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80&w=800', 'Texture et matière', 2);
      insertGallery.run('https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=800', 'Mouvement fluide', 3);
    }

    // Seed default categories if empty
    const categoriesCount = db.prepare("SELECT COUNT(*) as count FROM categories").get() as { count: number };
    if (categoriesCount.count === 0) {
      const insertCat = db.prepare("INSERT INTO categories (id, name, display_order) VALUES (?, ?, ?)");
      insertCat.run("enfants", "Enfants & Ados", 1);
      insertCat.run("adultes", "Adultes", 2);
      insertCat.run("entreprises", "Entreprises", 3);
    }

    // Seed default services if empty
    const servicesCount = db.prepare("SELECT COUNT(*) as count FROM services").get() as { count: number };
    if (servicesCount.count === 0) {
      const insert = db.prepare("INSERT INTO services (id, name, price, duration, category_id, capacity, day_of_week, start_time, is_group_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
      insert.run("enfants-mercredi-1", "Atelier Enfants 14h-15h30", 25, 90, "enfants", 10, "wednesday", "14:00", 1);
      insert.run("adultes-jeudi-1", "Atelier Adultes 14h-16h", 35, 120, "adultes", 8, "thursday", "14:00", 1);
    }

    console.log("Database initialized successfully.");
  } catch (err) {
    console.error("FATAL: Database initialization failed!", err);
    dbInitializationError = err as Error;
  }
}

async function getGoogleAccessToken() {
  if (!db) return null;
  try {
    const token = db.prepare("SELECT * FROM google_tokens WHERE id = 1").get() as any;
    if (!token || !token.refresh_token) return null;

    // If token is expired or about to expire (within 5 mins)
    if (Date.now() > (token.expiry_date - 300000)) {
      try {
        const response = await axios.post('https://oauth2.googleapis.com/token', {
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          refresh_token: token.refresh_token,
          grant_type: 'refresh_token',
        });

        const { access_token, expires_in } = response.data;
        const expiry_date = Date.now() + expires_in * 1000;

        db.prepare("UPDATE google_tokens SET access_token = ?, expiry_date = ? WHERE id = 1")
          .run(access_token, expiry_date);

        return access_token;
      } catch (error) {
        console.error("Error refreshing Google token:", error);
        return null;
      }
    }

    return token.access_token;
  } catch (error) {
    console.error("Error query database for google token:", error);
    return null;
  }
}

async function startServer() {
  console.log("startServer() execution started");
  const app = express();
  const server = http.createServer(app);
  
  const PORT = process.env.PORT || 3000;
  console.log(`Port detected: ${PORT}`);

  // Health check - DEFINED FIRST
  app.get("/api/health", (req, res) => {
    console.log("Health check request received at:", new Date().toISOString());
    res.json({ 
      status: "ok", 
      time: new Date().toISOString(),
      env: process.env.NODE_ENV,
      cwd: process.cwd(),
      node: process.version,
      dbStatus: db ? "initialized" : "pending/none"
    });
  });

  // Start listening immediately to avoid 503 from Hostinger
  const serverInstance = server.listen(PORT, () => {
    console.log(`==== SERVER IS LIVE ON PORT ${PORT} ====`);
  });

  // Root test route - NO MIDDLEWARE NEEDED
  app.get("/api/test", (req, res) => {
    res.send("Server is responding!");
  });

  serverInstance.on('error', (err: any) => {
    console.error("CRITICAL: Server failed to listen!", err);
  });

  // Now continue with the rest in the background or sequentially
  // This ensures the server is "live" even if DB or Vit fails
  
  let io: any;
  try {
    io = new Server(server);
    console.log("Socket.io initialized");
  } catch (err) {
    console.error("Failed to initialize Socket.io", err);
  }

  // Database initialization
  try {
    initializeDatabase();
  } catch (dbErr) {
    console.error("Delayed database initialization error:", dbErr);
  }

  // Middlewares
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Trust proxy for Hostinger
  app.set('trust proxy', 1);

  const appUrlRaw = process.env.APP_URL || "";
  const appUrl = appUrlRaw.startsWith("http") ? appUrlRaw.replace(/\/$/, "") : `https://${appUrlRaw}`.replace(/\/$/, "");
  console.log(`Configured APP_URL: ${appUrl}`);

  if (io) {
    io.on("connection", (socket: any) => {
      console.log("Client connected to socket");
    });
  }

  // Ensure sessions directory exists
  const sessionsPath = path.join(__dirname, 'sessions');
  try {
    if (!fs.existsSync(sessionsPath)) {
      console.log(`Creating sessions directory at ${sessionsPath}...`);
      fs.mkdirSync(sessionsPath, { recursive: true });
    }
  } catch (err) {
    console.error("Warning: Could not create sessions directory", err);
  }

  // Session configuration optimized for Hostinger
  const sessionSecret = process.env.SESSION_SECRET || (() => {
    console.error('⚠️  WARNING: SESSION_SECRET not set! Using auto-generated secret. Configure SESSION_SECRET in environment variables for production.');
    return require('crypto').randomBytes(32).toString('hex');
  })();

  app.use(session({
    store: new FileStore({
      path: sessionsPath,
      retries: 2,
      logFn: () => {}
    }),
    secret: sessionSecret,
    resave: true,
    saveUninitialized: true,
    name: 'krea.sid',
    proxy: true,
    cookie: {
      secure: true,
      httpOnly: true,
      sameSite: 'none',
      maxAge: 30 * 24 * 60 * 60 * 1000
    }
  }));

  // Middleware to require admin authentication
  const requireAdmin = (req: any, res: any, next: any) => {
    if (req.session && req.session.isAdmin) {
      next();
    } else {
      res.status(401).json({ error: "Non autorisé" });
    }
  };

  // Auth Routes
  app.get("/api/debug", requireAdmin, (req, res) => {
    const sCount = db.prepare("SELECT COUNT(*) as count FROM services").get() as any;
    const cCount = db.prepare("SELECT COUNT(*) as count FROM categories").get() as any;
    res.json({
      node_env: process.env.NODE_ENV,
      db_path: dbPath,
      services_count: sCount.count,
      categories_count: cCount.count,
      sessions_writable: fs.existsSync(sessionsPath)
    });
  });

  // Auth Routes
  app.post("/api/login", (req, res) => {
    let { password } = req.body;
    password = (password || "").trim();
    
    const settings = db.prepare("SELECT value FROM settings WHERE key = 'admin_password'").get() as { value: string };
    const storedPassword = (settings?.value || 'admin123').trim();
    
    console.log(`Login attempt: input_length=${password.length}, stored_length=${storedPassword.length}`);
    
    if (password === storedPassword) {
      console.log("Login successful");
      (req as any).session.isAdmin = true;
      res.json({ success: true });
    } else {
      console.log("Login failed: Incorrect password");
      res.status(401).json({ error: "Mot de passe incorrect" });
    }
  });

  app.get("/api/check-auth", (req, res) => {
    res.json({ isAdmin: !!(req as any).session?.isAdmin });
  });

  app.post("/api/logout", (req, res) => {
    (req as any).session.destroy(() => {
      res.json({ success: true });
    });
  });

  // Request logging
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  app.get("/api/services", (req, res) => {
    const services = db.prepare("SELECT * FROM services").all();
    res.json(services);
  });

  app.post("/api/services", requireAdmin, (req, res) => {
    const services = req.body as any[];
    if (!Array.isArray(services)) return res.status(400).json({ error: "Invalid data" });

    try {
      const deleteStmt = db.prepare("DELETE FROM services");
      const insertStmt = db.prepare("INSERT INTO services (id, name, price, duration, category_id, capacity, day_of_week, start_time, is_group_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
      
      const transaction = db.transaction((data) => {
        deleteStmt.run();
        for (const s of data) {
          insertStmt.run(s.id || Math.random().toString(36).substr(2, 9), s.name, s.price, s.duration, s.category_id, s.capacity || 8, s.day_of_week || null, s.start_time || null, s.is_group_rate ? 1 : 0);
        }
      });

      transaction(services);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating services:", error);
      res.status(500).json({ error: "Failed to update services" });
    }
  });

  app.get("/api/categories", (req, res) => {
    const categories = db.prepare("SELECT * FROM categories ORDER BY display_order ASC").all();
    res.json(categories);
  });

  app.post("/api/categories", requireAdmin, (req, res) => {
    const categories = req.body as any[];
    if (!Array.isArray(categories)) return res.status(400).json({ error: "Invalid data" });

    try {
      const deleteStmt = db.prepare("DELETE FROM categories");
      const insertStmt = db.prepare("INSERT INTO categories (id, name, display_order) VALUES (?, ?, ?)");
      
      const transaction = db.transaction((data) => {
        deleteStmt.run();
        for (let i = 0; i < data.length; i++) {
          const c = data[i];
          insertStmt.run(c.id || Math.random().toString(36).substr(2, 9), c.name, i);
        }
      });

      transaction(categories);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating categories:", error);
      res.status(500).json({ error: "Failed to update categories" });
    }
  });

  app.get("/api/bookings", requireAdmin, (req, res) => {
    const date = req.query.date as string;
    if (date) {
      const bookings = db.prepare("SELECT * FROM bookings WHERE start_time LIKE ? ORDER BY start_time DESC").all(`${date}%`);
      res.json(bookings);
    } else {
      const bookings = db.prepare("SELECT * FROM bookings ORDER BY start_time DESC LIMIT 50").all();
      res.json(bookings);
    }
  });

  app.post("/api/bookings", async (req, res) => {
    try {
      const { firstName, lastName, customer_name, customer_email, customer_phone, message, service_type, start_time, end_time, participants, total_price } = req.body;
      const googleAccessToken = await getGoogleAccessToken();
      
      // 1. Local availability check (Disabled by user request - no quota for now)
      /*
      const localOverlap = db.prepare(`
        SELECT COUNT(*) as count FROM bookings 
        WHERE (start_time < ? AND end_time > ?)
        AND status = 'confirmed'
      `).get(end_time, start_time) as { count: number };

      if (localOverlap.count > 0) {
        return res.status(400).json({ error: "Ce créneau est déjà réservé sur le site." });
      }
      */

      const reservationId = `KREA-${Date.now().toString().slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`;

      // 2. Save locally
      const stmt = db.prepare(`
        INSERT INTO bookings (customer_name, customer_email, customer_phone, message, service_type, start_time, end_time, participants, total_price, reservation_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(customer_name, customer_email, customer_phone || null, message || null, service_type, start_time, end_time, participants || 1, total_price || 0, reservationId);
      const localId = result.lastInsertRowid;

      // 3. Async Secondary Tasks (Email & Webhook)
      (async () => {
        try {
          // timeZone obligatoire : le serveur (Hostinger) tourne en UTC,
          // sans lui les mails affichent une heure décalée de 1-2h
          const dateStr = new Date(start_time).toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'Europe/Paris'
          });
          const timeStr = new Date(start_time).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Paris'
          });

          // Fetch service details for more accurate payload
          const service = db.prepare(`
            SELECT s.duration, s.price, c.name as category_name 
            FROM services s 
            LEFT JOIN categories c ON s.category_id = c.id 
            WHERE s.name = ?
          `).get(service_type) as { duration: number, price: number, category_name: string } | undefined;

          // Si le service n'est pas en base (ex. événement spécial), on déduit la durée des horaires
          const computedDuration = Math.round((new Date(end_time).getTime() - new Date(start_time).getTime()) / 60000);
          const duration = service?.duration || (computedDuration > 0 ? computedDuration : 0);
          const unitPrice = service?.price || 0;
          const categoryName = service?.category_name || "Atelier";
          const subtotal = unitPrice * (participants || 1);
          const discountAmount = subtotal - (total_price || subtotal);
          const discountPercent = subtotal > 0 ? Math.round((discountAmount / subtotal) * 100) : 0;

          // 1. Email to Customer — uniquement en secours si n8n n'est pas configuré,
          // sinon le client recevrait deux confirmations (Resend + Gmail via n8n)
          if (resend && !process.env.N8N_WEBHOOK_URL) {
            try {
              await resend.emails.send({
                from: 'Kréa <onboarding@resend.dev>',
                to: customer_email,
                subject: 'Confirmation de votre atelier - Kréa',
                html: `
                  <div style="font-family: serif; color: #121212; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h1 style="text-align: center; color: #C9A84C;">Kréa</h1>
                    <p>Bonjour <strong>${customer_name}</strong>,</p>
                    <p>Votre réservation pour l'atelier est confirmée ! Nous avons hâte de vous accueillir pour ce moment de création.</p>
                    <div style="background-color: #FAF8F5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                      <p style="margin: 5px 0;"><strong>Référence :</strong> ${reservationId}</p>
                      <p style="margin: 5px 0;"><strong>Atelier :</strong> ${service_type}</p>
                      <p style="margin: 5px 0;"><strong>Date :</strong> ${dateStr}</p>
                      <p style="margin: 5px 0;"><strong>Heure :</strong> ${timeStr}</p>
                      <p style="margin: 5px 0;"><strong>Participants :</strong> ${participants}</p>
                    </div>
                    <p style="font-size: 14px; color: #666;">Lieu : Moulay</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="text-align: center; font-size: 12px; color: #999;">&copy; ${new Date().getFullYear()} Kréa – Karine Fromentin. Tous droits réservés.</p>
                  </div>
                `
              });
            } catch (emailErr) {
              console.error("Email error:", emailErr);
            }
          }

          // 2. Webhook for n8n
          const webhookUrl = process.env.N8N_WEBHOOK_URL;
          if (webhookUrl) {
            console.log(`Sending webhook to n8n for booking ${reservationId}...`);
            const payload = {
              event: 'booking.created',
              source: 'krea',
              data: {
                reservation_id: reservationId,
                customerName: customer_name,
                firstName: firstName || customer_name.split(' ')[0],
                lastName: lastName || customer_name.split(' ').slice(1).join(' '),
                customer_email,
                customer_phone: customer_phone || null,
                service_type,
                service_category: categoryName,
                participants: participants || 1,
                duration,
                unit_price: unitPrice,
                total_price: total_price || subtotal,
                discount_percent: discountPercent,
                discount_amount: discountAmount,
                start_time,
                end_time,
                formatted_date: dateStr,
                formatted_time: timeStr,
                message: message || null
              }
            };

            try {
              const webhookResponse = await axios.post(webhookUrl, payload, { timeout: 10000 });
              console.log("n8n Webhook success:", webhookResponse.status);
              
              db.prepare("INSERT INTO webhook_logs (event, url, payload, response, status) VALUES (?, ?, ?, ?, ?)")
                .run('booking.created', webhookUrl, JSON.stringify(payload), JSON.stringify(webhookResponse.data), webhookResponse.status);

              // Update google_event_id if returned
              if (webhookResponse.data && webhookResponse.data.google_event_id) {
                db.prepare("UPDATE bookings SET google_event_id = ? WHERE id = ?").run(webhookResponse.data.google_event_id, localId);
              }
            } catch (webhookErr: any) {
              console.error("n8n Webhook error:", webhookErr.message);
              db.prepare("INSERT INTO webhook_logs (event, url, payload, response, status) VALUES (?, ?, ?, ?, ?)")
                .run('booking.created', webhookUrl, JSON.stringify(payload), JSON.stringify(webhookErr.response?.data || webhookErr.message), webhookErr.response?.status || 500);
            }
          }

          // 3. Create Local Notification
          try {
            const notifStmt = db.prepare(`
              INSERT INTO notifications (reservation_id, customer, service, date, time)
              VALUES (?, ?, ?, ?, ?)
            `);
            const result = notifStmt.run(reservationId, customer_name, service_type, dateStr, timeStr);

            const newNotif = {
              id: result.lastInsertRowid,
              reservation_id: reservationId,
              customer: customer_name,
              service: service_type,
              date: dateStr,
              time: timeStr,
              created_at: new Date().toISOString(),
              is_read: 0
            };

            if (io) {
              io.emit("notification", newNotif);
            }
          } catch (notifErr) {
            console.error("Error creating notification:", notifErr);
          }
        } catch (err) {
          console.error("Secondary tasks error:", err);
        }
      })();

      res.status(201).json({ success: true, reservation_id: reservationId });
    } catch (err: any) {
      console.error("Erreur lorse de la réservation:", err.message);
      res.status(500).json({ error: "Une erreur est survenue lors de la réservation." });
    }
  });

  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all();
    const settingsMap = settings.reduce((acc: any, curr: any) => {
      // Don't leak the real password to the frontend
      if (curr.key === 'admin_password') {
        acc[curr.key] = '********';
      } else {
        acc[curr.key] = curr.value;
      }
      return acc;
    }, {});
    res.json(settingsMap);
  });

  app.post("/api/settings", requireAdmin, (req, res) => {
    const { key, value, settings } = req.body;
    
    try {
      if (settings && typeof settings === 'object') {
        const updateStmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
        
        const transaction = db.transaction((data) => {
          for (const [k, v] of Object.entries(data)) {
            if (v !== undefined) {
              updateStmt.run(k, String(v));
            }
          }
        });
        transaction(settings);
      } else if (key) {
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, String(value));
      }

      if (io) {
        io.emit('data_updated', { type: 'settings' });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  app.get("/api/webhook/status", requireAdmin, (req, res) => {
    res.json({ 
      configured: !!process.env.N8N_WEBHOOK_URL,
      url: process.env.N8N_WEBHOOK_URL ? `${process.env.N8N_WEBHOOK_URL.substring(0, 20)}...` : null
    });
  });

  app.get("/api/webhook/logs", requireAdmin, (req, res) => {
    const logs = db.prepare("SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT 20").all();
    res.json(logs);
  });

  app.post("/api/webhook/test", requireAdmin, async (req, res) => {
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) return res.status(400).json({ error: "Webhook URL non configurée" });

    const payload = {
      event: 'test',
      source: 'krea-admin',
      timestamp: new Date().toISOString(),
      message: "Test manuel depuis le panel admin"
    };

    try {
      const response = await axios.post(webhookUrl, payload, { timeout: 10000 });
      db.prepare("INSERT INTO webhook_logs (event, url, payload, response, status) VALUES (?, ?, ?, ?, ?)")
        .run('test', webhookUrl, JSON.stringify(payload), JSON.stringify(response.data), response.status);
      res.json({ success: true, status: response.status, data: response.data });
    } catch (error: any) {
      db.prepare("INSERT INTO webhook_logs (event, url, payload, response, status) VALUES (?, ?, ?, ?, ?)")
        .run('test', webhookUrl, JSON.stringify(payload), JSON.stringify(error.response?.data || error.message), error.response?.status || 500);
      res.status(500).json({ error: error.message, status: error.response?.status });
    }
  });

  // Contact form submission
  app.post("/api/contact", async (req, res) => {
    try {
      const { name, email, phone, type, message } = req.body;
      if (!name || !email || !message) {
        return res.status(400).json({ error: "Nom, email et message sont obligatoires." });
      }

      // Send email via Resend
      if (resend) {
        try {
          await resend.emails.send({
            from: 'Kréa <onboarding@resend.dev>',
            to: 'fromentink@gmail.com',
            subject: `Nouveau message de ${name} - ${type}`,
            html: `
              <div style="font-family: serif; color: #121212; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #C9A84C;">Nouveau message de contact</h2>
                <p><strong>Nom :</strong> ${name}</p>
                <p><strong>Email :</strong> ${email}</p>
                <p><strong>Téléphone :</strong> ${phone || '-'}</p>
                <p><strong>Type de demande :</strong> ${type}</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                <p><strong>Message :</strong></p>
                <p>${message.replace(/\n/g, '<br>')}</p>
              </div>
            `
          });
        } catch (emailErr) {
          console.error("Email error:", emailErr);
        }
      }

      res.json({ success: true, message: "Votre message a été envoyé." });
    } catch (err: any) {
      console.error("Contact form error:", err);
      res.status(500).json({ error: "Une erreur est survenue." });
    }
  });

  // Notifications API
  app.get("/api/notifications", requireAdmin, (req, res) => {
    const notifications = db.prepare("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50").all();
    res.json(notifications);
  });

  app.post("/api/notifications/read-all", requireAdmin, (req, res) => {
    db.prepare("UPDATE notifications SET is_read = 1").run();
    res.json({ success: true });
  });

  app.post("/api/notifications/:id/read", requireAdmin, (req, res) => {
    const { id } = req.params;
    db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Fetch Google Calendar List
  app.get("/api/google/calendars", requireAdmin, async (req, res) => {
    const googleAccessToken = await getGoogleAccessToken();
    if (!googleAccessToken) {
      return res.status(401).json({ error: "Google Calendar non connecté" });
    }

    try {
      const response = await axios.get(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList',
        {
          headers: { Authorization: `Bearer ${googleAccessToken}` }
        }
      );
      res.json(response.data.items);
    } catch (error: any) {
      console.error("Error fetching calendar list:", error.response?.data || error.message);
      res.status(500).json({ error: "Erreur lors de la récupération de la liste des agendas" });
    }
  });

  // Fetch Google Calendar Events
  app.get("/api/google/events", requireAdmin, async (req, res) => {
    const { start, end } = req.query as { start: string, end: string };
    const googleAccessToken = await getGoogleAccessToken();
    
    const localStart = start?.replace('Z', '');
    const localEnd = end?.replace('Z', '');

    let events: any[] = [];

    // 1. Fetch from Google if possible
    if (googleAccessToken) {
      const calendarIdSetting = db.prepare("SELECT value FROM settings WHERE key = 'google_calendar_id'").get() as { value: string } | undefined;
      const calendarId = calendarIdSetting?.value || 'primary';

      try {
        const googleEventsResponse = await axios.get(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
          {
            params: {
              timeMin: start,
              timeMax: end,
              singleEvents: true,
              orderBy: 'startTime',
            },
            headers: { Authorization: `Bearer ${googleAccessToken}` }
          }
        );
        events = googleEventsResponse.data.items || [];
      } catch (error: any) {
        console.error("Error fetching Google events:", error.message);
      }
    }

    // 2. Fetch local bookings
    const localBookings = db.prepare(`
      SELECT id, customer_name as summary, service_type as description, start_time as start, end_time as end, google_event_id
      FROM bookings 
      WHERE start_time >= ? AND start_time <= ?
      AND status = 'confirmed'
    `).all(localStart, localEnd) as any[];

    const googleEventIds = new Set(events.map(e => e.id));
    
    const formattedLocal = localBookings
      .filter(b => !b.google_event_id || !googleEventIds.has(b.google_event_id))
      .map(b => ({
        id: `local-${b.id}`,
        summary: `${b.summary} (${b.description})`,
        description: `Réservation site: ${b.description}`,
        start: { dateTime: b.start },
        end: { dateTime: b.end },
        isLocal: true,
        isOrphaned: !!b.google_event_id // Mark as orphaned if it had a Google ID but wasn't found
      }));

    res.json([...events, ...formattedLocal]);
  });

  app.post("/api/google/events", requireAdmin, async (req, res) => {
    const { summary, start, end } = req.body;
    const googleAccessToken = await getGoogleAccessToken();
    
    if (!googleAccessToken) {
      return res.status(401).json({ error: "Google Calendar non connecté" });
    }

    const calendarIdSetting = db.prepare("SELECT value FROM settings WHERE key = 'google_calendar_id'").get() as { value: string } | undefined;
    const calendarId = (calendarIdSetting?.value || 'primary').trim();

    const cleanStart = start.split('.')[0].replace('Z', '').split('+')[0];
    const cleanEnd = end.split('.')[0].replace('Z', '').split('+')[0];

    try {
      const response = await axios.post(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          summary: summary || "Indisponibilité",
          start: { 
            dateTime: cleanStart,
            timeZone: 'Europe/Paris' 
          },
          end: { 
            dateTime: cleanEnd,
            timeZone: 'Europe/Paris' 
          },
        },
        {
          headers: { Authorization: `Bearer ${googleAccessToken}` }
        }
      );
      res.json(response.data);
    } catch (error: any) {
      console.error("Error creating Google event:", error.response?.data || error.message);
      res.status(500).json({ error: "Erreur lors de la création de l'événement" });
    }
  });

  app.delete("/api/google/events/:id", requireAdmin, async (req, res) => {
    const { id } = req.params;
    console.log(`Tentative de suppression de l'événement: ${id}`);
    
    // Handle legacy local IDs if they still appear in the UI
    if (id.startsWith('local-')) {
      const localId = id.replace('local-', '');
      db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(localId);
      return res.json({ success: true });
    }

    const googleAccessToken = await getGoogleAccessToken();
    if (!googleAccessToken) {
      return res.status(401).json({ error: "Google Calendar non connecté" });
    }

    const calendarIdSetting = db.prepare("SELECT value FROM settings WHERE key = 'google_calendar_id'").get() as { value: string } | undefined;
    const calendarId = calendarIdSetting?.value || 'primary';

    try {
      await axios.delete(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(id)}`,
        {
          headers: { Authorization: `Bearer ${googleAccessToken}` }
        }
      );
      
      // Update local DB only if it exists (for backward compatibility)
      db.prepare("UPDATE bookings SET status = 'cancelled' WHERE google_event_id = ?").run(id);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting event:", error.response?.data || error.message);
      // If event not found on Google, still return success to clear UI
      if (error.response?.status === 404 || error.response?.status === 410) {
        db.prepare("UPDATE bookings SET status = 'cancelled' WHERE google_event_id = ?").run(id);
        return res.json({ success: true });
      }
      res.status(500).json({ error: "Erreur lors de la suppression de l'événement" });
    }
  });

  // Bulk Sync Local Bookings to Google
  app.post("/api/google/sync", requireAdmin, async (req, res) => {
    const googleAccessToken = await getGoogleAccessToken();
    if (!googleAccessToken) {
      return res.status(401).json({ error: "Google Calendar non connecté" });
    }

    const calendarIdSetting = db.prepare("SELECT value FROM settings WHERE key = 'google_calendar_id'").get() as { value: string } | undefined;
    const calendarId = (calendarIdSetting?.value || 'primary').trim();

    const unsyncedBookings = db.prepare(`
      SELECT * FROM bookings 
      WHERE google_event_id IS NULL 
      AND status = 'confirmed'
    `).all() as any[];

    let syncedCount = 0;
    let errorCount = 0;

    for (const booking of unsyncedBookings) {
      const cleanStart = booking.start_time.split('.')[0].replace('Z', '').split('+')[0];
      const cleanEnd = booking.end_time.split('.')[0].replace('Z', '').split('+')[0];
      try {
        const googleResponse = await axios.post(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
          {
            summary: `${booking.customer_name} (${booking.service_type})`,
            description: `Réservation via le site Kréa. Client: ${booking.customer_name} (${booking.customer_email})`,
            start: { 
              dateTime: cleanStart,
              timeZone: 'Europe/Paris' 
            },
            end: { 
              dateTime: cleanEnd,
              timeZone: 'Europe/Paris' 
            },
          },
          {
            headers: { Authorization: `Bearer ${googleAccessToken}` }
          }
        );

        db.prepare("UPDATE bookings SET google_event_id = ? WHERE id = ?")
          .run(googleResponse.data.id, booking.id);
        
        syncedCount++;
      } catch (err: any) {
        console.error(`Error syncing booking ${booking.id}:`, err.message);
        errorCount++;
      }
    }

    res.json({ 
      success: true, 
      syncedCount, 
      errorCount,
      total: unsyncedBookings.length 
    });
  });

  // Google OAuth URL Generation
  app.get("/api/auth/google/url", requireAdmin, (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (!clientId || !appUrl) {
      return res.status(500).json({ 
        error: "Configuration manquante. Veuillez configurer GOOGLE_CLIENT_ID et APP_URL dans les Secrets de AI Studio." 
      });
    }

    const redirectUri = `${appUrl}/auth/google/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly",
      access_type: "offline",
      prompt: "consent"
    });
    res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
  });

  // Google OAuth Callback
  app.get("/auth/google/callback", async (req, res) => {
    const { code } = req.query;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (code && clientId && clientSecret && appUrl) {
      try {
        console.log(`Tentative d'échange de code avec ClientID: ${clientId.substring(0, 5)}...${clientId.substring(clientId.length - 5)}`);
        
        const params = new URLSearchParams();
        params.append('code', code as string);
        params.append('client_id', clientId);
        params.append('client_secret', clientSecret);
        params.append('redirect_uri', `${appUrl}/auth/google/callback`);
        params.append('grant_type', 'authorization_code');

        const response = await axios.post('https://oauth2.googleapis.com/token', params.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const { access_token, refresh_token, expires_in } = response.data;
        const expiry_date = Date.now() + expires_in * 1000;

        // Only update refresh_token if it's provided (Google only sends it on first consent)
        if (refresh_token) {
          db.prepare(`
            INSERT OR REPLACE INTO google_tokens (id, access_token, refresh_token, expiry_date)
            VALUES (1, ?, ?, ?)
          `).run(access_token, refresh_token, expiry_date);
        } else {
          db.prepare(`
            UPDATE google_tokens SET access_token = ?, expiry_date = ? WHERE id = 1
          `).run(access_token, expiry_date);
        }

      } catch (error: any) {
        console.error("Error exchanging Google code for tokens:", error.response?.data || error.message);
      }
    }

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/admin';
            }
          </script>
          <p>Connexion Google réussie. Cette fenêtre va se fermer.</p>
        </body>
      </html>
    `);
  });

  // --- Gallery Routes ---
  app.get("/api/gallery", (req, res) => {
    try {
      const images = db.prepare("SELECT * FROM gallery ORDER BY display_order ASC, created_at DESC").all();
      res.json(images);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch gallery images" });
    }
  });

  app.post("/api/gallery", requireAdmin, (req, res) => {
    const { url, caption } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    try {
      // Get max display order
      const maxOrder = db.prepare("SELECT MAX(display_order) as maxOrder FROM gallery").get() as { maxOrder: number | null };
      const nextOrder = (maxOrder.maxOrder || 0) + 1;

      const stmt = db.prepare("INSERT INTO gallery (url, caption, display_order) VALUES (?, ?, ?)");
      const info = stmt.run(url, caption || "", nextOrder);
      res.json({ id: info.lastInsertRowid, url, caption, display_order: nextOrder });
    } catch (error) {
      res.status(500).json({ error: "Failed to add image to gallery" });
    }
  });

  app.put("/api/gallery/reorder", requireAdmin, (req, res) => {
    const { orders } = req.body; // Array of { id, display_order }
    if (!Array.isArray(orders)) return res.status(400).json({ error: "Orders array is required" });

    try {
      const updateStmt = db.prepare("UPDATE gallery SET display_order = ? WHERE id = ?");
      const transaction = db.transaction((items) => {
        for (const item of items) {
          updateStmt.run(item.display_order, item.id);
        }
      });
      transaction(orders);
      res.json({ success: true });
    } catch (error) {
      console.error("Error reordering gallery:", error);
      res.status(500).json({ error: "Failed to reorder gallery" });
    }
  });

  app.delete("/api/gallery/:id", requireAdmin, (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM gallery WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete image from gallery" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Initializing Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    // Explicitly serve index.html in dev mode if vite.middlewares doesn't catch it
    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        console.error("Vite transform error:", e);
        next(e);
      }
    });
    console.log("Vite middleware integrated successfully.");
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  console.log("Server initialization complete.");
}

console.log("Starting server initialization...");
startServer().catch(err => {
  console.error("Failed to start server:", err);
});
