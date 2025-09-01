require("dotenv").config();
console.log("Mistral key present?", !!process.env.MISTRAL_API_KEY);

const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const LRU = require("lru-cache");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const cors = require("cors");

const app = express();
app.use(express.json({ limit: "50kb" }));
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "*" }));

const limiter = rateLimit({ windowMs: 1000, max: 10 });
app.use("/api/", limiter);

// server.js
const { LRUCache } = require("lru-cache");

const cache = new LRUCache({
  max: 5000,
  ttl: 1000 * 60 * 30, // 30 minutes
});

const MISTRAL_API =
  process.env.MISTRAL_API_URL || "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_KEY = process.env.MISTRAL_API_KEY;
const MODEL_ID = process.env.MISTRAL_MODEL || "mistral-small";

if (!MISTRAL_KEY) {
  console.error("MISTRAL_API_KEY not set in environment.");
  process.exit(1);
}

// Map of 9 cells -> instruction strings (tweak as needed)
const CELL_PROMPTS = [
  "Rewrite the text to be very formal and polished, using professional vocabulary. Keep original meaning.",
  "Rewrite the text to be professional and clear, slightly less formal.",
  "Rewrite the text to be professional but conversational and slightly casual.",
  "Rewrite the text to be polite and friendly, moderately formal.",
  "Rewrite the text to be warm and conversational, accessible.",
  "Rewrite the text to be friendly and casual; use simple phrases.",
  "Rewrite the text to be quirky but polite — playful yet respectful.",
  "Rewrite the text to be lighthearted and informal.",
  "Rewrite the text to be fun, playful, and casual.",
];

function makeCacheKey(text, cellId) {
  return crypto
    .createHash("sha256")
    .update(text + "|" + cellId)
    .digest("hex");
}

app.post("/api/tone", async (req, res) => {
  try {
    const { text, cellId } = req.body;
    if (typeof text !== "string" || typeof cellId !== "number") {
      return res.status(400).json({ ok: false, error: "invalid_payload" });
    }
    if (text.length === 0)
      return res.status(400).json({ ok: false, error: "empty_text" });
    if (text.length > 20000)
      return res.status(413).json({ ok: false, error: "text_too_long" });

    const cacheKey = makeCacheKey(text, cellId);
    const cached = cache.get(cacheKey);
    if (cached) return res.json({ ok: true, text: cached, cached: true });
    const instruction = CELL_PROMPTS[cellId] || CELL_PROMPTS[4];
    const messages = [
      {
        role: "system",
        content:
          "You are a text rewrite assistant that rewrites user text according to the requested tone.",
      },
      { role: "user", content: `${instruction}\n\nText:\n${text}` },
    ];

    const body = {
      model: MODEL_ID,
      messages,
      max_tokens: 2048,
      temperature: 0.6,
    };
    const apiResp = await axios.post(MISTRAL_API, body, {
      headers: {
        Authorization: `Bearer ${MISTRAL_KEY}`,
        "Content-Type": "application/json",
      },
    });
    timeout: 20000;
    let rewritten = "";
    const d = apiResp.data || {};
    if (d.choices && d.choices.length) {
      const msg = d.choices[0].message || d.choices[0];
      rewritten =
        (msg.content &&
          (typeof msg.content === "string"
            ? msg.content
            : msg.content?.text || "")) ||
        msg.text ||
        "";
    } else if (d.output && d.output.length) {
      rewritten = d.output[0]?.content?.[0]?.text || d.output[0]?.content || "";
    } else if (typeof d === "string") {
      rewritten = d;
    }
    if (!rewritten) rewritten = JSON.stringify(d).slice(0, 10000);
    cache.set(cacheKey, rewritten);
    return res.json({ ok: true, text: rewritten });
  } catch (err) {
    console.error("Error /api/tone", err?.response?.data || err.message);
    return res
      .status(502)
      .json({
        ok: false,
        error: "upstream_error",
        detail: err?.response?.data || err.message,
      });
  }
});
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
