// === Lipstick Red Chatbot frontend wiring to Cloudflare Worker ===

const WORKER_URL = "https://soft-shadow-8d36.redavi19.workers.dev/";

const SYSTEM_PROMPT = `
You are "Lipstick Red Beauty Advisor", an AI assistant that ONLY answers questions about:
- Lipstick Red products (makeup, skincare, haircare, hair color, fragrances)
- Beauty routines and tips that use Lipstick Red products
If asked about anything else, politely refuse and redirect to Lipstick Red topics.
`;

let conversationHistory = [{ role: "system", content: SYSTEM_PROMPT }];

const chatWindow = document.getElementById("chatWindow");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

function addMessage(role, text) {
  const row = document.createElement("div");
  row.classList.add("message-row", role === "user" ? "user" : "assistant");

  const bubble = document.createElement("div");
  bubble.classList.add("message-bubble");
  bubble.textContent = text;

  row.appendChild(bubble);
  chatWindow.appendChild(row);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Initial assistant greeting
addMessage(
  "assistant",
  "Bonjour! I’m your Lipstick Red Beauty Advisor. Ask me about Lipstick Red makeup, skincare, haircare, or fragrances and I’ll help you find products and routines that fit you."
);

async function handleSend() {
  const text = userInput.value.trim();
  if (!text) return;

  // Show user message
  addMessage("user", text);
  conversationHistory.push({ role: "user", content: text });

  // Disable input while waiting
  userInput.value = "";
  userInput.disabled = true;
  sendBtn.disabled = true;
  const originalBtnText = sendBtn.textContent;
  sendBtn.textContent = "Thinking...";

  try {
    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: conversationHistory }),
    });

    if (!res.ok) throw new Error(`Network error: ${res.status}`);

    const data = await res.json();

    // Cloudflare worker forwards OpenAI response, so parse choices[*].message.content
    let reply = null;
    if (
      data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) {
      reply = data.choices[0].message.content;
    } else if (data && data.reply) {
      // fallback if worker returns a simplified shape
      reply = data.reply;
    } else {
      reply = "Sorry, I couldn't get a response right now.";
    }

    addMessage("assistant", reply);
    conversationHistory.push({ role: "assistant", content: reply });
  } catch (err) {
    console.error(err);
    addMessage("assistant", "⚠️ Something went wrong. Please try again.");
  } finally {
    userInput.disabled = false;
    sendBtn.disabled = false;
    sendBtn.textContent = originalBtnText;
    userInput.focus();
  }
}

// Form submit + Enter key handling
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  handleSend();
});

userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});
