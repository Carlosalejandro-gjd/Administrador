import { TelegramAPI } from "./telegramApi.js";

const els = {
  botToken: document.getElementById("botToken"),
  saveTokenBtn: document.getElementById("saveTokenBtn"),
  webhookUrl: document.getElementById("webhookUrl"),
  setWebhookBtn: document.getElementById("setWebhookBtn"),
  getWebhookInfoBtn: document.getElementById("getWebhookInfoBtn"),
  deleteWebhookBtn: document.getElementById("deleteWebhookBtn"),
  webhookStatus: document.getElementById("webhookStatus"),
  messagesList: document.getElementById("messagesList"),
  pollIndicator: document.getElementById("pollIndicator"),
  replyChatId: document.getElementById("replyChatId"),
  replyText: document.getElementById("replyText"),
  sendReplyBtn: document.getElementById("sendReplyBtn"),
  replyStatus: document.getElementById("replyStatus"),
};

const api = new TelegramAPI();
let lastUpdateId = null;
let pollingTimer = null;

function init() {
  const savedToken = localStorage.getItem("tg_bot_token") || "";
  if (savedToken) {
    els.botToken.value = savedToken;
    api.setToken(savedToken);
    startPolling();
  }

  els.saveTokenBtn.addEventListener("click", onSaveToken);
  els.setWebhookBtn.addEventListener("click", onSetWebhook);
  els.getWebhookInfoBtn.addEventListener("click", onGetWebhookInfo);
  els.deleteWebhookBtn.addEventListener("click", onDeleteWebhook);
  els.sendReplyBtn.addEventListener("click", onSendReply);
}

function onSaveToken() {
  const token = els.botToken.value.trim();
  if (!token) return;
  api.setToken(token);
  localStorage.setItem("tg_bot_token", token);
  els.replyStatus.textContent = "Token guardado";
  startPolling();
  setTimeout(() => (els.replyStatus.textContent = ""), 1500);
}

async function onSetWebhook() {
  clearStatus();
  const url = els.webhookUrl.value.trim();
  if (!url) {
    els.webhookStatus.textContent = "Introduce la URL del webhook";
    return;
  }
  try {
    els.webhookStatus.textContent = "Configurando webhook...";
    const result = await api.setWebhook(url);
    els.webhookStatus.textContent = result
      ? "Webhook configurado correctamente"
      : "No se pudo configurar el webhook";
  } catch (e) {
    els.webhookStatus.textContent = "Error: " + e.message;
  }
}

async function onGetWebhookInfo() {
  clearStatus();
  try {
    els.webhookStatus.textContent = "Consultando estado...";
    const info = await api.getWebhookInfo();
    if (!info.url) {
      els.webhookStatus.textContent = "Webhook desactivado";
      return;
    }
    const details = [];
    details.push(`URL: ${info.url}`);
    if (info.last_error_message) {
      details.push(`Error: ${info.last_error_message}`);
    }
    if (info.pending_update_count != null) {
      details.push(`Pendientes: ${info.pending_update_count}`);
    }
    els.webhookStatus.textContent = details.join(" · ");
  } catch (e) {
    els.webhookStatus.textContent = "Error: " + e.message;
  }
}

async function onDeleteWebhook() {
  clearStatus();
  try {
    els.webhookStatus.textContent = "Quitando webhook...";
    const result = await api.deleteWebhook();
    els.webhookStatus.textContent = result
      ? "Webhook eliminado"
      : "No se pudo eliminar el webhook";
  } catch (e) {
    els.webhookStatus.textContent = "Error: " + e.message;
  }
}

async function onSendReply() {
  clearStatus();
  const chatId = els.replyChatId.value.trim();
  const text = els.replyText.value.trim();
  if (!chatId || !text) {
    els.replyStatus.textContent = "Chat ID y texto son obligatorios";
    return;
  }
  try {
    els.replyStatus.textContent = "Enviando...";
    await api.sendMessage(chatId, text);
    els.replyStatus.textContent = "Mensaje enviado";
    els.replyText.value = "";
    setTimeout(() => (els.replyStatus.textContent = ""), 1500);
  } catch (e) {
    els.replyStatus.textContent = "Error: " + e.message;
  }
}

function clearStatus() {
  els.webhookStatus.textContent = "";
  els.replyStatus.textContent = "";
}

function startPolling() {
  if (!api.hasToken) return;
  if (pollingTimer) clearInterval(pollingTimer);
  pollingTimer = setInterval(pollOnce, 3500);
  els.pollIndicator.classList.add("active");
  pollOnce();
}

async function pollOnce() {
  if (!api.hasToken) return;
  try {
    const updates = await api.getUpdates(
      lastUpdateId != null ? lastUpdateId + 1 : undefined
    );
    if (Array.isArray(updates) && updates.length) {
      for (const u of updates) {
        if (u.update_id != null) lastUpdateId = u.update_id;
        if (u.message) renderMessage(u.message);
      }
    }
  } catch (_) {
    // Silencioso para no saturar la UI en móviles
  }
}

function renderMessage(msg) {
  const chatId = msg.chat?.id;
  const from = msg.from || {};
  const name =
    [from.first_name, from.last_name].filter(Boolean).join(" ") ||
    from.username ||
    "Desconocido";
  const text =
    msg.text ||
    msg.caption ||
    (msg.sticker ? "Sticker recibido" : "Mensaje recibido");
  const date = new Date((msg.date || 0) * 1000);
  const time = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const card = document.createElement("article");
  card.className = "message-card incoming";

  card.innerHTML = `
    <div class="message-card-header">
      <div class="message-from">${escapeHtml(name)}</div>
      <div class="message-meta">${time}</div>
    </div>
    <div class="message-text">${escapeHtml(text)}</div>
    <div class="message-actions">
      <div class="message-chat-id">ID: ${chatId}</div>
      <button class="btn">Responder</button>
    </div>
  `;

  const replyBtn = card.querySelector("button");
  replyBtn.addEventListener("click", () => {
    els.replyChatId.value = chatId;
    els.replyText.focus();
  });

  els.messagesList.prepend(card);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

init();