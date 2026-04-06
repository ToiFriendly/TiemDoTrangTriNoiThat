import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import StoreHeader from "../../components/StoreHeader";
import {
  API_BASE_URL,
  formatCurrency,
  formatDateTime,
  requestAuthJson,
  requestJson,
} from "../../utils/storefront";

function MomoReturn() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [feedback, setFeedback] = useState("");

  const resultCode = searchParams.get("resultCode") || "";
  const orderCode = searchParams.get("orderId") || "";
  const momoMessage = searchParams.get("message") || "";
  const transId = searchParams.get("transId") || "";

  useEffect(() => {
    let isMounted = true;

    async function syncPaymentResult() {
      const payload = Object.fromEntries(searchParams.entries());

      try {
        setLoading(true);

        if (Object.keys(payload).length) {
          const syncResult = await requestJson(
            `${API_BASE_URL}/api/shop/payments/momo/return`,
            {
              method: "POST",
              body: payload,
            },
          );

          if (isMounted && syncResult?.order) {
            setOrder(syncResult.order);
          }
        }

        if (orderCode) {
          try {
            const orderResult = await requestAuthJson(
              `${API_BASE_URL}/api/shop/orders/${orderCode}`,
            );

            if (isMounted && orderResult?.order) {
              setOrder(orderResult.order);
            }
          } catch {
            // The return page can still work from query params if the user is not logged in.
          }
        }
      } catch (error) {
        if (isMounted) {
          setFeedback(error.message || "Khong the dong bo ket qua thanh toan.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    syncPaymentResult();

    return () => {
      isMounted = false;
    };
  }, [orderCode, searchParams]);

  const isSuccess = order?.paymentStatus === "paid" || resultCode === "0";

  return (
    <main className="min-h-screen px-3 py-4 text-[#2f241f] md:px-6 md:py-6">
      <section className="mx-auto w-full max-w-[960px] rounded-[32px] border border-[rgba(95,63,42,0.12)] bg-[rgba(255,251,245,0.82)] p-5 shadow-[0_20px_60px_rgba(79,52,35,0.08)] md:p-6">
        <StoreHeader />

        <div className="rounded-[28px] border border-[rgba(95,63,42,0.1)] bg-white/75 p-6">
          <p className="text-xs tracking-[0.16em] text-[#8b6243] uppercase">
            Kết quả thanh toán MoMo
          </p>
          <h1 className="mt-3 text-4xl font-semibold md:text-5xl">
            {loading
              ? "Đang cập nhật kết quả..."
              : isSuccess
                ? "Thanh toan thanh cong"
                : "Thanh toan chua hoan tat"}
          </h1>
          <p className="mt-4 max-w-[62ch] leading-8 text-[#5c4a40]">
            {feedback || momoMessage || "He thong dang doi ket qua tu MoMo."}
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-[#fff8f0] p-4">
              <div className="text-sm text-[#8b6243]">Mã đơn hàng</div>
              <div className="mt-2 text-xl font-semibold">
                {order?.orderCode || orderCode || "Đang cập nhật"}
              </div>
            </div>
            <div className="rounded-3xl bg-[#fff8f0] p-4">
              <div className="text-sm text-[#8b6243]">Mã giao dịch MoMo</div>
              <div className="mt-2 text-xl font-semibold">
                {order?.paymentTransactionId || transId || "Chưa có"}
              </div>
            </div>
          </div>

          {order ? (
            <div className="mt-6 grid gap-4 rounded-[28px] border border-[rgba(95,63,42,0.1)] bg-[#fffaf5] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm text-[#8b6243]">Trạng thái đơn hàng</div>
                  <div className="mt-1 text-2xl font-semibold">{order.orderStatus}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-[#8b6243]">Tổng thanh toán</div>
                  <div className="mt-1 text-2xl font-semibold">
                    {formatCurrency(order.totalAmount)}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-3xl bg-white p-4">
                  <div className="text-sm text-[#8b6243]">Thanh toán</div>
                  <div className="mt-2 font-semibold">{order.paymentStatus}</div>
                </div>
                <div className="rounded-3xl bg-white p-4">
                  <div className="text-sm text-[#8b6243]">Đặt lúc</div>
                  <div className="mt-2 font-semibold">{formatDateTime(order.placedAt)}</div>
                </div>
              </div>

              {order.items?.length ? (
                <div className="grid gap-3">
                  {order.items.map((item) => (
                    <div
                      key={item._id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white p-4"
                    >
                      <div>
                        <div className="font-semibold">{item.productName}</div>
                        <div className="mt-1 text-sm text-[#6a564b]">
                          {item.quantity} x {formatCurrency(item.unitPrice)}
                        </div>
                      </div>
                      <strong>{formatCurrency(item.lineTotal)}</strong>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#2f241f] px-5 font-bold text-[#fff8f0] no-underline"
            >
              Về trang chủ
            </Link>
            <Link
              to="/gio-hang"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-[rgba(95,63,42,0.18)] bg-white/80 px-5 font-bold no-underline"
            >
              Về giỏ hàng
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default MomoReturn;
