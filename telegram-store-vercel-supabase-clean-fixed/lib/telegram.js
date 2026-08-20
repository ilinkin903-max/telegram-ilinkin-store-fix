const { config, requireEnv } = require('./config');

function apiUrl(method) {
  requireEnv(['BOT_TOKEN']);
  return `https://api.telegram.org/bot${config.botToken}/${method}`;
}

async function callTelegram(method, payload = {}) {
  const res = await fetch(apiUrl(method), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) {
    throw new Error(`Telegram ${method} gagal: ${JSON.stringify(json)}`);
  }
  return json.result;
}

async function sendMessage(chatId, text, options = {}) {
  return callTelegram('sendMessage', {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    ...options
  });
}

async function editMessageText(chatId, messageId, text, options = {}) {
  return callTelegram('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    disable_web_page_preview: true,
    ...options
  });
}


async function editMessageCaption(chatId, messageId, caption, options = {}) {
  return callTelegram('editMessageCaption', {
    chat_id: chatId,
    message_id: messageId,
    caption,
    ...options
  });
}

async function answerCallbackQuery(callbackQueryId, options = {}) {
  return callTelegram('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    ...options
  });
}

async function deleteMessage(chatId, messageId) {
  return callTelegram('deleteMessage', {
    chat_id: chatId,
    message_id: messageId
  }).catch(() => null);
}

async function sendPhoto(chatId, buffer, options = {}) {
  const form = new FormData();
  form.append('chat_id', String(chatId));
  form.append('photo', new Blob([buffer], { type: 'image/png' }), 'qris.png');
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      form.append(key, typeof value === 'string' ? value : JSON.stringify(value));
    }
  });
  const res = await fetch(apiUrl('sendPhoto'), { method: 'POST', body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) throw new Error(`Telegram sendPhoto gagal: ${JSON.stringify(json)}`);
  return json.result;
}

async function sendPhotoRef(chatId, photo, options = {}) {
  return callTelegram('sendPhoto', {
    chat_id: chatId,
    photo,
    ...options
  });
}

async function sendSticker(chatId, sticker, options = {}) {
  return callTelegram('sendSticker', {
    chat_id: chatId,
    sticker,
    ...options
  });
}

async function sendPoll(chatId, question, optionsList = [], options = {}) {
  return callTelegram('sendPoll', {
    chat_id: chatId,
    question,
    options: optionsList,
    ...options
  });
}

async function getChatMember(chatId, userId) {
  return callTelegram('getChatMember', {
    chat_id: chatId,
    user_id: userId
  });
}


async function copyMessage(chatId, fromChatId, messageId, options = {}) {
  return callTelegram('copyMessage', {
    chat_id: chatId,
    from_chat_id: fromChatId,
    message_id: messageId,
    ...options
  });
}

async function forwardMessage(chatId, fromChatId, messageId, options = {}) {
  return callTelegram('forwardMessage', {
    chat_id: chatId,
    from_chat_id: fromChatId,
    message_id: messageId,
    ...options
  });
}

async function sendDocument(chatId, filename, content, options = {}) {
  const form = new FormData();
  form.append('chat_id', String(chatId));
  form.append('document', new Blob([String(content)], { type: 'text/plain' }), filename);
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      form.append(key, typeof value === 'string' ? value : JSON.stringify(value));
    }
  });
  const res = await fetch(apiUrl('sendDocument'), { method: 'POST', body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) throw new Error(`Telegram sendDocument gagal: ${JSON.stringify(json)}`);
  return json.result;
}

async function setWebhook(url) {
  return callTelegram('setWebhook', {
    url,
    allowed_updates: ['message', 'callback_query', 'poll', 'poll_answer']
  });
}

module.exports = {
  callTelegram,
  sendMessage,
  editMessageText,
  editMessageCaption,
  answerCallbackQuery,
  deleteMessage,
  sendPhoto,
  sendPhotoRef,
  sendSticker,
  sendPoll,
  getChatMember,
  copyMessage,
  forwardMessage,
  sendDocument,
  setWebhook
};
