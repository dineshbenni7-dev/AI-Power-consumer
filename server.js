require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Groq = require("groq-sdk");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MODEL = process.env.MODEL || "openai/gpt-oss-safeguard-20b";

// System prompt for the electricity awareness agent
const SYSTEM_PROMPT = `You are an expert Electricity Consumption Awareness Agent named "WattWise". 
Your mission is to help users understand, monitor, and reduce their electricity consumption to save money and help the environment.

You are knowledgeable about:
1. **Appliance energy usage** - watts, kilowatts, and how to calculate consumption
2. **Bill estimation** - how to estimate monthly electricity costs based on usage patterns
3. **Energy-saving tips** - practical advice for reducing consumption at home and office
4. **Renewable energy** - solar, wind, and other green alternatives
5. **Carbon footprint** - how electricity consumption impacts the environment
6. **Smart home solutions** - smart meters, IoT devices, and automation for efficiency
7. **Peak hours** - understanding time-of-use pricing and when to use high-energy appliances
8. **Energy audits** - how to identify energy waste in homes and businesses
9. **Government incentives** - rebates, tax credits for energy-efficient upgrades
10. **Global electricity statistics** - consumption patterns, averages, and trends

When users share their appliance usage or ask for calculations:
- Always provide specific kWh calculations when possible
- Estimate monthly costs using average electricity rate of $0.13/kWh (but note rates vary)
- Give actionable, prioritized recommendations
- Use clear formatting with bullet points and sections
- Be encouraging and positive about small changes

Always respond in a helpful, clear, and encouraging manner. Use emojis sparingly to make responses friendly (⚡💡🌱).`;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Conversation history store (in-memory per session)
const sessions = {};

// Chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || !sessionId) {
      return res.status(400).json({ error: "message and sessionId are required" });
    }

    // Initialize session if new
    if (!sessions[sessionId]) {
      sessions[sessionId] = [];
    }

    // Add user message to history
    sessions[sessionId].push({ role: "user", content: message });

    // Keep last 20 messages to manage context
    if (sessions[sessionId].length > 20) {
      sessions[sessionId] = sessions[sessionId].slice(-20);
    }

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...sessions[sessionId],
      ],
      temperature: 0.7,
      max_tokens: 1024,
      stream: false,
    });

    const assistantMessage = completion.choices[0].message.content;

    // Add assistant response to history
    sessions[sessionId].push({ role: "assistant", content: assistantMessage });

    res.json({
      reply: assistantMessage,
      sessionId,
      usage: completion.usage,
    });
  } catch (error) {
    console.error("Groq API Error:", error?.message || error);
    const statusCode = error?.status || 500;
    res.status(statusCode).json({
      error: error?.message || "An error occurred while processing your request.",
    });
  }
});

// Quick-tips endpoint
app.get("/api/tips", async (req, res) => {
  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content:
            "Give me 5 quick actionable electricity saving tips for today. Format as a JSON array with fields: id, tip, savings, category. Categories: heating/cooling, lighting, appliances, standby, habits. savings should be a short string like 'saves ~10%'. Return ONLY valid JSON.",
        },
      ],
      temperature: 0.5,
      max_tokens: 512,
    });

    const raw = completion.choices[0].message.content;
    // Extract JSON from response
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const tips = JSON.parse(jsonMatch[0]);
      return res.json({ tips });
    }
    res.json({ tips: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Calculate endpoint
app.post("/api/calculate", (req, res) => {
  const { appliances } = req.body;
  if (!Array.isArray(appliances)) {
    return res.status(400).json({ error: "appliances must be an array" });
  }

  const RATE = 0.13; // $/kWh
  let totalMonthlyKWh = 0;
  const results = appliances.map((a) => {
    const hoursPerDay = parseFloat(a.hoursPerDay) || 0;
    const watts = parseFloat(a.watts) || 0;
    const dailyKWh = (watts * hoursPerDay) / 1000;
    const monthlyKWh = dailyKWh * 30;
    const monthlyCost = monthlyKWh * RATE;
    totalMonthlyKWh += monthlyKWh;
    return {
      name: a.name,
      watts,
      hoursPerDay,
      dailyKWh: dailyKWh.toFixed(3),
      monthlyKWh: monthlyKWh.toFixed(2),
      monthlyCost: monthlyCost.toFixed(2),
    };
  });

  const totalMonthlyCost = totalMonthlyKWh * RATE;
  const co2PerKWh = 0.386; // kg CO2 per kWh (US avg)

  res.json({
    appliances: results,
    totals: {
      monthlyKWh: totalMonthlyKWh.toFixed(2),
      monthlyCost: totalMonthlyCost.toFixed(2),
      yearlyCost: (totalMonthlyCost * 12).toFixed(2),
      co2Monthly: (totalMonthlyKWh * co2PerKWh).toFixed(2),
    },
  });
});

// Clear session
app.delete("/api/session/:sessionId", (req, res) => {
  delete sessions[req.params.sessionId];
  res.json({ ok: true });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`⚡ WattWise Electricity Agent running at http://localhost:${PORT}`);
});
