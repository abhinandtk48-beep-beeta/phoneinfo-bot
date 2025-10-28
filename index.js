import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// 📞 Function to get phone info
async function getPhoneInfo(phone) {
  try {
    const response = await axios.get(
      `https://api.apilayer.com/number_verification/validate?number=${phone}`,
      {
        headers: { apikey: process.env.API_KEY },
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
    console.error("API Error:", err.message);
    return { error: "⚠️ Unable to fetch info at the moment." };
  }
}

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  if (!text) return;

  // 🟢 /start command
  if (text === "/start") {
    return bot.sendMessage(
      chatId,
      `
👋 *Welcome to PhoneInfo Bot!*
Send me any phone number (with country code) to get details.

Example: \`+919876543210\`
`,
      { parse_mode: "Markdown" }
    );
  }

  // Check if valid number
  const phoneRegex = /^\+?\d{7,15}$/;
  if (!phoneRegex.test(text)) {
    return bot.sendMessage(
      chatId,
      "📱 Please send a valid phone number (with country code)."
    );
  }

  bot.sendMessage(chatId, "🔍 Fetching info... Please wait...");

  // Get phone info
  const info = await getPhoneInfo(text);
  if (info.error) return bot.sendMessage(chatId, info.error);

  const digits = text.replace(/\D/g, "");

  // 🧾 Format message
  const message = `
📞 *Number:* ${text}
🌍 *Country:* ${info.country}
🏙️ *Location:* ${info.location}
📡 *Carrier:* ${info.carrier}

🔗 *Quick Links:*
- [💬 WhatsApp Chat](https://wa.me/${digits})
- [🔎 Search on Telegram](https://t.me/+${digits})
`;

  // 🧩 Send message with inline buttons
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

console.log("✅ Phone Info Bot is running...");
