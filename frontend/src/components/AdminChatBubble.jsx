import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { connectSocket } from "../utils/socket";
import { API_BASE_URL, formatDateTime, requestAuthJson } from "../utils/storefront";

function dedupeById(messages = []) {
  const map = new Map();

  messages.forEach((message) => {
    if (message?._id) {
      map.set(message._id, message);
    }
  });

  return Array.from(map.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

function toId(value) {
  return value ? String(value) : "";
}

function buildConversationPreview(conversation) {
  if (!conversation?.lastMessage) {
    return "Chua co tin nhan";
  }

  const prefix = conversation.lastMessage.senderRole === "admin" ? "Admin: " : "";
  return `${prefix}${conversation.lastMessage.content}`;
}

function AdminChatBubble({ user, token }) {
  const [open, setOpen] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeCustomerId, setActiveCustomerId] = useState("");
  const [activeCustomer, setActiveCustomer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const scrollRef = useRef(null);

  const totalUnread = useMemo(
    () =>
      conversations.reduce(
        (total, conversation) => total + (conversation.unreadCountForAdmin || 0),
        0,
      ),
    [conversations],
  );

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
    setConversations([]);
    setActiveCustomerId("");
    setActiveCustomer(null);
    setMessages([]);
    setContent("");
    setError("");
  }, [user?._id]);

  const loadConversations = useCallback(async (preferCustomerId = "") => {
    try {
      setLoadingConversations(true);
      const data = await requestAuthJson(`${API_BASE_URL}/api/admin/chat/conversations`);
      const nextConversations = data?.conversations || [];
      setConversations(nextConversations);

      const preferredId = toId(preferCustomerId || activeCustomerId);
      const hasPreferred = nextConversations.some(
        (conversation) => toId(conversation?.customer?._id) === preferredId,
      );

      if (hasPreferred) {
        setActiveCustomerId(preferredId);
      } else {
        setActiveCustomerId(toId(nextConversations[0]?.customer?._id));
      }
    } catch (apiError) {
      setError(apiError.message || "Khong the tai danh sach hoi thoai.");
    } finally {
      setLoadingConversations(false);
    }
  }, [activeCustomerId]);

  const loadMessages = useCallback(async (customerId, silent = false) => {
    if (!customerId) {
      setMessages([]);
      setActiveCustomer(null);
      return;
    }

    try {
      if (!silent) {
        setLoadingMessages(true);
      }

      setError("");
      const data = await requestAuthJson(
        `${API_BASE_URL}/api/admin/chat/messages/${customerId}?limit=80`,
      );
      setMessages(dedupeById(data?.messages || []));
      setActiveCustomer(data?.customer || null);
      setConversations((prev) =>
        prev.map((conversation) =>
          toId(conversation?.customer?._id) === toId(customerId)
            ? {
                ...conversation,
                unreadCountForAdmin: 0,
              }
            : conversation,
        ),
      );
    } catch (apiError) {
      setError(apiError.message || "Khong the tai lich su tro chuyen.");
    } finally {
      if (!silent) {
        setLoadingMessages(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!open || !user?._id) {
      return;
    }

    loadConversations();
  }, [loadConversations, open, user?._id]);

  useEffect(() => {
    if (!open) {
      return;
    }

    loadMessages(activeCustomerId);
  }, [activeCustomerId, loadMessages, open]);

  useEffect(() => {
    if (!token || !user?._id) {
      return undefined;
    }

    const socket = connectSocket(token);

    function handleIncomingMessage(payload) {
      if (!payload?._id) {
        return;
      }

      const conversationCustomerId = toId(payload.customerId);

      if (!conversationCustomerId) {
        return;
      }

      setConversations((prev) => {
        const existingConversation = prev.find(
          (conversation) =>
            toId(conversation?.customer?._id) === conversationCustomerId,
        );

        if (!existingConversation) {
          loadConversations(conversationCustomerId);
          return prev;
        }

        const nextConversations = prev.map((conversation) => {
          if (toId(conversation?.customer?._id) !== conversationCustomerId) {
            return conversation;
          }

          const shouldIncreaseUnread =
            payload.senderRole === "customer" &&
            (!open || toId(activeCustomerId) !== conversationCustomerId);

          return {
            ...conversation,
            lastMessage: {
              _id: payload._id,
              content: payload.content,
              senderRole: payload.senderRole,
              createdAt: payload.createdAt,
            },
            unreadCountForAdmin: shouldIncreaseUnread
              ? (conversation.unreadCountForAdmin || 0) + 1
              : conversation.unreadCountForAdmin || 0,
          };
        });

        nextConversations.sort((a, b) => {
          const aTime = a.lastMessage?.createdAt
            ? new Date(a.lastMessage.createdAt).getTime()
            : 0;
          const bTime = b.lastMessage?.createdAt
            ? new Date(b.lastMessage.createdAt).getTime()
            : 0;
          return bTime - aTime;
        });

        return nextConversations;
      });

      if (open && toId(activeCustomerId) === conversationCustomerId) {
        setMessages((prev) => dedupeById([...prev, payload]));

        if (payload.senderRole === "customer") {
          loadMessages(conversationCustomerId, true);
        }
      }
    }

    socket.on("chat:message:new", handleIncomingMessage);

    return () => {
      socket.off("chat:message:new", handleIncomingMessage);
    };
  }, [activeCustomerId, loadConversations, loadMessages, open, token, user?._id]);

  async function handleSendMessage(event) {
    event.preventDefault();

    if (!activeCustomerId || sending) {
      return;
    }

    const nextContent = content.trim();

    if (!nextContent) {
      return;
    }

    try {
      setSending(true);
      setError("");
      const data = await requestAuthJson(`${API_BASE_URL}/api/admin/chat/messages`, {
        method: "POST",
        body: {
          customerId: activeCustomerId,
          content: nextContent,
        },
      });
      const message = data?.message;

      if (message?._id) {
        setMessages((prev) => dedupeById([...prev, message]));
      }

      setContent("");
      loadConversations(activeCustomerId);
    } catch (apiError) {
      setError(apiError.message || "Khong the gui tin nhan luc nay.");
    } finally {
      setSending(false);
    }
  }

  if (!user?._id || user.role !== "admin" || !token) {
    return null;
  }

  return (
    <div className="fixed right-5 bottom-5 z-50">
      {open ? (
        <div className="mb-3 w-[min(96vw,40rem)] rounded-3xl border border-[rgba(95,63,42,0.2)] bg-[#fffaf5] shadow-[0_18px_50px_rgba(47,36,31,0.28)]">
          <div className="flex items-center justify-between border-b border-[rgba(95,63,42,0.1)] px-4 py-3">
            <div>
              <div className="text-sm font-bold text-[#5a4336]">Admin chat center</div>
              <div className="text-xs text-[#8b6243]">Tra loi tat ca nguoi dung</div>
            </div>
            <button
              type="button"
              className="rounded-full bg-[#f3e5d7] px-3 py-1.5 text-sm"
              onClick={() => setOpen(false)}
            >
              Dong
            </button>
          </div>

          <div className="grid h-[24rem] grid-cols-1 md:grid-cols-[14rem_1fr]">
            <aside className="border-r border-[rgba(95,63,42,0.1)]">
              <div className="border-b border-[rgba(95,63,42,0.1)] px-3 py-2 text-xs font-semibold text-[#8b6243]">
                Danh sach user {loadingConversations ? "(dang tai...)" : ""}
              </div>
              <div className="grid max-h-[12rem] gap-1 overflow-y-auto p-2 md:max-h-[calc(24rem-2.2rem)]">
                {conversations.map((conversation) => {
                  const customer = conversation.customer || {};
                  const customerId = toId(customer._id);
                  const isActive = customerId === toId(activeCustomerId);

                  return (
                    <button
                      key={customerId}
                      type="button"
                      className={`rounded-2xl px-3 py-2 text-left ${
                        isActive ? "bg-[#f5ebde]" : "bg-white/75"
                      }`}
                      onClick={() => setActiveCustomerId(customerId)}
                    >
                      <div className="font-semibold text-[#3b2f28]">
                        {customer.fullName || customer.username || "Nguoi dung"}
                      </div>
                      <div className="mt-0.5 text-xs text-[#6a564b]">
                        {buildConversationPreview(conversation)}
                      </div>
                      {conversation.unreadCountForAdmin > 0 ? (
                        <div className="mt-1 text-xs font-bold text-[#9c321d]">
                          {conversation.unreadCountForAdmin} tin chua doc
                        </div>
                      ) : null}
                    </button>
                  );
                })}
                {!loadingConversations && !conversations.length ? (
                  <div className="rounded-2xl bg-white/80 px-3 py-2 text-sm text-[#6a564b]">
                    Chua co nguoi dung nao.
                  </div>
                ) : null}
              </div>
            </aside>

            <section className="flex min-h-0 flex-col">
              <div className="border-b border-[rgba(95,63,42,0.1)] px-4 py-2">
                <div className="font-semibold text-[#3b2f28]">
                  {activeCustomer?.fullName || activeCustomer?.username || "Chon user de chat"}
                </div>
                <div className="text-xs text-[#7d5f4c]">
                  {activeCustomer?.email || " "}
                </div>
              </div>

              <div ref={scrollRef} className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-3">
                {loadingMessages ? (
                  <div className="rounded-2xl bg-white/80 px-3 py-2 text-sm">
                    Dang tai tin nhan...
                  </div>
                ) : messages.length ? (
                  messages.map((message) => {
                    const isMine = message.senderRole === "admin";

                    return (
                      <div
                        key={message._id}
                        className={`w-fit max-w-[78%] break-words rounded-2xl px-3 py-2 text-sm ${
                          isMine
                            ? "ml-auto bg-[#2f241f] text-[#fff8f0]"
                            : "mr-auto bg-[#f5ebde] text-[#2f241f]"
                        }`}
                      >
                        <div>{message.content}</div>
                        <div
                          className={`mt-1 text-[11px] ${
                            isMine ? "text-[#f6e8db]" : "text-[#7d5f4c]"
                          }`}
                        >
                          {formatDateTime(message.createdAt)}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl bg-white/80 px-3 py-2 text-sm text-[#6a564b]">
                    Chua co tin nhan trong hoi thoai nay.
                  </div>
                )}
              </div>

              <form
                className="border-t border-[rgba(95,63,42,0.1)] px-4 py-3"
                onSubmit={handleSendMessage}
              >
                <div className="flex gap-2">
                  <input
                    className="w-full rounded-full border border-[rgba(95,63,42,0.18)] bg-white px-4 py-2 outline-none"
                    placeholder={
                      activeCustomerId ? "Nhap tin nhan cho user..." : "Chon user truoc khi gui"
                    }
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    disabled={!activeCustomerId}
                    maxLength={2000}
                  />
                  <button
                    type="submit"
                    className="rounded-full bg-[#2f241f] px-4 py-2 text-sm font-semibold text-[#fff8f0] disabled:opacity-60"
                    disabled={sending || !activeCustomerId}
                  >
                    {sending ? "Dang gui" : "Gui"}
                  </button>
                </div>
                {error ? <div className="mt-2 text-xs text-[#b23c2a]">{error}</div> : null}
              </form>
            </section>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className="rounded-full bg-[#2f241f] px-5 py-3 text-sm font-bold text-[#fff8f0] shadow-[0_12px_30px_rgba(47,36,31,0.35)]"
        onClick={() => setOpen((prev) => !prev)}
      >
        Hop thu chat {totalUnread > 0 ? `(${totalUnread})` : ""}
      </button>
    </div>
  );
}

export default AdminChatBubble;
