import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { connectSocket, disconnectSocket } from "../utils/socket";
import {
  API_BASE_URL,
  formatDateTime,
  getStoredSessionUser,
  getStoredToken,
  requestAuthJson,
} from "../utils/storefront";

function StoreHeader() {
  const [sessionUser, setSessionUser] = useState(() => getStoredSessionUser());
  const [cartCount, setCartCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function syncHeaderState() {
      const nextUser = getStoredSessionUser();
      setSessionUser(nextUser);

      if (!nextUser || nextUser.role !== "customer") {
        setCartCount(0);
        setNotifications([]);
        setUnreadCount(0);
        setNotificationOpen(false);
        disconnectSocket();
        return;
      }

      try {
        setLoadingNotifications(true);
        const [cartData, notificationData] = await Promise.all([
          requestAuthJson(`${API_BASE_URL}/api/shop/cart`),
          requestAuthJson(`${API_BASE_URL}/api/shop/notifications?limit=15`),
        ]);
        setCartCount(cartData?.cart?.totalQuantity || 0);
        setNotifications(notificationData?.notifications || []);
        setUnreadCount(notificationData?.unreadCount || 0);
      } catch {
        setCartCount(0);
        setNotifications([]);
        setUnreadCount(0);
      } finally {
        setLoadingNotifications(false);
      }
    }

    syncHeaderState();

    window.addEventListener("storage", syncHeaderState);
    window.addEventListener("auth-session-changed", syncHeaderState);
    window.addEventListener("cart-changed", syncHeaderState);

    return () => {
      window.removeEventListener("storage", syncHeaderState);
      window.removeEventListener("auth-session-changed", syncHeaderState);
      window.removeEventListener("cart-changed", syncHeaderState);
    };
  }, []);

  useEffect(() => {
    if (!sessionUser || sessionUser.role !== "customer") {
      return undefined;
    }

    const token = getStoredToken();
    const socket = connectSocket(token);

    function handleNotification(message) {
      if (!message?._id) {
        return;
      }

      setNotifications((prev) => {
        const deduped = prev.filter((item) => item._id !== message._id);
        return [message, ...deduped].slice(0, 20);
      });
      setUnreadCount((prev) => prev + (message.isRead ? 0 : 1));
    }

    socket.on("notification:new", handleNotification);

    return () => {
      socket.off("notification:new", handleNotification);
    };
  }, [sessionUser]);

  async function handleMarkAsRead(notification) {
    if (!notification?._id || notification.isRead) {
      return;
    }

    try {
      const data = await requestAuthJson(
        `${API_BASE_URL}/api/shop/notifications/${notification._id}/read`,
        {
          method: "PATCH",
        },
      );
      const updatedNotification = data?.notification;

      if (!updatedNotification) {
        return;
      }

      setNotifications((prev) =>
        prev.map((item) =>
          item._id === updatedNotification._id ? updatedNotification : item,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Keep existing state when marking read fails.
    }
  }

  return (
    <header className="mb-6 flex items-center justify-between gap-4 max-md:flex-col max-md:items-start">
      <Link
        className="text-base font-extrabold tracking-[0.06em] uppercase no-underline"
        to="/"
      >
        Tiem Do Trang Tri Noi That
      </Link>

      <nav className="flex flex-wrap gap-3 max-md:w-full">
        <Link
          className="rounded-full border border-[rgba(95,63,42,0.1)] bg-white/75 px-4 py-2.5 no-underline max-md:w-full"
          to="/"
        >
          Trang chu
        </Link>
        {sessionUser?.role === "customer" ? (
          <Link
            className="rounded-full border border-[rgba(95,63,42,0.1)] bg-white/75 px-4 py-2.5 no-underline max-md:w-full"
            to="/gio-hang"
          >
            Gio hang ({cartCount})
          </Link>
        ) : null}
        {sessionUser?.role === "customer" ? (
          <div className="relative max-md:w-full">
            <button
              type="button"
              className="rounded-full border border-[rgba(95,63,42,0.1)] bg-white/75 px-4 py-2.5 text-left max-md:w-full"
              onClick={() => setNotificationOpen((prev) => !prev)}
            >
              Thong bao {unreadCount > 0 ? `(${unreadCount})` : ""}
            </button>
            {notificationOpen ? (
              <div className="absolute right-0 z-20 mt-2 w-[22rem] max-w-[90vw] rounded-2xl border border-[rgba(95,63,42,0.16)] bg-[#fffaf5] p-3 shadow-[0_14px_30px_rgba(79,52,35,0.15)]">
                <div className="mb-2 text-sm font-semibold text-[#5d493f]">
                  Thong bao don hang
                </div>
                {loadingNotifications ? (
                  <div className="rounded-xl bg-white/80 px-3 py-2 text-sm">
                    Dang tai thong bao...
                  </div>
                ) : notifications.length ? (
                  <div className="grid max-h-72 gap-2 overflow-y-auto">
                    {notifications.map((notification) => (
                      <button
                        key={notification._id}
                        type="button"
                        className={`rounded-xl px-3 py-2 text-left ${
                          notification.isRead
                            ? "bg-white/70 text-[#5f4a3f]"
                            : "bg-[#f5ebde] text-[#2f241f]"
                        }`}
                        onClick={() => handleMarkAsRead(notification)}
                      >
                        <div className="font-semibold">
                          {notification.title}
                        </div>
                        <div className="mt-1 text-sm">
                          {notification.message}
                        </div>
                        <div className="mt-1 text-xs text-[#816250]">
                          {formatDateTime(notification.createdAt)}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl bg-white/80 px-3 py-2 text-sm text-[#6c564a]">
                    Chua co thong bao nao.
                  </div>
                )}
              </div>
            ) : null}
          </div>
        ) : null}
        {sessionUser?.role === "admin" ? (
          <Link
            to="/admin"
            className="rounded-full border border-[rgba(95,63,42,0.1)] bg-[#f3e5d7] px-4 py-2.5 font-semibold no-underline max-md:w-full"
          >
            Quan tri
          </Link>
        ) : null}
        <Link
          to="/login"
          className={`rounded-full px-4 py-2.5 no-underline max-md:w-full ${
            sessionUser
              ? "bg-[#2f241f] font-bold text-[#fff8f0]"
              : "border border-[rgba(95,63,42,0.1)] bg-white/75"
          }`}
        >
          {sessionUser
            ? sessionUser.fullName || sessionUser.username
            : "Dang nhap"}
        </Link>
      </nav>
    </header>
  );
}

export default StoreHeader;
