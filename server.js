require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const twilio = require('twilio');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// In-memory notifications log (dashboard visualizer)
const notificationsLog = [];

// Load seating tables
const tablesFilePath = path.join(__dirname, 'data', 'tables.json');
let tablesData = [];
try {
  tablesData = JSON.parse(fs.readFileSync(tablesFilePath, 'utf8'));
} catch (error) {
  console.error("Failed to load tables.json", error);
}

// Twilio Helper Setup
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// Helper to log notifications
function logNotification(type, title, description, details) {
  const logItem = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type, // 'reservation' or 'order'
    title,
    description,
    details,
    timestamp: new Date().toISOString(),
    smsSent: false,
    callSent: false,
    smsStatus: 'Not Sent (No Twilio Config)',
    callStatus: 'Not Sent (No Twilio Config)'
  };
  notificationsLog.unshift(logItem); // Newest first
  return logItem;
}

// API Routes

// Get all tables
app.get('/api/tables', (req, res) => {
  res.json(tablesData);
});

// Get all notification logs (for the admin dashboard simulation)
app.get('/api/notifications', (req, res) => {
  res.json(notificationsLog);
});

// Reserve a table
app.post('/api/reserve', async (req, res) => {
  const { tableName, tableId, guestName, guestEmail, date, time, guestsCount } = req.body;

  if (!guestName || !date || !time || !tableId) {
    return res.status(400).json({ error: "Missing required reservation details." });
  }

  const title = `New Table Reservation: ${tableName}`;
  const description = `Guest ${guestName} reserved ${tableName} on ${date} at ${time} for ${guestsCount} guests.`;
  const details = { guestName, guestEmail, date, time, guestsCount, tableId };
  const logItem = logNotification('reservation', title, description, details);

  // Trigger Twilio SMS to Admin
  if (twilioClient && process.env.TWILIO_PHONE_NUMBER && process.env.ADMIN_PHONE_NUMBER) {
    try {
      const messageBody = `⛰️ AURA RESERVATION ALERT:\nTable: ${tableName}\nGuest: ${guestName}\nDate: ${date} @ ${time}\nGuests: ${guestsCount}`;
      const message = await twilioClient.messages.create({
        body: messageBody,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: process.env.ADMIN_PHONE_NUMBER
      });
      logItem.smsSent = true;
      logItem.smsStatus = `Sent successfully. SID: ${message.sid}`;
      console.log(`[SMS] Reservation notification sent. SID: ${message.sid}`);
    } catch (error) {
      logItem.smsStatus = `Failed to send SMS: ${error.message}`;
      console.error("[Twilio SMS Error]", error);
    }
  } else {
    logItem.smsStatus = "Simulated: SMS logged to admin console (Twilio credentials not set).";
    console.log(`[SMS Simulated] ${description}`);
  }

  res.status(201).json({
    message: "Reservation recorded successfully",
    notification: logItem
  });
});

// Order food
app.post('/api/order', async (req, res) => {
  const { tableDesignation, items, totalAmount, specialInstructions } = req.body;

  if (!tableDesignation || !items || items.length === 0) {
    return res.status(400).json({ error: "Missing table designation or menu items." });
  }

  const itemsList = items.map(i => `${i.quantity}x ${i.name}`).join(', ');
  const title = `New Order: Table/Zone ${tableDesignation}`;
  const description = `Table ${tableDesignation} ordered: ${itemsList}. Total: $${totalAmount}.`;
  const details = { tableDesignation, items, totalAmount, specialInstructions };
  const logItem = logNotification('order', title, description, details);

  // Trigger Twilio SMS
  if (twilioClient && process.env.TWILIO_PHONE_NUMBER && process.env.ADMIN_PHONE_NUMBER) {
    try {
      const messageBody = `🍳 AURA ORDER ALERT:\nTable ${tableDesignation} ordered:\n${itemsList}\nTotal: $${totalAmount}\nRequests: ${specialInstructions || 'None'}`;
      const message = await twilioClient.messages.create({
        body: messageBody,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: process.env.ADMIN_PHONE_NUMBER
      });
      logItem.smsSent = true;
      logItem.smsStatus = `Sent successfully. SID: ${message.sid}`;
      console.log(`[SMS] Order notification sent. SID: ${message.sid}`);
    } catch (error) {
      logItem.smsStatus = `Failed to send SMS: ${error.message}`;
      console.error("[Twilio SMS Error]", error);
    }
  } else {
    logItem.smsStatus = "Simulated: SMS logged to admin console (Twilio credentials not set).";
    console.log(`[SMS Simulated] Order: Table ${tableDesignation} ordered ${itemsList}`);
  }

  // Trigger Twilio Voice Call (Requires Twilio setup)
  if (twilioClient && process.env.TWILIO_PHONE_NUMBER && process.env.ADMIN_PHONE_NUMBER) {
    try {
      const twimlContent = `<Response>
        <Say voice="alice">Attention Chef. A new dining order has been received from table ${tableDesignation} for the following items: ${itemsList}. Total amount is ${totalAmount} dollars. Please prepare the order immediately.</Say>
      </Response>`;

      const call = await twilioClient.calls.create({
        twiml: twimlContent,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: process.env.ADMIN_PHONE_NUMBER
      });

      logItem.callSent = true;
      logItem.callStatus = `Call initiated. SID: ${call.sid}`;
      console.log(`[Call] Admin call initiated. SID: ${call.sid}`);
    } catch (error) {
      logItem.callStatus = `Failed to initiate call: ${error.message}`;
      console.error("[Twilio Call Error]", error);
    }
  } else {
    logItem.callStatus = "Simulated: Voice Call logged to admin console (Twilio credentials not set).";
    console.log(`[Call Simulated] Voice Call triggered to admin for Table ${tableDesignation} order.`);
  }

  res.status(201).json({
    message: "Order placed successfully",
    notification: logItem
  });
});

