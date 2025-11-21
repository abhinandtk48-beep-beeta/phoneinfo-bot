import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

const TOKEN = process.env.BOT_TOKEN;
const API_KEY = process.env.API_KEY;
const URL = process.env.RENDER_URL; // <-- ADD THIS IN RENDER ENV

const app = express();
app.use(express.json());

// Create bot WITHOUT polling
const bot = new TelegramBot(TOKEN);

// --- TELEGRAM WEBHOOK ENDPOINT ----
app.post(`/webhook/${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body); // Pass update to bot
  res.sendStatus(200);
});

// --- PHONE INFO FUNCTION ---
async function getPhoneInfo(phone) {
  try {
    const response = await axios.get(
      `https://api.apilayer.com/number_verification/validate?number=${phone}`,
      {
        headers: { apikey: API_KEY },
      }
    );

    const data = response.data;
    if (!data.valid) {
      return { error: "❌ Invalid phone number or not found." };
    }

    return {
      country: data.country_name || "Unknown",
      location: data.location || "Unknown",
      carrier: data.carrier || "Unknown",
    };
  } catch (err) {
    return { error: "⚠️ Unable to fetch info at the moment." };
  }
}

// --- BOT COMMANDS ---
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  if (!text) return;

  if (text === "/start") {
    return bot.sendMessage(
      chatId,
      `👋 *Welcome to PhoneInfo Bot!*\nSend me any phone number (with country code).\nExample: \`+919876543210\``,
      { parse_mode: "Markdown" }
    );
  }

  const phoneRegex = /^\+?\d{7,15}$/;
  if (!phoneRegex.test(text)) {
    return bot.sendMessage(
      chatId,
      "📱 Please send a valid phone number (with country code)."
    );
  }

  bot.sendMessage(chatId, "🔍 Fetching info...");

  const info = await getPhoneInfo(text);
  if (info.error) return bot.sendMessage(chatId, info.error);

  const digits = text.replace(/\D/g, "");

  const message = `
📞 *Number:* ${text}
🌍 *Country:* ${info.country}
🏙️ *Location:* ${info.location}
📡 *Carrier:* ${info.carrier}

🔗 *Quick Links:*
- [WhatsApp](https://wa.me/${digits})
- [Telegram](https://t.me/+${digits})
`;

  bot.sendMessage(chatId, message, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "💬 WhatsApp", url: `https://wa.me/${digits}` },
          { text: "🔎 Telegram", url: `https://t.me/+${digits}` },
        ],
      ],
    },
  });
});

// --- START WEBHOOK + SERVER ---
app.listen(3000, async () => {
  console.log("🚀 Server running on port 3000");

  const webhookUrl = `${URL}/webhook/${TOKEN}`;

  try {
    await bot.setWebHook(webhookUrl);
    console.log("✅ Webhook set to:", webhookUrl);
  } catch (error) {
    console.error("❌ Failed to set webhook:", error.message);
  }
});
