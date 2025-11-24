// 🟢 FIX FOR NODE 18
const { File } = require("node:buffer");
global.File = File;

const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const cheerio = require("cheerio");
const express = require("express"); // Needed to keep the server alive

// --- 1. CONFIGURATION ---
const token = "8489059716:AAFvaUZVuPYxEnzlOwdX4E9kBg2hSL3tE8E"; // Your Token
const TARGET_URL = "https://customer.nesco.gov.bd/pre/panel";

// --- 2. DUMMY SERVER (To keep Render happy) ---
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("🤖 Bot is running 24/7...");
});

app.listen(PORT, () => {
  console.log(`Keep-Alive Server running on port ${PORT}`);
});

// --- 3. THE BOT LOGIC ---
const bot = new TelegramBot(token, { polling: true });
console.log("🤖 Telegram Bot Started...");

// Scraper Function
async function getNescoData(custNo) {
  try {
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };

    // A. Visit page to get Token & Cookies
    const initialLoad = await axios.get(TARGET_URL, { headers });
    const cookies = initialLoad.headers["set-cookie"]
      .map((c) => c.split(";")[0])
      .join("; ");
    const $ = cheerio.load(initialLoad.data);
    const csrfToken = $('input[name="_token"]').val();

    // B. Submit the Number
    const params = new URLSearchParams();
    params.append("_token", csrfToken);
    params.append("cust_no", custNo);
    params.append("submit", "Recharge History");

    const response = await axios.post(TARGET_URL, params.toString(), {
      headers: {
        Cookie: cookies,
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: TARGET_URL,
        "User-Agent": headers["User-Agent"],
      },
    });

    // C. Scrape Details
    const $res = cheerio.load(response.data);
    const allDetails = [];

    $res('input[type="text"]').each((i, el) => {
      const val = $res(el).val().trim();
      if (!val) return;
      let label = $res(el)
        .closest('div[class^="col-"]')
        .prev("label")
        .text()
        .trim();
      if (!label)
        label = $res(el).closest(".form-group").find("label").text().trim();
      if (
        !label &&
        allDetails.length > 0 &&
        allDetails[allDetails.length - 1].label.includes("নাম")
      ) {
        label = "Address (Estimated)";
      }
      if (label && label !== "No Label Found")
        allDetails.push({ label, value: val });
    });

    // D. Scrape History
    const historyData = [];
    $res("table tbody tr").each((index, element) => {
      const tds = $res(element).find("td");
      if (tds.length > 5) {
        historyData.push({
          date: $res(tds[13]).text().trim(),
          amount: $res(tds[10]).text().trim(),
          token: $res(tds[2]).text().trim(),
          status: $res(tds[14]).text().trim(),
        });
      }
    });

    return { success: true, details: allDetails, history: historyData };
  } catch (error) {
    console.error("Scraper Error:", error.message);
    return { success: false, error: error.message };
  }
}

// Bot Handlers
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "⚡ **NESCO Bot Online**\nType `/show` for default or send any number.",
    { parse_mode: "Markdown" }
  );
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text ? msg.text.trim() : "";

  if (text.startsWith("/")) {
    if (text === "/show") checkNumber(chatId, "14011709");
    return;
  }

  checkNumber(chatId, text);
});

async function checkNumber(chatId, number) {
  bot.sendChatAction(chatId, "typing");
  const data = await getNescoData(number);

  if (data.success && data.details.length > 0) {
    let infoMsg = `👤 **Customer Details**\n──────────────────\n`;
    data.details.forEach((item) => {
      let icon = "🔹";
      if (item.label.includes("ব্যালেন্স") || item.label.includes("Balance"))
        icon = "💰";
      if (item.label.includes("নাম") || item.label.includes("Name"))
        icon = "👤";
      infoMsg += `${icon} **${item.label}:** \`${item.value}\`\n`;
    });
    await bot.sendMessage(chatId, infoMsg, { parse_mode: "Markdown" });

    let historyMsg = `📜 **Last 5 Recharges**\n──────────────────\n`;
    const recent = data.history.slice(0, 5);
    if (recent.length > 0) {
      recent.forEach((row) => {
        const statusEmoji = row.status.toLowerCase().includes("success")
          ? "✅"
          : "❌";
        historyMsg += `${statusEmoji} **${row.date}**\n💸 Tk. ${row.amount}  |  🎫 \`${row.token}\`\n\n`;
      });
    } else {
      historyMsg += "No history found.";
    }
    await bot.sendMessage(chatId, historyMsg, { parse_mode: "Markdown" });
  } else {
    bot.sendMessage(
      chatId,
      `❌ **Not Found:** Could not fetch data for \`${number}\`.`
    );
  }
}
