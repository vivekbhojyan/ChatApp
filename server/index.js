require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const adjectives = [
  "ABES","ABES",
];
const nouns = [
  "Panda", "Comet", "Pixel", "Storm", "Ember", "Frost", "Globe", "Haven",
  "Iris", "Jewel", "Karma", "Lemon", "Maple", "Nova", "Ocean", "Prism",
  "Quest", "Raven", "Solar", "Tiger", "Unity", "Vapor", "Wave", "Xenon",
  "Yacht", "Zephyr", "Blaze", "Cedar", "Drake", "Eagle",
];

function randomUsername() {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 99) + 1;
  return `${adj}${noun}${num}`;
}

async function fetchRecentMessages(limit = 50) {
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).reverse();
  } catch (err) {
    console.error("❌ fetchRecentMessages error:", err.message);
    return [];
  }
}

async function saveMessage({ username, message, user_id }) {
  try {
    const { data, error } = await supabase
      .from("messages")
      .insert([{ username, message, user_id, timestamp: new Date().toISOString() }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("❌ saveMessage error:", err.message);
    return null;
  }
}

app.get("/api/messages", async (req, res) => {
  const messages = await fetchRecentMessages();
  res.json({ messages });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

let onlineUsers = {};

io.on("connection", async (socket) => {
  const username = randomUsername();
  const userId = socket.id;
  onlineUsers[userId] = username;

  console.log(`✅ ${username} connected (${userId})`);

  socket.emit("assign_username", { username, userId });

  io.emit("user_count", { count: Object.keys(onlineUsers).length });

  const history = await fetchRecentMessages(50);
  socket.emit("message_history", history);

  socket.broadcast.emit("system_message", {
    text: `${username} joined the chat`,
    timestamp: new Date().toISOString(),
  });

  socket.on("send_message", async ({ message, customUsername }) => {
    const finalUsername = customUsername?.trim() || username;
    if (!message?.trim()) return;

    const trimmed = message.trim().slice(0, 1000); // cap length

    const saved = await saveMessage({
      username: finalUsername,
      message: trimmed,
      user_id: userId,
    });

    const payload = saved || {
      id: Date.now(),
      username: finalUsername,
      message: trimmed,
      user_id: userId,
      timestamp: new Date().toISOString(),
    };

    io.emit("new_message", payload);
  });

  socket.on("typing", ({ isTyping, customUsername }) => {
    const name = customUsername?.trim() || username;
    socket.broadcast.emit("typing_update", { username: name, isTyping });
  });

  socket.on("disconnect", () => {
    console.log(`❌ ${username} disconnected`);
    delete onlineUsers[userId];
    io.emit("user_count", { count: Object.keys(onlineUsers).length });
    io.emit("system_message", {
      text: `${username} left the chat`,
      timestamp: new Date().toISOString(),
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Chat server running on http://localhost:${PORT}`);
  console.log(`📦 Supabase URL: ${process.env.SUPABASE_URL ? "✅ Set" : "❌ Missing"}`);
});
