
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import axios from 'axios';
import fs from 'fs';
import jalaali from 'jalaali-js';

import multer from 'multer';
import * as XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('database.sqlite');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Helper to format phone to E164 Iran (98...)
function toE164Iran(mobile: string) {
  let m = String(mobile).trim();
  
  // 0. Convert Persian/Arabic digits to English digits
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  m = m.replace(/[۰-۹]/g, (d) => persianDigits.indexOf(d).toString());
  m = m.replace(/[٠-٩]/g, (d) => arabicDigits.indexOf(d).toString());

  // 1. Remove all non-digit characters (including spaces, dashes, +, etc.)
  let clean = m.replace(/\D/g, '');
  
  if (!clean) {
    throw new Error("شماره موبایل نمی‌تواند خالی باشد.");
  }

  // 2. Handle starting '00' (international prefix)
  if (clean.startsWith('00')) clean = clean.slice(2);
  
  // 3. Handle starting '0' (local prefix)
  if (clean.startsWith('0')) clean = clean.slice(1);
  
  // 4. Handle Iranian numbers
  // - 98 912 345 6789 (12 digits starting with 98)
  // - 912 345 6789 (10 digits starting with 9)
  
  if (clean.length === 12 && clean.startsWith('98')) {
    const core = clean.slice(2);
    if (core.startsWith('9')) return clean;
  }
  
  if (clean.length === 10 && clean.startsWith('9')) {
    return '98' + clean;
  }
  
  // Specific error messages for guidance
  if (/[^0-9]/.test(m)) {
    throw new Error("لطفاً شماره را فقط با اعداد انگلیسی وارد کنید.");
  }
  
  if (clean.length < 10) {
    throw new Error("شماره وارد شده کوتاه است. لطفاً حداقل ۱۰ رقم وارد کنید.");
  }
  
  if (clean.length > 12) {
    throw new Error("شماره وارد شده طولانی است.");
  }
  
  throw new Error("فرمت شماره موبایل نامعتبر است. نمونه صحیح: 09123456789");
}

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    surname TEXT,
    phone TEXT UNIQUE,
    form_id TEXT DEFAULT 'main_form',
    status TEXT DEFAULT 'سرنخ جدید',
    expert TEXT DEFAULT '',
    stage TEXT DEFAULT 'new', -- new, contacted, interested, negotiation, customer, lost
    notes TEXT,
    city TEXT,
    province TEXT,
    degree TEXT,
    background TEXT,
    source_type TEXT,
    visit_count INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS lead_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    expert_id INTEGER,
    type TEXT, -- call, note, status_change, sms_sent
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(lead_id) REFERENCES leads(id)
  );

  CREATE TABLE IF NOT EXISTS follow_ups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    expert_id INTEGER,
    scheduled_at DATETIME,
    notes TEXT,
    status TEXT DEFAULT 'pending', -- pending, completed, cancelled
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sms_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    content TEXT,
    pattern_code TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS otp_requests (
    phone TEXT PRIMARY KEY,
    code TEXT,
    expires_at DATETIME
  );

  CREATE TABLE IF NOT EXISTS downloads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    size TEXT,
    link TEXT
  );

  CREATE TABLE IF NOT EXISTS testimonials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    video_type TEXT DEFAULT 'direct', -- direct or aparat
    video_link TEXT,
    video_cover TEXT,
    order_index INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT UNIQUE,
    visits INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    description TEXT,
    price TEXT,
    installments_enabled INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS deposit_installments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deposit_id INTEGER,
    amount INTEGER,
    due_date DATETIME,
    status TEXT DEFAULT 'pending', -- pending, paid
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(deposit_id) REFERENCES deposits(id)
  );

  CREATE TABLE IF NOT EXISTS custom_fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    label TEXT,
    type TEXT, -- text, number, select
    target TEXT, -- registration, profile
    is_required INTEGER DEFAULT 0,
    options TEXT, -- comma separated for select
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'admin',
    permissions TEXT DEFAULT '["stats","leads","content","downloads","sms","seo","admins"]',
    team_id INTEGER,
    last_active_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    supervisor_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(supervisor_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS scheduled_sms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    message TEXT,
    send_after_days INTEGER, -- 1 to 60
    target TEXT DEFAULT 'leads', -- leads or customers
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS lead_scheduled_sms_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    sms_id INTEGER,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(lead_id) REFERENCES leads(id),
    FOREIGN KEY(sms_id) REFERENCES scheduled_sms(id)
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    team_id INTEGER, -- Added for team-specific announcements
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(team_id) REFERENCES teams(id)
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    expert_id INTEGER, -- Added for admin to expert tickets
    lead_id INTEGER,
    subject TEXT,
    department TEXT,
    priority TEXT, -- low, medium, high
    status TEXT DEFAULT 'new', -- new, pending, answered, on_hold, closed
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(expert_id) REFERENCES users(id),
    FOREIGN KEY(lead_id) REFERENCES leads(id)
  );

  CREATE TABLE IF NOT EXISTS deposits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    product_id INTEGER,
    amount INTEGER,
    receipt_urls TEXT, -- JSON array
    status TEXT DEFAULT 'pending', -- pending, approved, rejected, reupload
    rejection_reason TEXT,
    payment_date DATETIME,
    next_installment_date DATETIME,
    expert_id INTEGER, -- link to expert who handled it
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(lead_id) REFERENCES leads(id),
    FOREIGN KEY(product_id) REFERENCES products(id),
    FOREIGN KEY(expert_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS user_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT, -- login, logout
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS custom_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    count TEXT,
    order_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ticket_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER,
    user_id INTEGER,
    content TEXT,
    file_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(ticket_id) REFERENCES tickets(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Migrations (Add columns if they don't exist)
try { db.exec("ALTER TABLE leads ADD COLUMN city TEXT"); } catch(e) {}
try { db.exec("ALTER TABLE leads ADD COLUMN province TEXT"); } catch(e) {}
try { db.exec("ALTER TABLE leads ADD COLUMN degree TEXT"); } catch(e) {}
try { db.exec("ALTER TABLE leads ADD COLUMN background TEXT"); } catch(e) {}
try { db.exec("ALTER TABLE leads ADD COLUMN source_type TEXT"); } catch(e) {}
try { db.exec("ALTER TABLE sms_templates ADD COLUMN pattern_code TEXT"); } catch(e) {}
try { db.exec("ALTER TABLE leads ADD COLUMN expert TEXT DEFAULT ''"); } catch(e) {}
try { db.exec("ALTER TABLE leads ADD COLUMN stage TEXT DEFAULT 'new'"); } catch(e) {}
try { db.exec("ALTER TABLE leads ADD COLUMN notes TEXT"); } catch(e) {}
try { db.exec("ALTER TABLE leads ADD COLUMN visit_count INTEGER DEFAULT 1"); } catch(e) {}
try { db.exec("ALTER TABLE testimonials ADD COLUMN video_cover TEXT"); } catch(e) {}
try { db.exec("ALTER TABLE leads ADD COLUMN requested_product_id INTEGER"); } catch(e) {}
try { db.exec("ALTER TABLE leads ADD COLUMN custom_data TEXT"); } catch(e) {}
try { db.exec("ALTER TABLE tickets ADD COLUMN expert_id INTEGER"); } catch(e) {}
try { db.exec("ALTER TABLE products ADD COLUMN installments_enabled INTEGER DEFAULT 0"); } catch(e) {}
try { db.exec("ALTER TABLE deposits ADD COLUMN payment_type TEXT DEFAULT 'cash'"); } catch(e) {}
try { db.exec("ALTER TABLE deposits ADD COLUMN total_amount INTEGER"); } catch(e) {}
try { db.exec("ALTER TABLE deposits ADD COLUMN installment_count INTEGER DEFAULT 0"); } catch(e) {}
try { db.exec(`
  CREATE TABLE IF NOT EXISTS deposits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    product_id INTEGER,
    amount INTEGER,
    receipt_urls TEXT,
    status TEXT DEFAULT 'pending',
    rejection_reason TEXT,
    payment_date DATETIME,
    next_installment_date DATETIME,
    expert_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(lead_id) REFERENCES leads(id),
    FOREIGN KEY(product_id) REFERENCES products(id),
    FOREIGN KEY(expert_id) REFERENCES users(id)
  )
`); } catch(e) {}
try { db.exec("ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT '[\"stats\",\"leads\",\"content\",\"downloads\",\"sms\",\"seo\",\"admins\"]'"); } catch(e) {}
try { db.exec("ALTER TABLE users ADD COLUMN team_id INTEGER"); } catch(e) {}
try { db.exec("ALTER TABLE users ADD COLUMN last_active_at DATETIME"); } catch(e) {}
try { db.exec("ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP"); } catch(e) {}
try { db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone)"); } catch(e) {}

// Seed initial data
const seedSettings = [
  ['site_title', 'مجموعه کارآفرینی پوردانش'],
  ['site_description', 'لندینگ پیج اختصاصی مجموعه کارآفرینی پوردانش'],
  ['primary_color', '#2563eb'],
  ['secondary_color', '#f59e0b'],
  ['sms_api_key', ''],
  ['sms_sender', '100010007008'],
  ['sms_pattern_code', ''],
  ['video_type', 'direct'], // direct or aparat
  ['video_link', ''],
  ['video_cover', ''],
  ['show_video', '1'],
  ['countdown_end', '2026-05-01T00:00:00'],
  ['missed_opportunities_count', '1240'],
  ['bottom_banner', ''],
  ['header_logo', ''],
  ['footer_text', 'تمامی حقوق برای مجموعه پوردانش محفوظ است'],
  ['instagram_link', ''],
  ['phone_link', ''],
  ['main_title', 'به دنیای تجارت هوشمند خوش آمدید'],
  ['lottery_info', 'برای شرکت در قرعه کشی باید حتما در وبینار شرکت کرده و جواب سوال پرسیده شده را ارسال کنید.'],
  ['participation_text', 'برای شروع و مشارکت در تجارت و پیوستن به جمع تاجران و سرمایه گذاران ما عدد 31 رو به 100010007008 پیامک کنید.'],
  ['main_title_fs_d', '72'],
  ['main_title_fs_m', '36'],
  ['lottery_info_fs_d', '16'],
  ['lottery_info_fs_m', '12'],
  ['participation_text_fs_d', '18'],
  ['participation_text_fs_m', '14'],
  ['download_box_title', 'در صورت عدم مشاهده ویدیو به صورت انلاین میتونید از طریق لینک زیر اقدام به دانلود ویدیو بکنید'],
  ['timer_type', 'lottery'], // lottery or webinar
  ['timer_title', 'زمان باقی‌مانده تا قرعه‌کشی'],
  ['video_placeholder_text', 'وبینار به زودی شروع می‌شود. لطفاً منتظر بمانید.'],
  ['form_avatar', ''],
  ['form_title', 'از صفر تا معاملات میلیاردی'],
  ['form_description', 'برای دریافت رایگان وبینار لطفا اطلاعات خود را وارد کنید'],
  ['form_name_label', 'نام و نام خانوادگی'],
  ['form_phone_label', 'شماره موبایل'],
  ['show_registration_products', '1'],
  ['registration_product_label', 'محصول یا خدمت مورد نظر'],
  ['stats_title', 'فرصت‌های درآمدزایی اجرایی شده'],
  ['stats_description', 'مجموعه پوردانش تا کنون مسیر موفقیت هزاران نفر را هموار کرده است.'],
  ['show_testimonials', '0'],
  ['show_bottom_banner', '0'],
  ['bottom_banner_image', ''],
  ['bottom_banner_link', ''],
  ['testimonials_title', 'رضایت مشتریان و افراد موفق'],
  ['custom_popup_link', ''],
  ['custom_popup_label', ''],
  ['lead_assignment_mode', 'manual'], // manual or round_robin
  ['last_expert_idx', '0'],
  ['seo_title', 'مجموعه کارآفرینی پوردانش | تجارت هوشمند'],
  ['seo_description', 'لندینگ پیج اختصاصی مجموعه کارآفرینی پوردانش برای همراهی تاجران و سرمایه گذاران'],
  ['seo_keywords', 'پوردانش, تجارت, سرمایه گذاری, کارآفرینی, وبینار'],
  ['show_timer', '1'],
  ['top_banner_enabled', '0'],
  ['top_banner_image', ''],
  ['registration_bg_color', '#f3f4f6'],
  ['registration_bg_image', ''],
  ['sms_username', ''],
  ['sms_password', ''],
  ['sms_is_pattern', '0'],
  ['auto_sms_enabled', '1']
];

const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
seedSettings.forEach(s => insertSetting.run(s[0], s[1]));

// Seed default admin
db.prepare("INSERT OR IGNORE INTO users (username, password, role) VALUES ('admin', 'admin123', 'admin')").run();

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
  }

  // Serve uploads statically
  app.use('/uploads', express.static(uploadsDir));

  // Middleware to track activity
  app.use((req, res, next) => {
    const userId = req.headers['x-user-id'];
    if (userId) {
      db.prepare('UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = ?').run(Number(userId));
    }
    next();
  });

  const assignLead = (leadId: number, forcedExpert?: string) => {
    if (forcedExpert && forcedExpert !== 'none') {
      db.prepare('UPDATE leads SET expert = ?, status = ? WHERE id = ?').run(forcedExpert, 'تخصیص داده شده', leadId);
      db.prepare('INSERT INTO lead_activities (lead_id, expert_id, type, content) VALUES (?, ?, ?, ?)')
        .run(leadId, 1, 'note', `تخصیص دستی به کارشناس: ${forcedExpert}`);
      return forcedExpert;
    }

    const assignmentMode = db.prepare("SELECT value FROM settings WHERE key = 'lead_assignment_mode'").get() as any;
    if (assignmentMode?.value === 'round_robin') {
      const experts = db.prepare("SELECT username FROM users WHERE role = 'expert'").all() as any[];
      if (experts.length > 0) {
        const lastIdxRes = db.prepare("SELECT value FROM settings WHERE key = 'last_expert_idx'").get() as any;
        let nextIdx = (parseInt(lastIdxRes?.value || '0') + 1) % experts.length;
        const expert = experts[nextIdx].username;

        db.prepare('UPDATE leads SET expert = ?, status = ? WHERE id = ?').run(expert, 'تخصیص داده شده', leadId);
        db.prepare("UPDATE settings SET value = ? WHERE key = 'last_expert_idx'").run(String(nextIdx));
        
        db.prepare('INSERT INTO lead_activities (lead_id, expert_id, type, content) VALUES (?, ?, ?, ?)')
          .run(leadId, 1, 'note', `تخصیص خودکار (Round-Robin) به کارشناس: ${expert}`);
        return expert;
      }
    }
    return null;
  };

  // Multer setup
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });
  const upload = multer({ storage });

  app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
  });

  app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
       const userId = req.headers['x-user-id']; // This is a bit insecure if client sets it, but for our demo dashboard it's okay. 
       // Better: decode the token. Assuming user handles it in actual app. 
       // For now let's just make it simpler for them to pass the ID if needed or we stick to a heart beat.
    }
    next();
  });

  app.post('/api/heartbeat', (req, res) => {
    try {
      const { userId } = req.body;
      if (userId) {
        db.prepare('UPDATE users SET last_active_at = ? WHERE id = ?').run(new Date().toISOString(), userId);
      }
      res.json({ success: true });
    } catch (e) {
      res.json({ success: false });
    }
  });

  app.post('/api/auth/log', (req, res) => {
    try {
      const { user_id, type } = req.body;
      if (user_id && type) {
        db.prepare('INSERT INTO user_logs (user_id, type) VALUES (?, ?)').run(user_id, type);
      }
      res.json({ success: true });
    } catch (error) {
      res.json({ success: false });
    }
  });

  app.get('/api/online-users', (req, res) => {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const users = db.prepare('SELECT id, username, role, last_active_at FROM users WHERE last_active_at > ?').all(fiveMinutesAgo);
      res.json(users || []);
    } catch (error) {
      res.json([]);
    }
  });

  app.get('/api/user-profile/:id', (req, res) => {
    try {
      const user = db.prepare('SELECT id, username, role, permissions, team_id, last_active_at, created_at FROM users WHERE id = ?').get(req.params.id) as any;
      if (!user) return res.status(404).json({ error: 'User not found' });

      const activities = db.prepare(`
        SELECT * FROM lead_activities 
        WHERE expert_id = ? 
        ORDER BY created_at DESC 
        LIMIT 100
      `).all(user.id);

      const logs = db.prepare(`
        SELECT * FROM user_logs 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT 100
      `).all(user.id);

      // Sales summary if applicable
      const sales = db.prepare(`
          SELECT count(*) as count, sum(amount) as total 
          FROM deposits 
          WHERE expert_id = ? AND status = 'confirmed'
      `).get(user.id) as any;

      res.json({
         user,
         activity: activities || [],
         logs: logs || [],
         stats: {
           total_sales: sales?.count || 0,
           total_amount: sales?.total || 0
         }
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal error' });
    }
  });

  // API Routes
  app.get('/api/settings', (req, res) => {
    const settings = db.prepare('SELECT * FROM settings').all();
    const result = settings.reduce((acc: any, row: any) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
    res.json(result);
  });

  app.post('/api/settings', (req, res) => {
    try {
      const updates = req.body;
      const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
      const transaction = db.transaction((data) => {
        for (const [key, value] of Object.entries(data)) {
          if (value !== undefined && value !== null) {
            stmt.run(key, String(value));
          }
        }
      });
      transaction(updates);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Settings save error:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // Admin Management
  app.get('/api/admins', (req, res) => {
    const users = db.prepare('SELECT id, username, role, permissions, team_id, last_active_at FROM users').all();
    res.json(users);
  });

  app.post('/api/admins', (req, res) => {
    const { username, password, role, permissions, team_id, id } = req.body;
    const permsString = Array.isArray(permissions) ? JSON.stringify(permissions) : permissions;
    const tid = team_id ? Number(team_id) : null;

    if (id) {
      if (password) {
        db.prepare('UPDATE users SET username = ?, password = ?, role = ?, permissions = ?, team_id = ? WHERE id = ?').run(username ?? null, password ?? null, role ?? null, permsString ?? null, tid, id);
      } else {
        db.prepare('UPDATE users SET username = ?, role = ?, permissions = ?, team_id = ? WHERE id = ?').run(username ?? null, role ?? null, permsString ?? null, tid, id);
      }
    } else {
      db.prepare('INSERT INTO users (username, password, role, permissions, team_id) VALUES (?, ?, ?, ?, ?)').run(username ?? null, password ?? null, role ?? null, permsString ?? null, tid);
    }
    res.json({ success: true });
  });

  // Team Management APIs
  app.get('/api/teams', (req, res) => {
    const teams = db.prepare(`
      SELECT t.*, u.username as supervisor_name 
      FROM teams t 
      LEFT JOIN users u ON t.supervisor_id = u.id
    `).all();
    res.json(teams);
  });

  app.post('/api/teams', (req, res) => {
    const { name, supervisor_id, id } = req.body;
    if (id) {
      db.prepare('UPDATE teams SET name = ?, supervisor_id = ? WHERE id = ?').run(name, supervisor_id || null, id);
      res.json({ success: true });
    } else {
      const result = db.prepare('INSERT INTO teams (name, supervisor_id) VALUES (?, ?)').run(name, supervisor_id || null);
      res.json({ id: result.lastInsertRowid });
    }
  });

  app.delete('/api/teams/:id', (req, res) => {
    db.prepare('UPDATE users SET team_id = NULL WHERE team_id = ?').run(req.params.id);
    db.prepare('DELETE FROM teams WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Scheduled SMS APIs
  app.get('/api/scheduled-sms', (req, res) => {
    res.json(db.prepare('SELECT * FROM scheduled_sms ORDER BY send_after_days ASC').all());
  });

  app.post('/api/scheduled-sms', (req, res) => {
    const { title, message, send_after_days, target, is_active, id } = req.body;
    if (id) {
      db.prepare('UPDATE scheduled_sms SET title = ?, message = ?, send_after_days = ?, target = ?, is_active = ? WHERE id = ?')
        .run(title, message, send_after_days, target, is_active ? 1 : 0, id);
      res.json({ success: true });
    } else {
      const result = db.prepare('INSERT INTO scheduled_sms (title, message, send_after_days, target, is_active) VALUES (?, ?, ?, ?, ?)')
        .run(title, message, send_after_days, target, is_active ? 1 : 0);
      res.json({ id: result.lastInsertRowid });
    }
  });

  app.delete('/api/scheduled-sms/:id', (req, res) => {
    db.prepare('DELETE FROM scheduled_sms WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.post('/api/leads/re-followup', (req, res) => {
    const { lead_id } = req.body;
    db.prepare('DELETE FROM lead_scheduled_sms_log WHERE lead_id = ?').run(lead_id);
    res.json({ success: true });
  });

  app.delete('/api/admins/:id', (req, res) => {
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.post('/api/leads/create', (req, res) => {
    const { name, surname, phone, expert, custom_data } = req.body;
    try {
      const existing = db.prepare('SELECT id FROM leads WHERE phone = ?').get(String(phone));
      if (existing) return res.status(400).json({ error: 'لیدی با این شماره قبلاً ثبت شده است' });

      const result = db.prepare('INSERT INTO leads (name, surname, phone, custom_data, expert, status) VALUES (?, ?, ?, ?, ?, ?)')
        .run(name || '', surname || '', String(phone), custom_data ? JSON.stringify(custom_data) : null, expert || null, expert ? 'تخصیص داده شده' : 'جدید');
      
      const leadId = Number(result.lastInsertRowid);
      if (!expert) {
        assignLead(leadId);
      } else {
        db.prepare('INSERT INTO lead_activities (lead_id, expert_id, type, content) VALUES (?, ?, ?, ?)')
          .run(leadId, 1, 'note', `ثبت دستی و تخصیص به کارشناس: ${expert}`);
      }

      res.json({ success: true, id: leadId });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/leads/bulk-upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'فایلی انتخاب نشده است' });
    const { assignment_mode, expert } = req.body;

    try {
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet) as any[];

      let count = 0;
      let skipped = 0;

      const insertStmt = db.prepare('INSERT OR IGNORE INTO leads (name, surname, phone, status) VALUES (?, ?, ?, ?)');
      
      db.transaction(() => {
        for (const row of data) {
          const phone = String(row.phone || row['شماره'] || row['موبایل'] || row['phone_number'] || '').trim();
          if (!phone) { skipped++; continue; }
          const name = String(row.name || row['نام'] || '').trim();
          const surname = String(row.surname || row['نام خانوادگی'] || '').trim();

          const result = insertStmt.run(name, surname, phone, 'جدید');
          if (result.changes > 0) {
            count++;
            const leadId = Number(result.lastInsertRowid);
            if (assignment_mode === 'manual' && expert) {
              assignLead(leadId, expert);
            } else {
              assignLead(leadId);
            }
          } else {
            skipped++;
          }
        }
      })();

      res.json({ success: true, count, skipped });
    } catch (e: any) {
      console.error('Bulk upload error:', e);
      res.status(500).json({ error: e.message });
    } finally {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }
  });

  app.get('/api/leads', (req, res) => {
    const { search, startDate, endDate, expert, team_id, supervisor_id } = req.query;
    let query = 'SELECT * FROM leads';
    let params: any[] = [];
    let conditions: string[] = [];

    if (supervisor_id) {
      // Supervisor can see leads assigned to their team members
      const teamMates = db.prepare(`
        SELECT username FROM users 
        WHERE team_id = (SELECT team_id FROM users WHERE id = ?)
      `).all(Number(supervisor_id)) as any[];
      
      if (teamMates.length > 0) {
        const usernames = teamMates.map(u => u.username);
        conditions.push(`expert IN (${usernames.map(() => '?').join(',')})`);
        params.push(...usernames);
      } else {
        conditions.push('1=0'); // No team members = no leads visible
      }
    } else if (expert && typeof expert === 'string') {
      conditions.push('expert = ?');
      params.push(expert);
    }
    
    if (search && typeof search === 'string') {
      conditions.push('(name LIKE ? OR surname LIKE ? OR phone LIKE ? OR expert LIKE ? OR city LIKE ? OR province LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s, s, s, s);
    }

    if (startDate && typeof startDate === 'string') {
      conditions.push('created_at >= ?');
      params.push(startDate);
    }

    if (endDate && typeof endDate === 'string') {
      conditions.push('created_at <= ?');
      params.push(endDate);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';
    const leads = db.prepare(query).all(...params);
    res.json(leads);
  });

  // Removed all-clear endpoint

  app.post('/api/leads/:id/status', (req, res) => {
    const { status, expert_id } = req.body;
    db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(status, req.params.id);
    
    // Log activity
    if (expert_id) {
      db.prepare('INSERT INTO lead_activities (lead_id, expert_id, type, content) VALUES (?, ?, ?, ?)')
        .run(req.params.id, expert_id, 'status_change', `وضعیت تغییر کرد به: ${status}`);
    }
    res.json({ success: true });
  });

  app.get('/api/leads/:id', (req, res) => {
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
    res.json(lead);
  });

  app.post('/api/leads/:id/profile', (req, res) => {
    const { name, surname, stage, notes, city, province, degree, background, source_type, expert, custom_data, requested_product_id } = req.body;
    
    // Automatically update status if stage is customer
    const status = stage === 'customer' ? 'مشتری' : undefined;
    
    let query = `
      UPDATE leads 
      SET name = ?, surname = ?, stage = ?, notes = ?, city = ?, province = ?, degree = ?, background = ?, source_type = ?, expert = ?, custom_data = ?, requested_product_id = ? 
    `;
    let params = [name, surname, stage, notes, city, province, degree, background, source_type, expert, custom_data, requested_product_id];
    
    if (status) {
      query += ', status = ? ';
      params.push(status);
    }
    
    query += ' WHERE id = ?';
    params.push(req.params.id);
    
    db.prepare(query).run(...params);
    res.json({ success: true });
  });

  app.get('/api/leads/:id/activities', (req, res) => {
    const activities = db.prepare('SELECT a.*, u.username as expert_name FROM lead_activities a LEFT JOIN users u ON a.expert_id = u.id WHERE a.lead_id = ? ORDER BY a.created_at DESC').all(req.params.id);
    res.json(activities);
  });

  app.post('/api/leads/:id/activities', (req, res) => {
    const { expert_id, type, content } = req.body;
    db.prepare('INSERT INTO lead_activities (lead_id, expert_id, type, content) VALUES (?, ?, ?, ?)')
      .run(req.params.id, expert_id, type, content);
    res.json({ success: true });
  });

  app.get('/api/followups', (req, res) => {
    const { expert_id, date } = req.query;
    let query = "SELECT f.*, l.name, l.surname, l.phone FROM follow_ups f JOIN leads l ON f.lead_id = l.id WHERE f.status = 'pending'";
    let conditions = [];
    let params = [];

    if (expert_id) {
      conditions.push('f.expert_id = ?');
      params.push(expert_id);
    }
    if (date) {
      const [y, m, d] = (date as string).split('-').map(Number);
      const jDate = jalaali.toJalaali(y, m, d);
      const persianDate = `${jDate.jy}-${String(jDate.jm).padStart(2, '0')}-${String(jDate.jd).padStart(2, '0')}`;
      
      conditions.push("(f.scheduled_at LIKE ? OR f.scheduled_at LIKE ?)");
      params.push(`${date}%`, `${persianDate}%`);
    }

    if (conditions.length > 0) query += ' AND ' + conditions.join(' AND ');
    query += ' ORDER BY f.scheduled_at ASC';
    
    res.json(db.prepare(query).all(...params));
  });

  app.post('/api/followups', (req, res) => {
    const { lead_id, expert_id, scheduled_at, notes } = req.body;
    db.prepare('INSERT INTO follow_ups (lead_id, expert_id, scheduled_at, notes) VALUES (?, ?, ?, ?)')
      .run(lead_id, expert_id, scheduled_at, notes);
    res.json({ success: true });
  });

  app.post('/api/followups/:id/complete', (req, res) => {
    db.prepare("UPDATE follow_ups SET status = 'completed' WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.post('/api/followups/:id/reschedule', (req, res) => {
    const { scheduled_at } = req.body;
    db.prepare("UPDATE follow_ups SET scheduled_at = ? WHERE id = ?").run(scheduled_at, req.params.id);
    res.json({ success: true });
  });

  app.get('/api/sms-templates', (req, res) => {
    res.json(db.prepare('SELECT * FROM sms_templates').all());
  });

  app.post('/api/sms-templates', (req, res) => {
    const { name, content, pattern_code } = req.body;
    db.prepare('INSERT INTO sms_templates (name, content, pattern_code) VALUES (?, ?, ?)').run(name, content, pattern_code);
    res.json({ success: true });
  });

  app.delete('/api/sms-templates/:id', (req, res) => {
    db.prepare('DELETE FROM sms_templates WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.post('/api/sms/send-direct', async (req, res) => {
    const { phone, message, pattern_code, expert_id, lead_id } = req.body;
    
    const result = await sendSMS(phone, message, pattern_code);
    
    if (lead_id && expert_id) {
      db.prepare('INSERT INTO lead_activities (lead_id, expert_id, type, content) VALUES (?, ?, ?, ?)')
        .run(lead_id, expert_id, 'sms_sent', `پیامک ارسال شد: ${message}`);
    }
    
    res.json({ success: result.success });
  });

  app.delete('/api/leads/:id', (req, res) => {
    try {
      const id = Number(req.params.id);
      console.log(`📡 DELETE request received for Lead ID: ${id}`);
      
      // Cascaded deletion (even if FK is off, good to clean up)
      db.transaction(() => {
        db.prepare('DELETE FROM ticket_messages WHERE ticket_id IN (SELECT id FROM tickets WHERE lead_id = ?)').run(id);
        db.prepare('DELETE FROM tickets WHERE lead_id = ?').run(id);
        db.prepare('DELETE FROM follow_ups WHERE lead_id = ?').run(id);
        db.prepare('DELETE FROM lead_activities WHERE lead_id = ?').run(id);
        db.prepare('DELETE FROM deposit_installments WHERE deposit_id IN (SELECT id FROM deposits WHERE lead_id = ?)').run(id);
        db.prepare('DELETE FROM deposits WHERE lead_id = ?').run(id);
        db.prepare('DELETE FROM leads WHERE id = ?').run(id);
      })();

      console.log(`✅ DELETE successful for ID ${id}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Lead delete error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/leads/bulk-delete', (req, res) => {
    const { ids } = req.body;
    console.log(`📡 BULK DELETE request received for IDs:`, ids);
    try {
      db.transaction(() => {
        for (const id of ids) {
          const leadId = Number(id);
          db.prepare('DELETE FROM ticket_messages WHERE ticket_id IN (SELECT id FROM tickets WHERE lead_id = ?)').run(leadId);
          db.prepare('DELETE FROM tickets WHERE lead_id = ?').run(leadId);
          db.prepare('DELETE FROM follow_ups WHERE lead_id = ?').run(leadId);
          db.prepare('DELETE FROM lead_activities WHERE lead_id = ?').run(leadId);
          db.prepare('DELETE FROM deposit_installments WHERE deposit_id IN (SELECT id FROM deposits WHERE lead_id = ?)').run(leadId);
          db.prepare('DELETE FROM deposits WHERE lead_id = ?').run(leadId);
          db.prepare('DELETE FROM leads WHERE id = ?').run(leadId);
        }
      })();
      console.log(`✅ BULK DELETE successful`);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Bulk Lead delete error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/leads/bulk-assign', (req, res) => {
    const { ids, expert } = req.body;
    const stmt = db.prepare('UPDATE leads SET expert = ?, status = ? WHERE id = ?');
    const transaction = db.transaction((idList) => {
      for (const id of idList) stmt.run(expert, 'تخصیص داده شده', Number(id));
    });
    transaction(ids);
    res.json({ success: true });
  });

  app.post('/api/leads/bulk-status', (req, res) => {
    const { ids, status } = req.body;
    const stmt = db.prepare('UPDATE leads SET status = ? WHERE id = ?');
    const transaction = db.transaction((idList) => {
      for (const id of idList) stmt.run(status, Number(id));
    });
    transaction(ids);
    res.json({ success: true });
  });

  // Ticketing API
  app.post('/api/tickets', (req, res) => {
    const { user_id, lead_id, subject, department, priority, content } = req.body;
    const result = db.prepare(`
      INSERT INTO tickets (user_id, lead_id, subject, department, priority) 
      VALUES (?, ?, ?, ?, ?)
    `).run(user_id, lead_id || null, subject, department, priority);
    
    db.prepare(`
      INSERT INTO ticket_messages (ticket_id, user_id, content) 
      VALUES (?, ?, ?)
    `).run(result.lastInsertRowid, user_id, content);
    
    res.json({ success: true, id: result.lastInsertRowid });
  });

  app.get('/api/tickets', (req, res) => {
    const { user_id, role } = req.query;
    let query = `
      SELECT t.*, u.username, l.name as lead_name, l.surname as lead_surname 
      FROM tickets t 
      JOIN users u ON t.user_id = u.id 
      LEFT JOIN leads l ON t.lead_id = l.id
    `;
    let params = [];
    
    if (role !== 'admin') {
      query += ' WHERE t.user_id = ?';
      params.push(user_id);
    }
    
    query += ' ORDER BY t.updated_at DESC';
    res.json(db.prepare(query).all(...params));
  });

  app.get('/api/tickets/:id/messages', (req, res) => {
    const messages = db.prepare(`
      SELECT m.*, u.username, u.role 
      FROM ticket_messages m 
      JOIN users u ON m.user_id = u.id 
      WHERE m.ticket_id = ? 
      ORDER BY m.created_at ASC
    `).all(req.params.id);
    res.json(messages);
  });

  app.post('/api/tickets/:id/messages', (req, res) => {
    const { user_id, content, file_url } = req.body;
    db.prepare(`
      INSERT INTO ticket_messages (ticket_id, user_id, content, file_url) 
      VALUES (?, ?, ?, ?)
    `).run(req.params.id, user_id, content, file_url || null);
    
    db.prepare(`UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(req.params.id);
    
    res.json({ success: true });
  });

  app.post('/api/tickets/:id/status', (req, res) => {
    const { status } = req.body;
    db.prepare(`UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(status, req.params.id);
    res.json({ success: true });
  });
async function sendSMS(phone: string, message: string, patternCode?: string, variables?: any, isCampaign = false) {
  try {
    const prefix = isCampaign ? 'campaign_' : '';
    
    const apiKeyResult = db.prepare(`SELECT value FROM settings WHERE key = '${prefix}sms_api_key'`).get() as any;
    let apiKey = apiKeyResult?.value?.trim();
    
    // Fallback to main if campaign not set
    if (isCampaign && (!apiKey || apiKey === "")) {
      const mainKey = db.prepare("SELECT value FROM settings WHERE key = 'sms_api_key'").get() as any;
      apiKey = mainKey?.value?.trim();
    }

    const senderResult = db.prepare(`SELECT value FROM settings WHERE key = '${prefix}sms_sender'`).get() as any;
    let sender = senderResult?.value?.trim() || (isCampaign ? "" : "3000505");
    if (isCampaign && !sender) {
       const mainSender = db.prepare("SELECT value FROM settings WHERE key = 'sms_sender'").get() as any;
       sender = mainSender?.value?.trim() || "3000505";
    }

    const isPatternResult = db.prepare(`SELECT value FROM settings WHERE key = '${prefix}sms_is_pattern'`).get() as any;
    const isPattern = isPatternResult?.value === '1';

    const smsUserResult = db.prepare(`SELECT value FROM settings WHERE key = '${prefix}sms_username'`).get() as any;
    const smsPassResult = db.prepare(`SELECT value FROM settings WHERE key = '${prefix}sms_password'`).get() as any;
    let username = smsUserResult?.value?.trim();
    let password = smsPassResult?.value?.trim();

    if (isCampaign && (!username || !password)) {
       const mainUser = db.prepare("SELECT value FROM settings WHERE key = 'sms_username'").get() as any;
       const mainPass = db.prepare("SELECT value FROM settings WHERE key = 'sms_password'").get() as any;
       username = mainUser?.value?.trim();
       password = mainPass?.value?.trim();
    }

    // 1. Try Method A: AccessKey (New API)
    if (apiKey && apiKey !== "") {
      if (isPattern && patternCode) {
        await axios.post('https://api2.ippanel.com/api/v1/sms/pattern/normal/send', 
          { recipient: phone, sender: sender, pattern_code: patternCode, variable: variables || {} },
          { headers: { 'Authorization': `AccessKey ${apiKey}` }, timeout: 10000 }
        );
      } else {
        await axios.post('https://api2.ippanel.com/api/v1/sms/send/panel/single', 
          { recipients: [phone], sender: sender, message: message },
          { headers: { 'Authorization': `AccessKey ${apiKey}` }, timeout: 10000 }
        );
      }
      return { success: true };
    }

    // 2. Try Method B: WebService (Old API)
    if (username && password) {
      if (isPattern && patternCode) {
        // Pattern sending via WebService URL (Legacy)
        // Usually: webservice/from7direct.php
        let url = `http://ippanel.com/webservice/from7direct.php?uname=${username}&pass=${password}&from=${sender}&to=${phone}&rcpt=${phone}&pid=${patternCode}`;
        if (variables) {
          Object.entries(variables).forEach(([k, v], i) => {
            url += `&p${i+1}=${k}&v${i+1}=${encodeURIComponent(String(v))}`;
          });
        }
        await axios.get(url, { timeout: 10000 });
      } else {
        // Simple message sending via WebService URL
        await axios.get(`http://ippanel.com/class/sms/webservice/send_url.php?from=${sender}&to=${phone}&msg=${encodeURIComponent(message)}&uname=${username}&pass=${password}`, { timeout: 10000 });
      }
      return { success: true };
    }

    console.warn("[SMS] No credentials configured. Simulated Message:", message);
    return { success: false, simulated: true };
  } catch (err: any) {
    console.error("[SMS Error]", err.response?.data || err.message);
    return { success: false, error: err.message };
  }
}

app.post('/api/otp/request', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) throw new Error("شماره موبایل الزامی است");
    
    // Generate code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60000).toISOString();

    db.prepare('INSERT OR REPLACE INTO otp_requests (phone, code, expires_at) VALUES (?, ?, ?)').run(String(phone), code, expiresAt);

    // Get pattern for OTP
    const patternCodeResult = db.prepare("SELECT value FROM settings WHERE key = 'sms_pattern_code'").get() as any;
    const patternCode = (patternCodeResult?.value || "").trim();

    await sendSMS(phone, `کد تایید شما: ${code}`, patternCode, { code });
    
    console.log(`[OTP] Code for ${phone}: ${code}`);
    res.json({ success: true, message: 'کد تایید ارسال شد.' });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message || 'خطا در ارسال پیامک' });
  }
});

  app.post('/api/otp/verify', (req, res) => {
    const { phone, code, name, surname, custom_data, requested_product_id } = req.body;
    
    if (!phone || !code) {
      return res.status(400).json({ success: false, message: 'اطلاعات ناقص است' });
    }

    const request = db.prepare('SELECT * FROM otp_requests WHERE phone = ?').get(String(phone)) as any;

    if (!request || request.code !== code || new Date(request.expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: 'کد تایید نامعتبر یا منقضی شده است' });
    }

    db.prepare('DELETE FROM otp_requests WHERE phone = ?').run(String(phone));
    
    const existingLead = db.prepare('SELECT id, visit_count, expert FROM leads WHERE phone = ?').get(String(phone)) as any;
    
    let leadId = 0;
    const finalCustomData = custom_data ? (typeof custom_data === 'string' ? custom_data : JSON.stringify(custom_data)) : null;
    const prodId = requested_product_id ? Number(requested_product_id) : null;

    if (existingLead) {
      db.prepare('UPDATE leads SET name = ?, surname = ?, visit_count = visit_count + 1, custom_data = ?, requested_product_id = ? WHERE id = ?')
        .run(name ?? '', surname ?? '', finalCustomData, prodId, existingLead.id);
      leadId = existingLead.id;
    } else {
      const result = db.prepare('INSERT INTO leads (name, surname, phone, custom_data, requested_product_id) VALUES (?, ?, ?, ?, ?)').run(name ?? '', surname ?? '', String(phone), finalCustomData, prodId);
      leadId = Number(result.lastInsertRowid);
    }

    if (!existingLead || !existingLead.expert) {
      const expert = assignLead(leadId);
      if (expert) {
        db.prepare('INSERT INTO lead_activities (lead_id, expert_id, type, content) VALUES (?, ?, ?, ?)')
          .run(leadId, 1, 'note', `ثبت نام جدید و تخصیص خودکار به: ${expert}`);
      }
    }

    res.json({ success: true });
  });

  // Downloads
  app.get('/api/downloads', (req, res) => {
    res.json(db.prepare('SELECT * FROM downloads').all());
  });

  app.post('/api/downloads', (req, res) => {
    const { title, size, link } = req.body;
    const result = db.prepare('INSERT INTO downloads (title, size, link) VALUES (?, ?, ?)').run(title ?? '', size ?? '', link ?? '');
    res.json({ id: result.lastInsertRowid });
  });

  app.delete('/api/downloads/:id', (req, res) => {
    db.prepare('DELETE FROM downloads WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Testimonials
  app.get('/api/testimonials', (req, res) => {
    const list = db.prepare('SELECT * FROM testimonials ORDER BY order_index ASC').all();
    res.json(list);
  });

  app.post('/api/testimonials', (req, res) => {
    const { title, video_type, video_link, video_cover } = req.body;
    const result = db.prepare('INSERT INTO testimonials (title, video_type, video_link, video_cover) VALUES (?, ?, ?, ?)').run(title ?? '', video_type ?? 'direct', video_link ?? '', video_cover ?? '');
    res.json({ id: result.lastInsertRowid });
  });

  app.delete('/api/testimonials/:id', (req, res) => {
    db.prepare('DELETE FROM testimonials WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Products API
  app.get('/api/products', (req, res) => {
    res.json(db.prepare('SELECT * FROM products ORDER BY created_at DESC').all());
  });

  app.post('/api/products', (req, res) => {
    const { name, description, price, installments_enabled, id } = req.body;
    const inst = installments_enabled ? 1 : 0;
    if (id) {
      db.prepare('UPDATE products SET name = ?, description = ?, price = ?, installments_enabled = ? WHERE id = ?').run(name, description, price, inst, id);
      res.json({ success: true });
    } else {
      const result = db.prepare('INSERT INTO products (name, description, price, installments_enabled) VALUES (?, ?, ?, ?)').run(name, description, price, inst);
      res.json({ id: result.lastInsertRowid });
    }
  });

  app.delete('/api/products/:id', (req, res) => {
    try {
      const id = Number(req.params.id);
      db.transaction(() => {
        // Also clean up deposits associated with this product
        db.prepare('DELETE FROM deposit_installments WHERE deposit_id IN (SELECT id FROM deposits WHERE product_id = ?)').run(id);
        db.prepare('DELETE FROM deposits WHERE product_id = ?').run(id);
        db.prepare('UPDATE leads SET requested_product_id = NULL WHERE requested_product_id = ?').run(id);
        db.prepare('DELETE FROM products WHERE id = ?').run(id);
      })();
      res.json({ success: true });
    } catch (error: any) {
      console.error('Product delete error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Custom Fields API
  app.get('/api/custom-fields', (req, res) => {
    res.json(db.prepare('SELECT * FROM custom_fields ORDER BY created_at DESC').all());
  });

  app.post('/api/custom-fields', (req, res) => {
    const { name, label, type, target, is_required, options, id } = req.body;
    if (id) {
      db.prepare('UPDATE custom_fields SET name = ?, label = ?, type = ?, target = ?, is_required = ?, options = ? WHERE id = ?')
        .run(name, label, type, target, is_required ? 1 : 0, options, id);
      res.json({ success: true });
    } else {
      const result = db.prepare('INSERT INTO custom_fields (name, label, type, target, is_required, options) VALUES (?, ?, ?, ?, ?, ?)')
        .run(name, label, type, target, is_required ? 1 : 0, options);
      res.json({ id: result.lastInsertRowid });
    }
  });

  app.delete('/api/custom-fields/:id', (req, res) => {
    db.prepare('DELETE FROM custom_fields WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Stats
  app.get('/api/stats', (req, res) => {
    const { expert_id, username } = req.query;
    
    if (expert_id || username) {
      // Expert specific stats: visits (total), total leads for them, converted leads (stage=customer)
      const totalLeads = db.prepare("SELECT COUNT(*) as count FROM leads WHERE expert = ?").get(username);
      const convertedLeads = db.prepare("SELECT COUNT(*) as count FROM leads WHERE expert = ? AND stage = 'customer'").get(username);
      const todayFollowups = db.prepare("SELECT COUNT(*) as count FROM follow_ups WHERE expert_id = ? AND status = 'pending'").get(expert_id);
      
      res.json({
        totalLeads: (totalLeads as any).count,
        convertedLeads: (convertedLeads as any).count,
        todayFollowups: (todayFollowups as any).count,
        visits: 0 // Visits are global for now
      });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    db.prepare('INSERT OR IGNORE INTO stats (date, visits) VALUES (?, 0)').run(today);
    
    if (req.query.track === 'true') {
      db.prepare('UPDATE stats SET visits = visits + 1 WHERE date = ?').run(today);
    }
    
    const stats = db.prepare('SELECT * FROM stats ORDER BY date ASC LIMIT 30').all();
    const totalVisits = db.prepare('SELECT SUM(visits) as total FROM stats').get();
    const todayVisits = db.prepare('SELECT visits FROM stats WHERE date = ?').get(today);
    
    res.json({
      timeline: stats,
      summary: [
        { label: 'بازدید کل', value: (totalVisits as any).total || 0 },
        { label: 'بازدید امروز', value: (todayVisits as any).visits || 0 }
      ]
    });
  });

  // Announcements API
  app.get('/api/announcements', (req, res) => {
    const { user_id } = req.query;
    let query = `
      SELECT a.*, u.username as author_name 
      FROM announcements a 
      JOIN users u ON a.user_id = u.id 
    `;
    let params: any[] = [];
    
    if (user_id) {
      const user = db.prepare('SELECT role, team_id FROM users WHERE id = ?').get(Number(user_id)) as any;
      if (user && user.role !== 'admin') {
        query += ' WHERE (a.team_id IS NULL OR a.team_id = ?)';
        params.push(user.team_id);
      }
    }
    
    query += ' ORDER BY a.created_at DESC LIMIT 50';
    const list = db.prepare(query).all(...params);
    res.json(list);
  });

  app.post('/api/announcements', (req, res) => {
    const { user_id, team_id, content } = req.body;
    db.prepare('INSERT INTO announcements (user_id, team_id, content) VALUES (?, ?, ?)').run(user_id, team_id || null, content);
    res.json({ success: true });
  });

  app.delete('/api/announcements/:id', (req, res) => {
    db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Deposits & Accounting
  app.get('/api/deposits', (req, res) => {
    const { expert_id, lead_id } = req.query;
    let query = `
      SELECT d.*, l.name as lead_name, l.surname as lead_surname, p.name as product_name, u.username as expert_name
      FROM deposits d
      JOIN leads l ON d.lead_id = l.id
      LEFT JOIN products p ON d.product_id = p.id
      LEFT JOIN users u ON d.expert_id = u.id
    `;
    const params: any[] = [];

    if (expert_id) {
      query += ' WHERE d.expert_id = ?';
      params.push(expert_id);
    } else if (lead_id) {
      query += ' WHERE d.lead_id = ?';
      params.push(lead_id);
    }

    query += ' ORDER BY d.created_at DESC';
    res.json(db.prepare(query).all(...params));
  });

  app.post('/api/deposits', (req, res) => {
    const { lead_id, product_id, amount, receipt_urls, payment_date, payment_type, total_amount, installments, expert_id } = req.body;
    
    // Validate mandatory
    if (!lead_id || !product_id || !amount || !receipt_urls || receipt_urls.length === 0) {
      return res.status(400).json({ error: 'همه فیلدها شامل انتخاب محصول، مبلغ و تصویر فیش اجباری هستند.' });
    }

    const result = db.prepare(`
      INSERT INTO deposits (lead_id, product_id, amount, payment_type, total_amount, installment_count, receipt_urls, payment_date, expert_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      lead_id, 
      product_id, 
      amount, 
      payment_type || 'cash', 
      total_amount || amount, 
      installments?.length || 0,
      JSON.stringify(receipt_urls || []), 
      payment_date, 
      expert_id
    );

    const depositId = result.lastInsertRowid;

    // Handle installments if any
    if (payment_type === 'installments' && Array.isArray(installments)) {
      const stmt = db.prepare('INSERT INTO deposit_installments (deposit_id, amount, due_date) VALUES (?, ?, ?)');
      const followupStmt = db.prepare('INSERT INTO follow_ups (lead_id, expert_id, scheduled_at, notes, status) VALUES (?, ?, ?, ?, ?)');
      
      for (const inst of installments) {
        stmt.run(depositId, inst.amount, inst.due_date);
        
        // Also create follow-ups for each installment
        followupStmt.run(lead_id, expert_id, inst.due_date, `سررسید قسط مشتری - مبلغ: ${inst.amount} تومان`, 'pending');
      }
    }

    // Log activity
    db.prepare('INSERT INTO lead_activities (lead_id, expert_id, type, content) VALUES (?, ?, ?, ?)')
      .run(lead_id, expert_id, 'note', `ثبت ${payment_type === 'cash' ? 'واریزی نقدی' : 'خرید اقساطی'} جدید به مبلغ ${amount} تومان برای محصول ${product_id}`);

    res.json({ id: depositId });
  });

  app.patch('/api/deposits/:id/status', (req, res) => {
    const { status, rejection_reason } = req.body;
    db.prepare('UPDATE deposits SET status = ?, rejection_reason = ? WHERE id = ?')
      .run(status, rejection_reason || null, req.params.id);
    
    // Log activity for lead
    const dep = db.prepare('SELECT lead_id, amount, expert_id FROM deposits WHERE id = ?').get(req.params.id) as any;
    if (dep) {
       const statusFa = status === 'approved' ? 'تایید شد' : (status === 'rejected' ? 'رد شد' : 'نیاز به ارسال مجدد');
       db.prepare('INSERT INTO lead_activities (lead_id, expert_id, type, content) VALUES (?, ?, ?, ?)')
         .run(dep.lead_id, dep.expert_id, 'note', `وضعیت فیش واریزی به مبلغ ${dep.amount} تغییر یافت: ${statusFa}`);
    }

    res.json({ success: true });
  });

  app.get('/api/accounting/stats', (req, res) => {
    const { expert_id, supervisor_id } = req.query;
    
    let saleQuery = `SELECT SUM(amount) as total FROM deposits WHERE status = 'approved'`;
    let prodQuery = `
      SELECT p.name, COUNT(d.id) as count, SUM(d.amount) as total_amount
      FROM deposits d
      JOIN products p ON d.product_id = p.id
      WHERE d.status = 'approved'
    `;
    let expertQuery = `
      SELECT u.username, COUNT(d.id) as count, SUM(d.amount) as total_amount
      FROM deposits d
      JOIN users u ON d.expert_id = u.id
      WHERE d.status = 'approved'
    `;

    const params: any[] = [];
    if (supervisor_id) {
      const teamMates = db.prepare(`
        SELECT id FROM users 
        WHERE team_id = (SELECT team_id FROM users WHERE id = ?)
      `).all(Number(supervisor_id)) as any[];
      
      if (teamMates.length > 0) {
        const ids = teamMates.map(u => u.id);
        const placeholders = ids.map(() => '?').join(',');
        saleQuery += ` AND expert_id IN (${placeholders})`;
        prodQuery += ` AND d.expert_id IN (${placeholders})`;
        expertQuery += ` AND d.expert_id IN (${placeholders})`;
        params.push(...ids);
      } else {
        saleQuery += ' AND 1=0';
        prodQuery += ' AND 1=0';
        expertQuery += ' AND 1=0';
      }
    } else if (expert_id) {
      saleQuery += ' AND expert_id = ?';
      prodQuery += ' AND d.expert_id = ?';
      expertQuery += ' AND d.expert_id = ?';
      params.push(expert_id);
    }

    prodQuery += ' GROUP BY p.id ORDER BY total_amount DESC';
    expertQuery += ' GROUP BY u.id ORDER BY total_amount DESC';

    const totalSales = db.prepare(saleQuery).get(...params) as any;
    const productsSales = db.prepare(prodQuery).all(...params).map((p: any) => ({ ...p, total: p.total_amount }));
    const expertSales = db.prepare(expertQuery).all(...params).map((e: any) => ({ ...e, total: e.total_amount }));

    res.json({
      totalSales: totalSales?.total || 0,
      productsSales,
      expertSales
    });
  });

  app.get('/api/leads/:id/balance', (req, res) => {
    const leadId = req.params.id;
    const lead = db.prepare('SELECT requested_product_id FROM leads WHERE id = ?').get(leadId) as any;
    
    if (!lead || !lead.requested_product_id) {
      return res.json({ debtor: false, paid: 0, total: 0, remaining: 0 });
    }

    const product = db.prepare('SELECT price FROM products WHERE id = ?').get(lead.requested_product_id) as any;
    const deposits = db.prepare("SELECT SUM(amount) as paid FROM deposits WHERE lead_id = ? AND status = 'approved'").get(leadId) as any;

    const totalPrice = parseInt(product?.price || '0');
    const totalPaid = parseInt(deposits?.paid || '0');

    res.json({
      debtor: totalPaid < totalPrice,
      paid: totalPaid,
      total: totalPrice,
      remaining: totalPrice - totalPaid
    });
  });

  // Vite Integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.get('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        
        // Inject SEO settings
        const settingsRes = db.prepare('SELECT key, value FROM settings WHERE key LIKE "seo%"').all() as any[];
        const settings: any = settingsRes.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
        
        if (settings.seo_title) {
          template = template.replace(/<title>.*?<\/title>/, `<title>${settings.seo_title}</title>`);
        }
        if (settings.seo_description) {
          template = template.replace('</head>', `<meta name="description" content="${settings.seo_description}">\n</head>`);
        }
        if (settings.seo_keywords) {
          template = template.replace('</head>', `<meta name="keywords" content="${settings.seo_keywords}">\n</head>`);
        }

        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      let template = fs.readFileSync(path.join(distPath, 'index.html'), 'utf-8');
      
      // Inject SEO settings for production too
      const settingsRes = db.prepare('SELECT key, value FROM settings WHERE key LIKE "seo%"').all() as any[];
      const settings: any = settingsRes.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
      
      if (settings.seo_title) {
        template = template.replace(/<title>.*?<\/title>/, `<title>${settings.seo_title}</title>`);
      }
      if (settings.seo_description) {
        template = template.replace('</head>', `<meta name="description" content="${settings.seo_description}">\n</head>`);
      }
      if (settings.seo_keywords) {
        template = template.replace('</head>', `<meta name="keywords" content="${settings.seo_keywords}">\n</head>`);
      }
      
      res.send(template);
    });
  }

  // Custom Stats API
  app.get('/api/custom-stats', (req, res) => {
    const list = db.prepare('SELECT * FROM custom_stats ORDER BY order_index ASC').all();
    res.json(list);
  });

  app.post('/api/custom-stats', (req, res) => {
    const { title, count } = req.body;
    db.prepare('INSERT INTO custom_stats (title, count) VALUES (?, ?)').run(title, count);
    res.json({ success: true });
  });

  app.delete('/api/custom-stats/:id', (req, res) => {
    db.prepare('DELETE FROM custom_stats WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Background Task: Auto Scheduled SMS
  setInterval(async () => {
    try {
      const isEnabled = db.prepare("SELECT value FROM settings WHERE key = 'auto_sms_enabled'").get() as any;
      if (isEnabled?.value !== '1') return;

      const scheduledList = db.prepare('SELECT * FROM scheduled_sms WHERE is_active = 1').all() as any[];
      
      for (const sms of scheduledList) {
        // Find leads created exactly X days ago who haven't received this SMS yet
        let leadQuery = `
          SELECT * FROM leads 
          WHERE date(created_at, '+' || ? || ' days') = date('now')
          AND id NOT IN (SELECT lead_id FROM lead_scheduled_sms_log WHERE sms_id = ?)
        `;
        if (sms.target === 'leads') {
          leadQuery += " AND status != 'مشتری'";
        }

        const targetLeads = db.prepare(leadQuery).all(sms.send_after_days, sms.id) as any[];

        for (const lead of targetLeads) {
          const msg = sms.message.replace(/\{username\}|\{name\}/g, lead.name || 'کاربر');
          const phone = lead.phone;
          
          try {
            await sendSMS(phone, msg); // Note: Scheduled SMS usually uses standard text sending
            
            // Log in history
            db.prepare('INSERT INTO lead_scheduled_sms_log (lead_id, sms_id) VALUES (?, ?)').run(lead.id, sms.id);
            db.prepare('INSERT INTO lead_activities (lead_id, expert_id, type, content) VALUES (?, ?, ?, ?)')
              .run(lead.id, 1, 'sms_sent', `پیامک سیستمی (${sms.title}): ${msg}`);
              
            console.log(`[AutoSMS] Sent "${sms.title}" to ${phone}`);
          } catch (err: any) {
            console.error(`[AutoSMS] Error sending to ${phone}:`, err.message);
          }
        }
      }
    } catch (e: any) {
      console.error("[AutoSMS] Background task error:", e.message);
    }
  }, 1000 * 60 * 60 * 2); // Run every 2 hours
}

startServer();
