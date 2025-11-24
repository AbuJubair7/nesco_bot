# ⚡ NESCO Prepaid Meter Bot

A Telegram Bot that scrapes and displays prepaid meter information and recharge history for NESCO (Northern Electricity Supply Company) consumers in Bangladesh.

## 🚀 Features

- **Automated Scraping:** Bypasses CSRF tokens and cookies to fetch live data.
- **Telegram Integration:** - Send `/show` to check your default meter.
  - Send any consumer number (e.g., `14011709`) to check specific details.
- **Detailed Info:** Retrieves Name, Balance, Address, and Meter Status.
- **Recharge History:** Shows the last 5 recharge transactions with Token numbers.
- **24/7 Hosting Ready:** Includes a dummy Express server to keep the bot alive on free platforms like Render.

## 🛠️ Prerequisites

- Node.js (v18 or higher)
- NPM (Node Package Manager)

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone [https://github.com/YOUR_USERNAME/nesco-bot.git](https://github.com/YOUR_USERNAME/nesco-bot.git)
   cd nesco-bot
   ```
