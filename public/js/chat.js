// ── Connect to Socket.IO ────────────────────────────────────────────────────
const socket = io({ transports: ["websocket", "polling"] });

// ── State ───────────────────────────────────────────────────────────────────
let myUserId = null;
let myUsername = null;
let customUsername = null;
let typingTimer = null;
let isTyping = false;
let typingUsers = {};
let lastSender = null;
let lastMsgTime = null;

// ── DOM refs ─────────────────────────────────────────────────────────────────
const messagesList  = document.getElementById("messagesList");
const messagesWrap  = document.getElementById("messagesWrap");
const messageInput  = document.getElementById("messageInput");
const sendBtn       = document.getElementById("sendBtn");
const userCountEl   = document.getElementById("userCount");
const headerUserEl  = document.getElementById("headerUserCount");
const typingArea    = document.getElementById("typingArea");
const usernameInput = document.getElementById("usernameInput");
const saveUsernameBtn = document.getElementById("saveUsernameBtn");
const menuToggle    = document.getElementById("menuToggle");
const sidebarOverlay= document.getElementById("sidebarOverlay");
const charCount     = document.getElementById("charCount");
const sidebar       = document.querySelector(".sidebar");

// ── Avatar colors ─────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  ["#3b4db5","#6c8cff"], ["#6c2ea8","#a78bfa"], ["#0e7abd","#38bdf8"],
  ["#0d7a5e","#34d399"], ["#7a3d0d","#fb923c"], ["#7a0d2e","#f87171"],
  ["#4a7a0d","#a3e635"], ["#0d4a7a","#60a5fa"],
];

function avatarStyle(username) {
  let hash = 0;
  for (const c of username) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  const [from, to] = AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  return `background: linear-gradient(135deg, ${from}, ${to});`;
}

function initials(username) {
  return username.slice(0, 2).toUpperCase();
}

// ── Time formatting ────────────────────────────────────────────────────────
function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatDate(ts) {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

// ── Should group with previous message ──────────────────────────────────────
function shouldGroup(username, timestamp) {
  if (!lastSender || lastSender !== username) return false;
  if (!lastMsgTime) return false;
  return new Date(timestamp) - new Date(lastMsgTime) < 5 * 60 * 1000; // 5 min
}

let lastRenderedDate = null;

// ── Render message ──────────────────────────────────────────────────────────
function renderMessage(msg, prepend = false) {
  const { username, message, user_id, timestamp } = msg;
  const isSelf = user_id === myUserId || username === (customUsername || myUsername);

  // Date separator
  const dateLabel = formatDate(timestamp);
  if (!prepend && dateLabel !== lastRenderedDate) {
    const sep = document.createElement("div");
    sep.className = "date-separator";
    sep.textContent = dateLabel;
    messagesList.appendChild(sep);
    lastRenderedDate = dateLabel;
  }

  const grouped = !prepend && shouldGroup(username, timestamp);

  const div = document.createElement("div");
  div.className = `msg${grouped ? " consecutive" : ""}${isSelf ? " own-msg" : ""}`;
  div.dataset.sender = username;
  div.dataset.ts = timestamp;

  div.innerHTML = `
    <div class="msg-avatar" style="${avatarStyle(username)}">${initials(username)}</div>
    <div class="msg-body">
      <div class="msg-meta">
        <span class="msg-username${isSelf ? " is-self" : ""}">${escapeHtml(username)}</span>
        <span class="msg-time">${formatTime(timestamp)}</span>
      </div>
      <div class="msg-text">${escapeHtml(message)}</div>
    </div>
  `;

  if (prepend) {
    const firstChild = messagesList.children[1]; // after welcome
    messagesList.insertBefore(div, firstChild || null);
  } else {
    messagesList.appendChild(div);
    lastSender = username;
    lastMsgTime = timestamp;
  }

  return div;
}

// ── Render system message ────────────────────────────────────────────────────
function renderSystem(text) {
  lastSender = null;
  const div = document.createElement("div");
  div.className = "system-msg";
  div.textContent = text;
  messagesList.appendChild(div);
  scrollToBottom();
}

// ── Scroll ──────────────────────────────────────────────────────────────────
function scrollToBottom(smooth = true) {
  messagesWrap.scrollTo({ top: messagesWrap.scrollHeight, behavior: smooth ? "smooth" : "instant" });
}
function isNearBottom() {
  return messagesWrap.scrollHeight - messagesWrap.scrollTop - messagesWrap.clientHeight < 120;
}

// ── Escape HTML ──────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ── Remove welcome banner ────────────────────────────────────────────────────
function removeWelcomeBanner() {
  const banner = messagesList.querySelector(".welcome-banner");
  if (banner) banner.remove();
}

// ── Socket events ────────────────────────────────────────────────────────────

socket.on("assign_username", ({ username, userId }) => {
  myUsername = username;
  myUserId   = userId;
  usernameInput.value = username;
  usernameInput.placeholder = username;
});

socket.on("message_history", (messages) => {
  if (!messages.length) return;
  removeWelcomeBanner();
  // Render oldest first
  messages.forEach(m => renderMessage(m));
  scrollToBottom(false);
});

socket.on("new_message", (msg) => {
  removeWelcomeBanner();
  const atBottom = isNearBottom();
  renderMessage(msg);
  if (atBottom) scrollToBottom();
});

socket.on("system_message", ({ text }) => {
  renderSystem(text);
  lastSender = null;
});

socket.on("user_count", ({ count }) => {
  userCountEl.textContent = count;
  headerUserEl.textContent = count;
});

socket.on("typing_update", ({ username, isTyping }) => {
  if (username === (customUsername || myUsername)) return;
  if (isTyping) {
    typingUsers[username] = true;
  } else {
    delete typingUsers[username];
  }
  renderTyping();
});

function renderTyping() {
  const names = Object.keys(typingUsers);
  if (!names.length) { typingArea.textContent = ""; return; }
  const list = names.slice(0, 3).join(", ");
  const suffix = names.length === 1 ? "is typing…" : "are typing…";
  typingArea.textContent = `${list} ${suffix}`;
}

// ── Send message ─────────────────────────────────────────────────────────────
function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  socket.emit("send_message", {
    message: text,
    customUsername: customUsername,
  });

  messageInput.value = "";
  messageInput.style.height = "auto";
  charCount.textContent = "0 / 1000";
  charCount.className = "char-count";

  stopTyping();
}

