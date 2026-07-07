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
