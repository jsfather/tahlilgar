import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import fs from "fs";

const db = new Database("database.sqlite");
db.pragma("foreign_keys = ON");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS forms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    fields TEXT NOT NULL -- JSON array of field objects
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    form_id INTEGER,
    data TEXT NOT NULL, -- JSON object of submitted data
    email TEXT, -- For identifying duplicates
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(form_id) REFERENCES forms(id)
  );

  CREATE TABLE IF NOT EXISTS content (
    id TEXT PRIMARY KEY,
    title TEXT,
    body TEXT
  );

  CREATE TABLE IF NOT EXISTS site_visits (
    ip TEXT PRIMARY KEY,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_requests INTEGER DEFAULT 1
  );
`);

// Seed initial data if empty
const settingsCount = db.prepare("SELECT COUNT(*) as count FROM settings").get() as { count: number };
if (settingsCount.count === 0) {
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("site_name", "آقای تحلیلگر");
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("site_description", "پلتفرم هوشمند تحلیل دارایی");
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("logo_url", "https://picsum.photos/seed/logo/200/200");
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("primary_color", "#2563eb");
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("contact_phone", "09123456789");
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("video_url", "https://www.w3schools.com/html/mov_bbb.mp4");
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("success_video_url", "https://www.w3schools.com/html/movie.mp4");
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("social_links", JSON.stringify([
    { platform: "Instagram", url: "https://instagram.com", icon: "Instagram" },
    { platform: "Telegram", url: "https://t.me", icon: "Send" },
    { platform: "WhatsApp", url: "https://wa.me", icon: "MessageCircle" }
  ]));
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("quotes", JSON.stringify([
    "موفقیت یعنی رفتن از شکستی به شکست دیگر بدون از دست دادن اشتیاق.",
    "تنها راه انجام کارهای بزرگ، دوست داشتن کاری است که انجام می‌دهید.",
    "آینده متعلق به کسانی است که به زیبایی رویاهایشان ایمان دارند."
  ]));
  
  db.prepare("INSERT INTO content (id, title, body) VALUES (?, ?, ?)").run(
    "hero", 
    "پلتفرم هوشمند تحلیل دارایی", 
    "ابزارهای پیشرفته برای تحلیل دقیق بازارهای مالی، سنجش ساختار دارایی‌ها و تصمیم‌گیری هوشمندانه بر پایه داده‌های واقعی شما"
  );

  const initialFields = JSON.stringify([
    { id: "name", label: "نام و نام خانوادگی", type: "text", required: true },
    { id: "email", label: "ایمیل", type: "email", required: true },
    { id: "asset_type", label: "نوع دارایی", type: "select", options: ["بورس", "طلا", "ارز دیجیتال", "مسکن"], required: true },
    { id: "amount", label: "مبلغ تقریبی (تومان)", type: "number", required: true },
    { id: "description", label: "توضیحات تکمیلی", type: "textarea", required: false }
  ]);
  db.prepare("INSERT INTO forms (name, fields) VALUES (?, ?)").run("فرم تحلیل دارایی", initialFields);
}

// Ensure core content blocks exist (for editable UI copy)
db.prepare("INSERT OR IGNORE INTO content (id, title, body) VALUES (?, ?, ?)").run(
  "forms_section",
  "فرم‌های تحلیل هوشمند",
  "برای دریافت مشاوره اختصاصی و تحلیل دقیق دارایی‌های خود، فرم مربوطه را تکمیل نمایید.",
);
db.prepare("INSERT OR IGNORE INTO content (id, title, body) VALUES (?, ?, ?)").run(
  "success_message",
  "اطلاعات با موفقیت ثبت شد",
  "کارشناسان ما به زودی با شما تماس خواهند گرفت. تا آن زمان می‌توانید ویدیوی زیر را مشاهده کنید.",
);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Middleware to track visits
  app.use((req, res, next) => {
    // Skip static files and internal vite requests
    if (req.path.includes(".") || req.path.startsWith("/@")) return next();
    
    const ip = req.headers["x-forwarded-for"] || req.ip || req.socket.remoteAddress;
    const ipStr = Array.isArray(ip) ? ip[0] : ip;
    
    try {
      db.prepare(`
        INSERT INTO site_visits (ip, last_seen, total_requests) 
        VALUES (?, CURRENT_TIMESTAMP, 1) 
        ON CONFLICT(ip) DO UPDATE SET 
          last_seen = CURRENT_TIMESTAMP,
          total_requests = total_requests + 1
      `).run(ipStr);
    } catch (err) {
      console.error("Error tracking visit:", err);
    }
    next();
  });

  // API Routes
  app.get("/api/stats", (req, res) => {
    const onlineCount = db.prepare("SELECT COUNT(*) as count FROM site_visits WHERE last_seen > datetime('now', '-5 minutes')").get() as { count: number };
    const totalVisits = db.prepare("SELECT COUNT(*) as count FROM site_visits").get() as { count: number };
    res.json({ online: onlineCount.count, total: totalVisits.count });
  });

  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all();
    const settingsObj = settings.reduce((acc: any, curr: any) => {
      try {
        acc[curr.key] = JSON.parse(curr.value);
      } catch {
        acc[curr.key] = curr.value;
      }
      return acc;
    }, {});
    res.json(settingsObj);
  });

  app.post("/api/settings", (req, res) => {
    const { settings } = req.body;
    const update = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
    const transaction = db.transaction((data) => {
      for (const [key, value] of Object.entries(data)) {
        const val = typeof value === "object" ? JSON.stringify(value) : String(value);
        update.run(key, val);
      }
    });
    transaction(settings);
    res.json({ success: true });
  });

  app.get("/api/content", (req, res) => {
    const content = db.prepare("SELECT * FROM content").all();
    res.json(content);
  });

  app.post("/api/content", (req, res) => {
    const { id, title, body } = req.body;
    db.prepare("INSERT OR REPLACE INTO content (id, title, body) VALUES (?, ?, ?)").run(id, title, body);
    res.json({ success: true });
  });

  app.get("/api/forms", (req, res) => {
    const forms = db.prepare("SELECT * FROM forms").all();
    res.json(forms.map((f: any) => ({ ...f, fields: JSON.parse(f.fields) })));
  });

  app.post("/api/forms", (req, res) => {
    const { name, fields } = req.body;
    db.prepare("INSERT INTO forms (name, fields) VALUES (?, ?)").run(name, JSON.stringify(fields));
    res.json({ success: true });
  });

  app.put("/api/forms/:id", (req, res) => {
    const { id } = req.params;
    const { name, fields } = req.body;
    db.prepare("UPDATE forms SET name = ?, fields = ? WHERE id = ?").run(name, JSON.stringify(fields), id);
    res.json({ success: true });
  });

  app.delete("/api/forms/:id", (req, res) => {
    const { id } = req.params;
    const tx = db.transaction(() => {
      db.prepare("DELETE FROM submissions WHERE form_id = ?").run(id);
      db.prepare("DELETE FROM forms WHERE id = ?").run(id);
    });
    tx();
    res.json({ success: true });
  });

  app.post("/api/submit/:formId", (req, res) => {
    const { formId } = req.params;
    const data = req.body;
    const email = data.email || data.Email || "";
    db.prepare("INSERT INTO submissions (form_id, data, email) VALUES (?, ?, ?)").run(formId, JSON.stringify(data), email);
    res.json({ success: true });
  });

  app.get("/api/submissions", (req, res) => {
    const submissions = db.prepare(`
      SELECT s.*, IFNULL(f.name, 'فرم حذف شده') as form_name 
      FROM submissions s 
      LEFT JOIN forms f ON s.form_id = f.id 
      ORDER BY s.created_at DESC
    `).all();
    res.json(submissions.map((s: any) => ({ ...s, data: JSON.parse(s.data) })));
  });

  app.delete("/api/submissions/:id", (req, res) => {
    const { id } = req.params;
    const result = db.prepare("DELETE FROM submissions WHERE id = ?").run(id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: "لید یافت نشد" });
    }
    return res.json({ success: true });
  });

  app.post("/api/login", (req, res) => {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD || "admin";
    if (password === adminPassword) {
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, message: "رمز عبور اشتباه است" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
