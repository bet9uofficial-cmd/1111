import { Telegraf, Markup } from 'telegraf';
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Updated with user provided token
const token = process.env.BOT_TOKEN || '8363912036:AAE7WRgBEj5VVpI7M7HT09j44v1Km6l8XdQ';
const webAppUrl = process.env.WEBAPP_URL || 'https://1111-pearl-mu.vercel.app/';

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://fkxayehvmgcevihuofag.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreGF5ZWh2bWdjZXZpaHVvZmFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg3OTc5NywiZXhwIjoyMDgwNDU1Nzk3fQ.2CkjAentP171gXlu-8eim7zM_9NvFyIctdw7atf9TWU';

const PORT = process.env.PORT || 3000;

if (!token) {
  console.error('Error: BOT_TOKEN is missing.');
  // @ts-ignore
  process.exit(1);
}

// --- DATABASE CONNECTION ---
let supabase;
if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ WARNING: SUPABASE_URL or SUPABASE_KEY is missing. Data will NOT be saved.');
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client initialized');
  } catch (err) {
    console.error('❌ Failed to initialize Supabase:', err);
  }
}

// --- HELPER ALGORITHM ---
const generateAmounts = (total, shares) => {
  let remainAmount = total;
  let remainShares = shares;
  const results = [];
  for (let i = 0; i < shares - 1; i++) {
    const max = (remainAmount / remainShares) * 2;
    let money = Math.max(0.01, Math.random() * max);
    money = Math.floor(money * 100) / 100;
    results.push(money);
    remainAmount -= money;
    remainShares--;
  }
  results.push(Math.round(remainAmount * 100) / 100);
  return results.sort(() => Math.random() - 0.5); // Shuffle
};

// --- HELPER: Async Handler Wrapper ---
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// --- EXPRESS SERVER (API) ---
const app = express();
app.use(cors());
app.use(express.json());

// 1. Serve Static Files
app.use('/', express.static(path.join(__dirname, 'dist')));

// 2. API Routes

// Create Packet
app.post('/api/create', asyncHandler(async (req, res) => {
  try {
    const { totalAmount, totalShares, wishing, creatorId } = req.body;
    const id = uuidv4();
    const amounts = generateAmounts(parseFloat(totalAmount), parseInt(totalShares));
    
    if (supabase) {
      const { error } = await supabase
        .from('packets')
        .insert([{
          id,
          creator_id: creatorId,
          config: { totalAmount, totalShares, wishing },
          remaining_amounts: amounts,
          records: [], // Init empty array
          created_at: Date.now()
        }]);

      if (error) throw error;
    }

    res.json({ id });
  } catch (err) {
    console.error("Create Error:", err);
    res.status(500).json({ error: 'Database error' });
  }
}));

// Get Packet Info
app.get('/api/packet/:id', asyncHandler(async (req, res) => {
  try {
    if (!supabase) {
      res.status(500).json({ error: 'DB not configured' });
      return;
    }

    const { data: packet, error } = await supabase
      .from('packets')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !packet) {
      res.status(404).json({ error: 'Packet not found' });
      return;
    }
    
    const safeData = {
      id: packet.id,
      creatorId: packet.creator_id,
      config: packet.config,
      records: packet.records || [],
      createdAt: packet.created_at,
      isFinished: packet.remaining_amounts.length === 0,
      sharesLeft: packet.remaining_amounts.length
    };
    
    res.json(safeData);
  } catch (err) {
    console.error("Get Error:", err);
    res.status(500).json({ error: 'Database error' });
  }
}));

// Grab Packet
app.post('/api/packet/:id/grab', asyncHandler(async (req, res) => {
  try {
    if (!supabase) {
      res.status(500).json({ error: 'DB not configured' });
      return;
    }

    // 1. Fetch current state
    const { data: packet, error: fetchError } = await supabase
      .from('packets')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !packet) {
      res.status(404).json({ error: 'Packet not found' });
      return;
    }

    const { userId, userName, avatarUrl } = req.body;
    const records = packet.records || [];
    const remainingAmounts = packet.remaining_amounts || [];

    // 2. Check Logic
    const existingRecord = records.find(r => r.userId === userId);
    if (existingRecord) {
      res.json({ record: existingRecord, status: 'ALREADY_GRABBED' });
      return;
    }

    if (remainingAmounts.length === 0) {
      res.json({ status: 'EMPTY' });
      return;
    }

    // 3. Update Data
    const amount = remainingAmounts.pop();
    
    const newRecord = {
      userId,
      userName,
      avatarUrl,
      amount,
      timestamp: Date.now(),
      isBestLuck: false 
    };
    records.push(newRecord);

    // 4. Save back to DB
    const { error: updateError } = await supabase
      .from('packets')
      .update({
        remaining_amounts: remainingAmounts,
        records: records
      })
      .eq('id', packet.id);

    if (updateError) throw updateError;

    res.json({ record: newRecord, status: 'SUCCESS' });
  } catch (err) {
    console.error("Grab Error:", err);
    res.status(500).json({ error: 'Database error' });
  }
}));

// 3. Catch-all handler for React Routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// --- TELEGRAM BOT ---
const bot = new Telegraf(token);

// Handle Inline Query (Sharing from Web App to Groups)
bot.on('inline_query', async (ctx) => {
  const query = ctx.inlineQuery.query; // This will be the packet ID
  if (!query) return;

  const results = [
    {
      type: 'article',
      id: query, 
      title: '🧧 Lucky Red Packet',
      description: 'Tap to send a Red Packet to this chat!',
      thumbnail_url: 'https://cdn-icons-png.flaticon.com/512/6457/6457673.png',
      input_message_content: {
        message_text: '🧧 I sent a Lucky Red Packet! Who is fast enough to grab it? 🚀'
      },
      reply_markup: {
        inline_keyboard: [[
          {
            text: '💰 Open Red Packet',
            web_app: { url: `${webAppUrl}?startapp=${query}` }
          }
        ]]
      }
    }
  ];
  
  try {
    await ctx.answerInlineQuery(results, { cache_time: 0 });
  } catch (e) {
    console.error("Inline Query Error:", e);
  }
});

bot.command('start', (ctx) => {
  const startPayload = ctx.payload; 
  
  let message = '🧧 Welcome to Lucky Red Packet!';
  let buttonText = '💰 Create Red Packet';
  let url = webAppUrl;

  if (startPayload) {
    message = '🧧 Someone sent you a Red Packet! Click below to open it.';
    buttonText = '💰 Open Red Packet';
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}startapp=${startPayload}`;
  }

  // Use inlineKeyboard for better group chat compatibility
  ctx.reply(message, Markup.inlineKeyboard([
    Markup.button.webApp(buttonText, url)
  ]));
});

// Set the menu button
bot.telegram.setChatMenuButton({
  menuButton: {
    type: 'web_app',
    text: '🧧 Lucky Packet',
    web_app: { url: webAppUrl }
  }
}).catch(e => console.error("Failed to set menu button:", e));

bot.launch().then(() => {
  console.log('Telegram Bot launched');
}).catch(err => console.error('Bot launch failed:', err));

// Start Express Server
app.listen(PORT, () => {
  console.log(`Web Server running on port ${PORT}`);
});

// Graceful Stop
// @ts-ignore
process.once('SIGINT', () => { bot.stop('SIGINT'); process.exit(); });
// @ts-ignore
process.once('SIGTERM', () => { bot.stop('SIGTERM'); process.exit(); });