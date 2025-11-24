// 🟢 FIX FOR NODE 18 (Must be at the very top to prevent crashes)
const { File } = require("node:buffer");
global.File = File;

const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const app = express();
const cors = require("cors");

app.use(cors());

const TARGET_URL = "https://customer.nesco.gov.bd/pre/panel";

app.get("/get-history", async (req, res) => {
  const custNo = req.query.number;
  console.log(`\n--- 🔍 Full Data Request for: ${custNo} ---`);

  if (!custNo) {
    return res.status(400).json({ error: "Please provide a number" });
  }

  try {
    // --- STEP 1: Connect ---
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };
    const initialLoad = await axios.get(TARGET_URL, { headers });
    const cookies = initialLoad.headers["set-cookie"]
      .map((c) => c.split(";")[0])
      .join("; ");
    const $ = cheerio.load(initialLoad.data);
    const csrfToken = $('input[name="_token"]').val();

    // --- STEP 2: Post Number ---
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

    // --- STEP 3: Scrape EVERYTHING ---
    const $res = cheerio.load(response.data);
    const allDetails = [];

    // Loop through all text inputs
    $res('input[type="text"]').each((i, el) => {
      const val = $res(el).val().trim();
      if (!val) return; // Skip empty boxes

      // Find the label immediately before the input container
      let label = $res(el)
        .closest('div[class^="col-"]')
        .prev("label")
        .text()
        .trim();

      // If that didn't work, try looking inside the same form-group
      if (!label) {
        label = $res(el).closest(".form-group").find("label").text().trim();
      }

      // Logic to fix the missing "Address" label
      if (
        !label &&
        allDetails.length > 0 &&
        allDetails[allDetails.length - 1].label.includes("নাম")
      ) {
        label = "ঠিকানা (Address)";
      }

      // If we found a label (or fixed it), add it to the list
      if (label && label !== "No Label Found") {
        allDetails.push({ label: label, value: val });
      }
    });

    // --- STEP 4: Scrape History Table ---
    const historyData = [];
    $res("table tbody tr").each((index, element) => {
      const tds = $res(element).find("td");
      if (tds.length > 5) {
        historyData.push({
          date: $res(tds[13]).text().trim(),
          amount: $res(tds[10]).text().trim(),
          token: $res(tds[2]).text().trim(),
          medium: $res(tds[12]).text().trim(),
          status: $res(tds[14]).text().trim(),
        });
      }
    });

    const finalResponse = {
      success: true,
      details: allDetails,
      history: historyData,
    };

    // Debug Log
    console.log("✅ Extracted Fields:", allDetails.length);
    console.log(allDetails); // Uncomment if you want to see the list in terminal

    res.json(finalResponse);
  } catch (error) {
    console.error("❌ Server Error:", error.message);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

// 🟢 UPDATED: Use Render's Dynamic Port or fallback to 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend Server running on port ${PORT}`);
});
