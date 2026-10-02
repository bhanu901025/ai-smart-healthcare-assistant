/**
 * AI Healthcare Assistant Chatbot Module
 * Handles triage questions, medical guidance queries, and automated bot responses.
 */

function toggleChatModal() {
  const widget = document.getElementById('chat-widget');
  widget.classList.toggle('open');
  if (widget.classList.contains('open')) {
    document.getElementById('chat-input')?.focus();
  }
}

async function handleChatSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('chat-input');
  const text = (input?.value || '').trim();
  if (!text) return;

  // Append User Message
  appendChatMessage(text, 'user');
  input.value = '';

  // Append temporary typing indicator
  const typingId = appendTypingIndicator();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });

    const data = await res.json();
    removeTypingIndicator(typingId);

    if (data.success && data.reply) {
      appendChatMessage(data.reply, 'bot', data.timestamp);
    } else {
      appendChatMessage("I am having trouble processing your query. Please select your symptoms in our Disease Predictor.", 'bot');
    }
  } catch (err) {
    removeTypingIndicator(typingId);
    appendChatMessage("Network error connecting to medical triage assistant.", 'bot');
  }
}

function sendQuickChat(query) {
  const input = document.getElementById('chat-input');
  if (input) {
    input.value = query;
    const widget = document.getElementById('chat-widget');
    if (!widget.classList.contains('open')) {
      toggleChatModal();
    }
    const form = document.querySelector('.chat-input-bar');
    if (form) {
      form.dispatchEvent(new Event('submit', { cancelable: true }));
    }
  }
}

function appendChatMessage(text, sender, time = 'Just now') {
  const container = document.getElementById('chat-messages');
  const msgEl = document.createElement('div');
  msgEl.className = `chat-msg ${sender}`;

  // Simple Markdown formatting for bold and lists
  let formattedText = escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n•/g, '<br>•')
    .replace(/\n/g, '<br>');

  msgEl.innerHTML = `
    <div class="msg-bubble">${formattedText}</div>
    <div class="msg-time">${time}</div>
  `;

  container.appendChild(msgEl);
  container.scrollTop = container.scrollHeight;
}

function appendTypingIndicator() {
  const container = document.getElementById('chat-messages');
  const id = `typing-${Date.now()}`;
  const el = document.createElement('div');
  el.id = id;
  el.className = 'chat-msg bot';
  el.innerHTML = `
    <div class="msg-bubble" style="color: var(--text-muted);">
      <i class="fa-solid fa-ellipsis fa-fade"></i> AI Clinical Assistant is analyzing...
    </div>
  `;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeTypingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}
