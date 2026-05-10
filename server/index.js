const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { pool, initDB, saveMessage, getKnowledgeBaseContext } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// =============================================
// REST API ENDPOINTS
// =============================================

// --- AUTH / LOGIN ---
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    await pool.query("USE crm_ai_chat");
    const [rows] = await pool.query("SELECT id, username, role FROM users WHERE username=? AND password=?", [username, password]);
    if (rows.length > 0) {
      res.json({ success: true, user: rows[0] });
    } else {
      res.status(401).json({ success: false, message: "Username atau password salah" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- CUSTOMERS CRUD ---
app.get('/api/customers', async (req, res) => {
  try {
    await pool.query("USE crm_ai_chat");
    const [rows] = await pool.query("SELECT * FROM customers ORDER BY created_at DESC");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const { name, company, email, phone, status } = req.body;
    await pool.query("USE crm_ai_chat");
    const [result] = await pool.query(
      "INSERT INTO customers (name, company, email, phone, status) VALUES (?, ?, ?, ?, ?)",
      [name, company || '', email || '', phone || '', status || 'active']
    );
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  try {
    const { name, company, email, phone, status } = req.body;
    await pool.query("USE crm_ai_chat");
    await pool.query(
      "UPDATE customers SET name=?, company=?, email=?, phone=?, status=? WHERE id=?",
      [name, company, email, phone, status, req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    await pool.query("USE crm_ai_chat");
    await pool.query("DELETE FROM customers WHERE id=?", [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- SALES PIPELINE CRUD ---
app.get('/api/sales', async (req, res) => {
  try {
    await pool.query("USE crm_ai_chat");
    const [rows] = await pool.query(`
      SELECT sp.*, c.name as customer_name 
      FROM sales_pipeline sp 
      LEFT JOIN customers c ON sp.customer_id = c.id 
      ORDER BY sp.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sales', async (req, res) => {
  try {
    const { customer_id, deal_name, amount, stage } = req.body;
    await pool.query("USE crm_ai_chat");
    const [result] = await pool.query(
      "INSERT INTO sales_pipeline (customer_id, deal_name, amount, stage) VALUES (?, ?, ?, ?)",
      [customer_id, deal_name, amount, stage || 'prospect']
    );
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/sales/:id', async (req, res) => {
  try {
    const { stage } = req.body;
    await pool.query("USE crm_ai_chat");
    await pool.query("UPDATE sales_pipeline SET stage=? WHERE id=?", [stage, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/sales/:id', async (req, res) => {
  try {
    await pool.query("USE crm_ai_chat");
    await pool.query("DELETE FROM sales_pipeline WHERE id=?", [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- REMINDERS ---
app.get('/api/reminders', async (req, res) => {
  try {
    await pool.query("USE crm_ai_chat");
    const [rows] = await pool.query("SELECT * FROM reminders ORDER BY remind_at ASC");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reminders', async (req, res) => {
  try {
    const { user_id, description, remind_at } = req.body;
    await pool.query("USE crm_ai_chat");
    const [result] = await pool.query(
      "INSERT INTO reminders (user_id, description, remind_at) VALUES (?, ?, ?)",
      [user_id, description, remind_at]
    );
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/reminders/:id/done', async (req, res) => {
  try {
    await pool.query("USE crm_ai_chat");
    await pool.query("UPDATE reminders SET is_completed=TRUE WHERE id=?", [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/reminders/:id', async (req, res) => {
  try {
    await pool.query("USE crm_ai_chat");
    await pool.query("DELETE FROM reminders WHERE id=?", [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- CHAT HISTORY ---
app.get('/api/messages', async (req, res) => {
  try {
    await pool.query("USE crm_ai_chat");
    const [rows] = await pool.query("SELECT * FROM messages ORDER BY timestamp ASC LIMIT 200");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- KNOWLEDGE BASE CRUD ---
app.get('/api/knowledge', async (req, res) => {
  try {
    await pool.query("USE crm_ai_chat");
    const [rows] = await pool.query("SELECT * FROM knowledge_base ORDER BY created_at DESC");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/knowledge', async (req, res) => {
  try {
    const { category, content } = req.body;
    await pool.query("USE crm_ai_chat");
    const [result] = await pool.query("INSERT INTO knowledge_base (category, content) VALUES (?, ?)", [category, content]);
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/knowledge/:id', async (req, res) => {
  try {
    await pool.query("USE crm_ai_chat");
    await pool.query("DELETE FROM knowledge_base WHERE id=?", [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- DASHBOARD STATS ---
app.get('/api/dashboard', async (req, res) => {
  try {
    await pool.query("USE crm_ai_chat");
    const [custActive] = await pool.query("SELECT COUNT(*) as c FROM customers WHERE status='active'");
    const [custPending] = await pool.query("SELECT COUNT(*) as c FROM customers WHERE status='pending'");
    const [custTotal] = await pool.query("SELECT COUNT(*) as c FROM customers");
    const [salesTotal] = await pool.query("SELECT IFNULL(SUM(amount),0) as total FROM sales_pipeline WHERE stage='won'");
    const [salesProspect] = await pool.query("SELECT COUNT(*) as c FROM sales_pipeline WHERE stage='prospect'");
    const [salesNego] = await pool.query("SELECT COUNT(*) as c FROM sales_pipeline WHERE stage='negotiation'");
    const [salesWon] = await pool.query("SELECT COUNT(*) as c FROM sales_pipeline WHERE stage='won'");
    const [salesLost] = await pool.query("SELECT COUNT(*) as c FROM sales_pipeline WHERE stage='lost'");
    const [remPending] = await pool.query("SELECT COUNT(*) as c FROM reminders WHERE is_completed=FALSE");
    const [msgCount] = await pool.query("SELECT COUNT(*) as c FROM messages");
    res.json({
      activeCustomers: custActive[0].c,
      pendingCustomers: custPending[0].c,
      totalCustomers: custTotal[0].c,
      totalSalesWon: salesTotal[0].total,
      prospects: salesProspect[0].c,
      negotiations: salesNego[0].c,
      won: salesWon[0].c,
      lost: salesLost[0].c,
      pendingReminders: remPending[0].c,
      totalMessages: msgCount[0].c
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// SOCKET.IO HANDLING
// =============================================

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('send_message', async (data) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        socket.emit('receive_message', { message: "GEMINI_API_KEY belum dikonfigurasi.", sender: 'ai', timestamp: new Date().toISOString() });
        return;
      }

      await saveMessage(socket.id, 'user', data.message);

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

      const dynamicContext = await getKnowledgeBaseContext();
      const prompt = dynamicContext + "\n\nKamu adalah Aurumvice, asisten CRM profesional yang cerdas. Jawablah dengan bahasa Indonesia yang ramah, ringkas, dan informatif.\n\nPesan Pengguna: " + data.message;
      const result = await model.generateContent(prompt);
      const replyMessage = result.response.text();
      
      await saveMessage(socket.id, 'ai', replyMessage);
      socket.emit('receive_message', { message: replyMessage, sender: 'ai', timestamp: new Date().toISOString() });
      
    } catch (error) {
      console.error(error);
      socket.emit('receive_message', { message: "Maaf, terjadi kesalahan. Silakan coba lagi.", sender: 'error', timestamp: new Date().toISOString() });
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
initDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
