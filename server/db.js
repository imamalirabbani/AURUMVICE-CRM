const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function initDB() {
  try {
    await pool.query("CREATE DATABASE IF NOT EXISTS crm_ai_chat");
    await pool.query("USE crm_ai_chat");

    // 1. Users & Roles (Login multi-user, Role admin/staff)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'staff') DEFAULT 'staff',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Customers (Manajemen pelanggan, Data kontak & perusahaan)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        company VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        status ENUM('active', 'pending', 'inactive') DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Sales Pipeline (Manajemen penjualan)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sales_pipeline (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT,
        deal_name VARCHAR(255),
        amount DECIMAL(10,2),
        stage ENUM('prospect', 'negotiation', 'won', 'lost') DEFAULT 'prospect',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      )
    `);

    // 4. Reminders (Follow up & reminder)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reminders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        description TEXT NOT NULL,
        remind_at DATETIME NOT NULL,
        is_completed BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 5. Messages (Riwayat chat / komunikasi)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id VARCHAR(255) NOT NULL,
        sender ENUM('user', 'ai', 'error', 'system') NOT NULL,
        text TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. Knowledge Base
    await pool.query(`
      CREATE TABLE IF NOT EXISTS knowledge_base (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category VARCHAR(100),
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Setup initial mock data if empty
    const [userRows] = await pool.query("SELECT COUNT(*) as count FROM users");
    if (userRows[0].count === 0) {
      await pool.query("INSERT INTO users (username, password, role) VALUES ('admin', 'admin123', 'admin'), ('staff', 'staff123', 'staff')");
    }

    const [kbRows] = await pool.query("SELECT COUNT(*) as count FROM knowledge_base");
    if (kbRows[0].count === 0) {
      await pool.query(`
        INSERT INTO knowledge_base (category, content) VALUES 
        ('customers', '145 active, 20 pending'),
        ('sales', '$5000 this week'),
        ('top_product', 'Premium Service Plan, Consulting Hour'),
        ('identity', 'Kamu adalah Aurumvice, asisten CRM cerdas yang membantu pengelolaan pelanggan dan penjualan.')
      `);
    }

    console.log('Database schema lengkap (Users, Customers, Sales, dsb) terinisialisasi.');

  } catch (error) {
    console.error('Gagal terhubung atau inisialisasi database MySQL:', error.message);
  }
}

async function saveMessage(sessionId, sender, text) {
  try {
    await pool.query("USE crm_ai_chat");
    await pool.query("INSERT INTO messages (session_id, sender, text) VALUES (?, ?, ?)", [sessionId, sender, text]);
  } catch (e) {
    console.error("Gagal simpan pesan:", e.message);
  }
}

async function getKnowledgeBaseContext() {
  try {
    await pool.query("USE crm_ai_chat");
    const [rows] = await pool.query("SELECT category, content FROM knowledge_base");
    let context = "Informasi CRM dari Database:\\n";
    rows.forEach(r => context += `- ${r.category.toUpperCase()}: ${r.content}\\n`);
    
    // Auto-inject real data from tables if available!
    const [custRows] = await pool.query("SELECT COUNT(*) as total FROM customers WHERE status='active'");
    context += `- DB_ACTIVE_CUSTOMERS: ${custRows[0].total}\\n`;
    
    return context;
  } catch (e) {
    return "Kamu adalah Aurumvice, asisten CRM cerdas.";
  }
}

module.exports = { pool, initDB, saveMessage, getKnowledgeBaseContext };
