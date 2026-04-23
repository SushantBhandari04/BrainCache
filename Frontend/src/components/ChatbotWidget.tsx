import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { BACKEND_URL } from "../config";

// ─── API Config ──────────────────────────────────────────────────────────────
// Calls our own backend proxy — no browser CORS issue, API key stays server-side
const CHATBOT_PROXY_URL = `${BACKEND_URL}/api/v1/chatbot`;

// ─── Types ───────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isError?: boolean;
}

// ─── Priority helper: extract spaceId from URL ────────────────────────────────
function useSpaceContext() {
  const location = useLocation();

  return useCallback(() => {
    const params = new URLSearchParams(location.search);
    const spaceId = params.get("spaceId");
    return spaceId || null;
  }, [location.search]);
}

// ─── Determine which pages show the chatbot ───────────────────────────────────
const CHATBOT_PATHS = ["/user/dashboard", "/user/spaces", "/share/"];

function useShouldShowChatbot() {
  const location = useLocation();
  return CHATBOT_PATHS.some((p) => location.pathname.startsWith(p));
}

// ─── Individual message bubble ───────────────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div
      className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"} items-end`}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="w-7 h-7 rounded-full flex-shrink-0 bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </div>
      )}

      {/* Bubble */}
      <div
        className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${isUser
            ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-br-sm"
            : msg.isError
              ? "bg-red-50 text-red-700 border border-red-200 rounded-bl-sm"
              : "bg-white text-gray-800 border border-gray-100 rounded-bl-sm"
          }`}
      >
        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
        <p
          className={`text-[10px] mt-1 ${isUser ? "text-violet-200" : "text-gray-400"
            }`}
        >
          {msg.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex gap-2 items-end">
      <div className="w-7 h-7 rounded-full flex-shrink-0 bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
        <svg
          className="w-4 h-4 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      </div>
      <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-1.5">
        <span
          className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}

// ─── Main Widget ──────────────────────────────────────────────────────────────
export function ChatbotWidget() {
  const shouldShow = useShouldShowChatbot();
  const getSpaceId = useSpaceContext();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm your BrainCache AI assistant 🧠\n\nAsk me anything about your saved content. When you're inside a Space, I'll focus my answers to that context.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [contextLabel, setContextLabel] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Update context label based on current space
  useEffect(() => {
    const spaceId = getSpaceId();
    if (spaceId) {
      setContextLabel("Focused on current Space");
    } else if (location.pathname.startsWith("/share/")) {
      setContextLabel("Shared content view");
    } else {
      setContextLabel(null);
    }
  }, [location, getSpaceId]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const spaceId = getSpaceId();
      const userId = localStorage.getItem("userId") || null;

      const body: Record<string, unknown> = { query: text };
      if (userId) body.userId = userId;
      // Priority: pass spaceId when user is inside a space — scopes the bot's knowledge
      if (spaceId) body.spaceId = spaceId;

      const response = await fetch(CHATBOT_PROXY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const answer =
        data.answer ||
        data.response ||
        data.message ||
        "Sorry, I couldn't process your question.";

      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        content: answer,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error("Chatbot error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content:
            "Sorry, I'm having trouble connecting to the brain right now. Please try again in a moment.",
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function clearChat() {
    setMessages([
      {
        id: "welcome-reset",
        role: "assistant",
        content:
          "Chat cleared! Ask me anything about your BrainCache content 🧠",
        timestamp: new Date(),
      },
    ]);
  }

  if (!shouldShow) return null;

  return (
    <>
      {/* ── Floating Chat Panel ─────────────────────────────────── */}
      <div
        className={`fixed bottom-20 right-2 sm:bottom-24 sm:right-5 z-50 w-[calc(100vw-1rem)] sm:w-[380px] max-w-[calc(100vw-1rem)] transition-all duration-300 ease-in-out origin-bottom-right ${isOpen
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none"
          }`}
        aria-hidden={!isOpen}
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200/80 flex flex-col overflow-hidden"
          style={{ height: "min(70vh, 560px)" }}>

          {/* Header */}
          <div className="flex-shrink-0 px-4 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-4.5 h-4.5 text-white"
                  style={{ width: 18, height: 18 }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm leading-tight">BrainCache AI</p>
                {contextLabel ? (
                  <p className="text-violet-200 text-[10px] truncate flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block flex-shrink-0" />
                    {contextLabel}
                  </p>
                ) : (
                  <p className="text-violet-200 text-[10px]">Global knowledge</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={clearChat}
                title="Clear chat"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Context pill */}
          {contextLabel && (
            <div className="flex-shrink-0 px-4 py-1.5 bg-violet-50 border-b border-violet-100 flex items-center gap-1.5">
              <svg className="w-3 h-3 text-violet-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[10.5px] text-violet-600 font-medium">
                Answers prioritized for your current Space
              </p>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-3 bg-gray-50/60 scroll-smooth">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            {isLoading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 px-3 py-3 bg-white border-t border-gray-100">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  // Auto-resize up to 3 rows
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 80) + "px";
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your content…"
                rows={1}
                disabled={isLoading}
                className="flex-1 resize-none rounded-xl border-2 border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all disabled:opacity-60 leading-snug"
                style={{ minHeight: 40, maxHeight: 80 }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-md hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                aria-label="Send message"
              >
                <svg className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5 text-center">
              Shift+Enter for new line · Enter to send
            </p>
          </div>
        </div>
      </div>

      {/* ── FAB Toggle Button ────────────────────────────────────── */}
      <button
        id="chatbot-fab"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? "Close AI Assistant" : "Open AI Assistant"}
        className={`fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-50 w-14 h-14 rounded-full shadow-xl ring-1 ring-black/5 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 ${isOpen
            ? "bg-gray-700 hover:bg-gray-800"
            : "bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500"
          }`}
      >
        {/* Pulse ring when closed */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-violet-400 animate-ping opacity-30" />
        )}

        {/* Icon — switches between brain and X */}
        {isOpen ? (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        )}

        {/* Unread dot — shown only when chat has new bot messages and is closed */}
        {!isOpen && messages.length > 1 && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white" />
        )}
      </button>
    </>
  );
}

export default ChatbotWidget;
