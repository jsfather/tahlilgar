
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import axios from 'axios';
import fs from 'fs';
import jalaali from 'jalaali-js';

import multer from 'multer';

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
    permissions TEXT DEFAULT '["stats","leads","content","downloads","sms","seo","admins"]'
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
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
try { db.exec('ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT \'["stats","leads","content","downloads","sms","seo","admins"]\''); } catch(e) {}
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
  ['last_expert_idx', '0']
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
    const users = db.prepare('SELECT id, username, role, permissions FROM users').all();
    res.json(users);
  });

  app.post('/api/admins', (req, res) => {
    const { username, password, role, permissions, id } = req.body;
    const permsString = Array.isArray(permissions) ? JSON.stringify(permissions) : permissions;
    if (id) {
      if (password) {
        db.prepare('UPDATE users SET username = ?, password = ?, role = ?, permissions = ? WHERE id = ?').run(username ?? null, password ?? null, role ?? null, permsString ?? null, id);
      } else {
        db.prepare('UPDATE users SET username = ?, role = ?, permissions = ? WHERE id = ?').run(username ?? null, role ?? null, permsString ?? null, id);
      }
    } else {
      db.prepare('INSERT INTO users (username, password, role, permissions) VALUES (?, ?, ?, ?)').run(username ?? null, password ?? null, role ?? null, permsString ?? null);
    }
    res.json({ success: true });
  });

  app.delete('/api/admins/:id', (req, res) => {
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.get('/api/leads', (req, res) => {
    const { search, startDate, endDate, expert } = req.query;
    let query = 'SELECT * FROM leads';
    let params: any[] = [];
    let conditions: string[] = [];

    // EXPERT PROTECTION: If expert is provided via query, it means the UI is restricted.
    // However, we should also check the user's role on the frontend side.
    // For full security, we'd need a token-based auth here, but following the current pattern:
    if (expert && typeof expert === 'string') {
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
    // For now, since we only have pattern-based SMS implementation in the system, 
    // and direct text sending might be restricted or require a specific pattern for IPPanel... 
    // WE WILL LOG IT and simulate it if no API key.
    
    console.log(`[SMS Simulation] To: ${phone}, Pattern: ${pattern_code || 'N/A'}, Content: ${message}`);
    
    if (lead_id && expert_id) {
      db.prepare('INSERT INTO lead_activities (lead_id, expert_id, type, content) VALUES (?, ?, ?, ?)')
        .run(lead_id, expert_id, 'sms_sent', `پیامک ارسال شد: ${message}`);
    }
    
    res.json({ success: true });
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
    const stmt = db.prepare('DELETE FROM leads WHERE id = ?');
    const transaction = db.transaction((idList) => {
      let count = 0;
      for (const id of idList) {
        const res = stmt.run(Number(id));
        count += res.changes;
      }
      return count;
    });
    const totalChanges = transaction(ids);
    console.log(`✅ BULK DELETE successful. Total rows deleted: ${totalChanges}`);
    res.json({ success: true, changes: totalChanges });
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
  app.post('/api/otp/request', async (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone) throw new Error("شماره موبایل الزامی است");
      
      const mobileE164 = toE164Iran(phone);
      
      // MASTER CODE MODE (Temporary while SMS panel is down)
      const code = "123456"; 
      const expiresAt = new Date(Date.now() + 60 * 60000).toISOString(); // 1 hour expiry for convenience

      db.prepare('INSERT OR REPLACE INTO otp_requests (phone, code, expires_at) VALUES (?, ?, ?)').run(String(phone), code, expiresAt);

      // SMS sending logic
      const apiKeyResult = db.prepare("SELECT value FROM settings WHERE key = 'sms_api_key'").get() as any;
      const apiKey = apiKeyResult?.value?.trim();
      
      if (apiKey && apiKey !== "") {
        const patternCodeResult = db.prepare("SELECT value FROM settings WHERE key = 'sms_pattern_code'").get() as any;
        const patternCode = (patternCodeResult?.value || "otp_pattern").trim();
        const senderResult = db.prepare("SELECT value FROM settings WHERE key = 'sms_sender'").get() as any;
        const sender = senderResult?.value?.trim() || "3000505";
        
        const trySend = async (url: string, headers: any, data: any) => {
          try {
            const response = await axios.post(url, data, { 
              headers: {
                ...headers,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
              }, 
              timeout: 15000 
            });
            return { success: true, url };
          } catch (error: any) {
            return { success: false, url, status: error.response?.status, message: error.message };
          }
        };

        const edgeUrl = 'https://edge.ippanel.com/v1/sms/pattern/send';
        const fallbacks = [
          { url: 'https://api.ippanel.com/api/v1/sms/pattern/normal/send', headers: { 'Authorization': `AccessKey ${apiKey}` } },
          { url: 'https://rest.ippanel.com/v1/messages/patterns/send', headers: { 'Authorization': `AccessKey ${apiKey}` } },
          { url: 'https://api2.ippanel.com/api/v1/sms/pattern/normal/send', headers: { 'Authorization': `AccessKey ${apiKey}` } }
        ];

        // Attempt 1: Edge API (Newest)
        let attempt = await trySend(
          edgeUrl,
          { 'Content-Type': 'application/json', 'Authorization': apiKey },
          { code: patternCode, sender: sender, recipient: mobileE164, variable: { code } }
        );

        // Fallbacks
        if (!attempt.success) {
          console.warn(`⚠️ Edge API failed (${attempt.status}). Trying ${fallbacks.length} fallbacks...`);
          for (const fb of fallbacks) {
            // Wait 1 second between retries to be safer
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const targetRecipient = fb.url.includes('rest.ippanel.com') ? mobileE164 : phone;
            attempt = await trySend(
              fb.url, 
              fb.headers,
              { recipient: targetRecipient, sender: sender, pattern_code: patternCode, variable: { code } }
            );
            if (attempt.success) {
              console.log(`✅ SMS sent successfully via fallback: ${fb.url}`);
              break;
            }
          }
        }

        if (attempt.success) {
          console.log(`✨ OTP successfully delivered to ${mobileE164}`);
        } else {
          console.error(`❌ IPPANEL SERVICE OUTAGE (502/504). All 4 endpoints failed.`);
          console.error(`This error comes from IPPanel servers. Please use the code below for testing.`);
        }
      } else {
        console.log("ℹ️ No SMS API Key configured. SMS skipped.");
      }
      
      // EXTREMELY VISIBLE OTP LOG (Perfect for testing during outages)
      console.log("\n" + "█".repeat(60));
      console.log(`█  🚀 DEBUG OTP FOR [ ${phone} ]`);
      console.log(`█  👉 CODE:    [ ${code} ]`);
      console.log(`█  (Use this code in the app if SMS is not received)`);
      console.log("█".repeat(60) + "\n");
      
      res.json({ 
        success: true, 
        message: 'کد تایید (۱۲۳۴۵۶) به صورت موقت فعال شد. لطفاً از این کد برای ورود استفاده کنید.' 
      });
    } catch (e: any) {
      console.error("Internal Request Error:", e.message);
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
    const finalCustomData = custom_data ? JSON.stringify(custom_data) : null;
    const prodId = requested_product_id ? Number(requested_product_id) : null;

    if (existingLead) {
      db.prepare('UPDATE leads SET name = ?, surname = ?, visit_count = visit_count + 1, custom_data = ?, requested_product_id = ? WHERE id = ?')
        .run(name ?? '', surname ?? '', finalCustomData, prodId, existingLead.id);
      leadId = existingLead.id;
    } else {
      const result = db.prepare('INSERT INTO leads (name, surname, phone, custom_data, requested_product_id) VALUES (?, ?, ?, ?, ?)').run(name ?? '', surname ?? '', String(phone), finalCustomData, prodId);
      leadId = Number(result.lastInsertRowid);
    }

    // ROUND ROBIN ASSIGNMENT
    const assignmentMode = db.prepare("SELECT value FROM settings WHERE key = 'lead_assignment_mode'").get() as any;
    const isNewLead = !existingLead || !existingLead.expert;

    if (assignmentMode?.value === 'round_robin' && isNewLead) {
      const experts = db.prepare("SELECT username FROM users WHERE role = 'expert'").all() as any[];
      if (experts.length > 0) {
        const lastIdxRes = db.prepare("SELECT value FROM settings WHERE key = 'last_expert_idx'").get() as any;
        let nextIdx = (parseInt(lastIdxRes?.value || '0') + 1) % experts.length;
        const expert = experts[nextIdx].username;

        db.prepare('UPDATE leads SET expert = ?, status = ? WHERE id = ?').run(expert, 'تخصیص داده شده', leadId);
        db.prepare("UPDATE settings SET value = ? WHERE key = 'last_expert_idx'").run(String(nextIdx));
        
        db.prepare('INSERT INTO lead_activities (lead_id, expert_id, type, content) VALUES (?, ?, ?, ?)')
          .run(leadId, 1, 'note', `تخصیص خودکار (Round-Robin) به کارشناس: ${expert}`);
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
    const { name, description, price, id } = req.body;
    if (id) {
      db.prepare('UPDATE products SET name = ?, description = ?, price = ? WHERE id = ?').run(name, description, price, id);
      res.json({ success: true });
    } else {
      const result = db.prepare('INSERT INTO products (name, description, price) VALUES (?, ?, ?)').run(name, description, price);
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
    const list = db.prepare(`
      SELECT a.*, u.username as author_name 
      FROM announcements a 
      JOIN users u ON a.user_id = u.id 
      ORDER BY a.created_at DESC LIMIT 50
    `).all();
    res.json(list);
  });

  app.post('/api/announcements', (req, res) => {
    const { user_id, content } = req.body;
    db.prepare('INSERT INTO announcements (user_id, content) VALUES (?, ?)').run(user_id, content);
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
    const { expert_id } = req.query;
    
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
    if (expert_id) {
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
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