function stopTyping() {
  if (isTyping) {
    isTyping = false;
    socket.emit("typing", { isTyping: false, customUsername });
  }
  clearTimeout(typingTimer);
}

// ── Input events ─────────────────────────────────────────────────────────────
messageInput.addEventListener("input", () => {
  // Auto-resize
  messageInput.style.height = "auto";
  messageInput.style.height = Math.min(messageInput.scrollHeight, 140) + "px";

  // Char count
  const len = messageInput.value.length;
  charCount.textContent = `${len} / 1000`;
  charCount.className = "char-count" + (len >= 1000 ? " at-limit" : len >= 850 ? " near-limit" : "");

  // Typing indicator
  if (!isTyping && messageInput.value.trim()) {
    isTyping = true;
    socket.emit("typing", { isTyping: true, customUsername });
  }
  clearTimeout(typingTimer);
  typingTimer = setTimeout(stopTyping, 2500);
});

messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener("click", sendMessage);

// ── Username save ─────────────────────────────────────────────────────────────
saveUsernameBtn.addEventListener("click", () => {
  const val = usernameInput.value.trim();
  if (!val || val === (customUsername || myUsername)) return;
  customUsername = val.slice(0, 24);
  usernameInput.value = customUsername;

  // Visual confirmation
  saveUsernameBtn.textContent = "✓";
  saveUsernameBtn.style.color = "var(--green)";
  setTimeout(() => { saveUsernameBtn.textContent = "✓"; }, 1000);
});

usernameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") saveUsernameBtn.click();
});

// ── Mobile sidebar ────────────────────────────────────────────────────────────
menuToggle.addEventListener("click", () => {
  sidebar.classList.toggle("open");
  sidebarOverlay.classList.toggle("visible");
});
sidebarOverlay.addEventListener("click", () => {
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("visible");
});

// ── Connection status ─────────────────────────────────────────────────────────
socket.on("connect", () => console.log("🟢 Connected"));
socket.on("disconnect", () => console.log("🔴 Disconnected"));
socket.on("connect_error", (err) => console.error("❌ Connection error:", err.message));
