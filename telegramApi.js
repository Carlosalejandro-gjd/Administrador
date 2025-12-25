export class TelegramAPI {
  constructor(token = "") {
    this.setToken(token);
  }

  setToken(token) {
    this.token = token?.trim() || "";
  }

  get hasToken() {
    return Boolean(this.token);
  }

  async call(method, payload) {
    if (!this.hasToken) throw new Error("Falta el token del bot");

    const url = `https://api.telegram.org/bot${this.token}/${method}`;
    const options = payload
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      : { method: "GET" };

    const res = await fetch(url, options);
    const data = await res.json();
    if (!data.ok) {
      throw new Error(data.description || "Error en la API de Telegram");
    }
    return data.result;
  }

  getWebhookInfo() {
    return this.call("getWebhookInfo");
  }

  setWebhook(url) {
    return this.call("setWebhook", { url });
  }

  deleteWebhook() {
    return this.call("deleteWebhook", { drop_pending_updates: false });
  }

  getUpdates(offset) {
    const payload = {
      timeout: 0,
      allowed_updates: ["message"],
    };
    if (offset != null) payload.offset = offset;
    return this.call("getUpdates", payload);
  }

  sendMessage(chat_id, text) {
    return this.call("sendMessage", {
      chat_id,
      text,
    });
  }
}