// Helper to translate Imginn image URLs to direct Instagram CDN URLs
function getDirectCDNUrl(rawUrl) {
  try {
    if (!rawUrl || rawUrl.startsWith('/')) {
      return rawUrl;
    }
    const htMatch = rawUrl.match(/_nc_ht=([^&?#]*)/);
    const host = htMatch ? decodeURIComponent(htMatch[1]) : 'scontent-phl2-1.cdninstagram.com';
    
    const pathMatch = rawUrl.match(/\?([^?]*\.(jpg|png|webp|mp4|jpeg))/i);
    const path = pathMatch ? decodeURIComponent(pathMatch[1]) : '';
    
    const queryPartIdx = rawUrl.indexOf('?', rawUrl.indexOf('?') + 1);
    const query = queryPartIdx !== -1 
      ? rawUrl.substring(queryPartIdx + 1).replace(/&#38;/g, '&').replace(/&amp;/g, '&') 
      : '';
      
    if (!path) return rawUrl;
    return `https://${host}/v/${path}?${query}`;
  } catch (e) {
    return rawUrl;
  }
}

// Get all instagram posts dynamically by scraping Imginn (with fallback)
app.get('/api/instagram', async (req, res) => {
  const username = 'thefusionlab__';
  const url = `https://imginn.com/${username}/`;
  
  // Default fallback posts
  const fallbackPosts = [
    {
      id: "insta_1",
      url: "https://www.instagram.com/p/C_abc123/",
      imageUrl: "/p1.jpg",
      caption: "Fireside Wood Oven Roasted Lamb - a culinary masterpiece cooked to woodfire perfection. 🌲🍖 #thefusionlab #kufri #alpinedining",
      likes: 245,
      comments: 18,
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "insta_2",
      url: "https://www.instagram.com/p/C_def456/",
      imageUrl: "/p6.jpg",
      caption: "Fresh Peak Plating: clean mountain flavors crafted with ingredients of the valley. 🏔️🥗 #thefusionlab #alpinecafe",
      likes: 189,
      comments: 12,
      timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "insta_3",
      url: "https://www.instagram.com/p/C_ghi789/",
      imageUrl: "/p5food.jpg",
      caption: "Alpine desserts prepared fresh daily at Altitude Marker 14. 🍰🌲 #thefusionlab #kufri #mountaincafe",
      likes: 312,
      comments: 25,
      timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
      console.log(`[Instagram Scraper] Imginn returned status ${response.status}. Using fallback posts.`);
      return res.json(fallbackPosts);
    }
    
    const html = await response.text();
    const regex = /<div class="item"><div class="img"><a href="\/p\/([^"]*)\/" aria-label="([^"]*)"><img[^>]*src="([^"]*)"/g;
    let match;
    const posts = [];
    let count = 0;
    
    while ((match = regex.exec(html)) !== null && count < 6) {
      const shortcode = match[1];
      const caption = match[2] || "Fresh update from our kitchen! 🏔️☕";
      const rawImgUrl = match[3];
      const imageUrl = `/api/instagram-image?url=${encodeURIComponent(rawImgUrl)}`;
      
      posts.push({
        id: `insta_${shortcode}`,
        url: `https://www.instagram.com/p/${shortcode}/`,
        imageUrl: imageUrl,
        caption: caption,
        likes: Math.floor(Math.random() * 250) + 75,
        comments: Math.floor(Math.random() * 30) + 6,
        timestamp: new Date(Date.now() - count * 12 * 60 * 60 * 1000).toISOString()
      });
      count++;
    }
    
    if (posts.length === 0) {
      console.log("[Instagram Scraper] Parsed 0 posts. Using fallback posts.");
      return res.json(fallbackPosts);
    }
    
    res.json(posts);
  } catch (err) {
    console.error("[Instagram Scraper Error]", err.message);
    res.json(fallbackPosts);
  }
});

// Image proxy to bypass Instagram/Imginn hotlink block
app.get('/api/instagram-image', async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl) {
    return res.status(400).send("Missing image URL");
  }
  try {
    const directUrl = getDirectCDNUrl(imageUrl);
    const response = await fetch(directUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) {
      return res.status(response.status).send("Failed to fetch image");
    }
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.send(buffer);
  } catch (e) {
    console.error("[Image Proxy Error]", e.message);
    res.status(500).send("Proxy error");
  }
});

// Serve frontend assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
