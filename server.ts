import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const appUrl = process.env.APP_URL || "http://localhost:3000";

let bot: TelegramBot | null = null;
const botCache: Record<string, TelegramBot> = {};

function getBot(customToken?: string): TelegramBot | null {
  const effectiveToken = customToken || token;
  if (!effectiveToken) return null;
  
  if (botCache[effectiveToken]) return botCache[effectiveToken];
  
  const newBot = new TelegramBot(effectiveToken);
  botCache[effectiveToken] = newBot;
  return newBot;
}

if (token) {
  bot = getBot();
  if (bot) {
    // Webhook setup
    const webhookUrl = `${appUrl}/api/telegram-webhook`;
    bot.setWebHook(webhookUrl).then(() => {
      console.log(`Telegram Webhook set to: ${webhookUrl}`);
    }).catch(err => {
      console.error("Error setting Telegram webhook:", err.message);
    });
  }
} else {
  console.warn("TELEGRAM_BOT_TOKEN not found in environment variables. Default Telegram bot disabled.");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Telegram Webhook Endpoint
  app.post("/api/telegram-webhook", (req, res) => {
    if (bot) {
      bot.processUpdate(req.body);
    }
    res.sendStatus(200);
  });

  // Handle Telegram Bot Messages
  if (bot) {
    bot.on("message", (msg) => {
      const chatId = msg.chat.id;
      const text = msg.text;

      if (text === "/start") {
        bot?.sendMessage(chatId, `¡Hola! Soy tu bot de GourmetPOS. Tu Chat ID es: ${chatId}\n\nUsa este ID en la configuración de la app para recibir notificaciones de ventas.`);
      }
    });
  }

  // API to send notifications
  app.post("/api/send-telegram", async (req, res) => {
    const { chatId, message, botToken } = req.body;
    
    const targetBot = getBot(botToken);
    
    if (!targetBot) {
      return res.status(500).json({ error: "Bot no configurado. Por favor ingresa el API Token en la configuración o contacta al administrador." });
    }

    if (!chatId || !message) {
      return res.status(400).json({ error: "Faltan parámetros: chatId o message" });
    }

    try {
      await targetBot.sendMessage(chatId, message);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error sending Telegram message:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // API Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", telegramEnabled: !!bot });
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
