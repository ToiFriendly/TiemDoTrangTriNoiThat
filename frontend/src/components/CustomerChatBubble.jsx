import { useEffect, useRef, useState } from "react";
import { connectSocket } from "../utils/socket";
import { API_BASE_URL, formatDateTime, requestAuthJson } from "../utils/storefront";

function dedupeById(messages = []) {
  const messageMap = new Map();

  messages.forEach((message) => {
    if (message?._id) {
      messageMap.set(message._id, message);
    }
  });

  return Array.from(messageMap.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

function CustomerChatBubble({ user, token }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, [messages, open]);

  useEffect(() => {
    setMessages([]);
    setContent("");
    setError("");
    setUnreadCount(0);
  }, [user?._id]);

  useEffect(() => {
    if (!user?._id || !token) {
      return undefined;
    }

    const socket = connectSocket(token);

    function handleIncomingMessage(payload) {
      if (!payload?._id) {
        return;
      }

      if (String(payload.customerId) !== String(user._id)) {
        return;
      }

      setMessages((prev) => dedupeById([...prev, payload]));

      if (!open && payload.senderRole === "admin") {
        setUnreadCount((prev) => prev + 1);
      }
    }

    socket.on("chat:message:new", handleIncomingMessage);

    return () => {
      socket.off("chat:message:new", handleIncomingMessage);
    };
  }, [open, token, user?._id]);

  useEffect(() => {
    if (!open || !user?._id) {
      return;
    }

    async function loadMessages() {
      try {
        setLoading(true);
        setError("");
        const data = await requestAuthJson(`${API_BASE_URL}/api/shop/chat/messages?limit=80`);
        setMessages(dedupeById(data?.messages || []));
        setUnreadCount(0);
      } catch (apiError) {
        setError(apiError.message || "Khong the tai tin nhan luc nay.");
      } finally {
        setLoading(false);
      }
    }

    loadMessages();
  }, [open, user?._id]);

  async function handleSendMessage(event) {
    event.preventDefault();

    if (sending) {
      return;
    }

    const nextContent = content.trim();

    if (!nextContent) {
      return;
    }

    try {
      setSending(true);
      setError("");
      const data = await requestAuthJson(`${API_BASE_URL}/api/shop/chat/messages`, {
        method: "POST",
        body: { content: nextContent },
      });
      const message = data?.message;

      if (message?._id) {
        setMessages((prev) => dedupeById([...prev, message]));
      }

      setContent("");
    } catch (apiError) {
      setError(apiError.message || "Khong the gui tin nhan luc nay.");
    } finally {
      setSending(false);
    }
  }

  if (!user?._id || user.role !== "customer" || !token) {
    return null;
  }

  return (
    <div className="fixed right-5 bottom-5 z-40">
      {open ? (
        <div className="mb-3 w-[min(90vw,21rem)] rounded-3xl border border-[rgba(95,63,42,0.2)] bg-[#fffaf5] shadow-[0_18px_40px_rgba(47,36,31,0.22)]">
          <div className="flex items-center justify-between border-b border-[rgba(95,63,42,0.1)] px-4 py-3">
            <div>
              <div className="text-sm font-bold text-[#5a4336]">Chat voi admin</div>
              <div className="text-xs text-[#8b6243]">Nhan ho tro truc tiep</div>
            </div>
            <button
              type="button"
              className="rounded-full bg-[#f3e5d7] px-3 py-1.5 text-sm"
              onClick={() => setOpen(false)}
            >
              Dong
            </button>
          </div>

          <div
            ref={scrollRef}
            className="flex max-h-[18rem] min-h-[12rem] flex-col gap-2 overflow-y-auto px-4 py-3"
          >
            {loading ? (
              <div className="rounded-2xl bg-white/80 px-3 py-2 text-sm">Dang tai doan chat...</div>
            ) : messages.length ? (
              messages.map((message) => {
                const isMine = message.senderRole === "customer";

                return (
                  <div
                    key={message._id}
                    className={`w-fit max-w-[82%] break-words rounded-2xl px-3 py-2 text-sm ${
                      isMine
                        ? "ml-auto bg-[#2f241f] text-[#fff8f0]"
                        : "mr-auto bg-[#f5ebde] text-[#2f241f]"
                    }`}
                  >
                    <div>{message.content}</div>
                    <div className={`mt-1 text-[11px] ${isMine ? "text-[#f6e8db]" : "text-[#7d5f4c]"}`}>
                      {formatDateTime(message.createdAt)}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl bg-white/80 px-3 py-2 text-sm text-[#6a564b]">
                Chua co tin nhan. Hay bat dau hoi admin.
              </div>
            )}
          </div>

          <form className="border-t border-[rgba(95,63,42,0.1)] px-4 py-3" onSubmit={handleSendMessage}>
            <div className="flex gap-2">
              <input
                className="w-full rounded-full border border-[rgba(95,63,42,0.18)] bg-white px-4 py-2 outline-none"
                placeholder="Nhap tin nhan..."
                value={content}
                onChange={(event) => setContent(event.target.value)}
                maxLength={2000}
              />
              <button
                type="submit"
                className="rounded-full bg-[#2f241f] px-4 py-2 text-sm font-semibold text-[#fff8f0] disabled:opacity-60"
                disabled={sending}
              >
                {sending ? "Dang gui" : "Gui"}
              </button>
            </div>
            {error ? <div className="mt-2 text-xs text-[#b23c2a]">{error}</div> : null}
          </form>
        </div>
      ) : null}

      <button
        type="button"
        className="rounded-full bg-[#2f241f] px-5 py-3 text-sm font-bold text-[#fff8f0] shadow-[0_12px_30px_rgba(47,36,31,0.35)]"
        onClick={() => setOpen((prev) => !prev)}
      >
        Chat voi admin {unreadCount > 0 ? `(${unreadCount})` : ""}
      </button>
    </div>
  );
}

export default CustomerChatBubble;
