import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StoreHeader from "../../components/StoreHeader";
import {
  API_BASE_URL,
  emitCartChanged,
  formatCurrency,
  formatDateTime,
  getDisplayImage,
  getStoredSessionUser,
  requestAuthJson,
} from "../../utils/storefront";

function buildInitialShippingForm() {
  const sessionUser = getStoredSessionUser();
  const defaultAddress =
    sessionUser?.addresses?.find((address) => address.isDefault) ||
    sessionUser?.addresses?.[0] ||
    {};

  return {
    fullName: defaultAddress.fullName || sessionUser?.fullName || "",
    phone: defaultAddress.phone || sessionUser?.phone || "",
    street: defaultAddress.street || "",
    ward: defaultAddress.ward || "",
    district: defaultAddress.district || "",
    city: defaultAddress.city || "",
    country: defaultAddress.country || "Viet Nam",
  };
}

function emptyCart() {
  return {
    items: [],
    totalQuantity: 0,
    totalAmount: 0,
    updatedAt: null,
  };
}

function Cart() {
  const [sessionUser, setSessionUser] = useState(() => getStoredSessionUser());
  const [cart, setCart] = useState(emptyCart());
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [actionLoadingKey, setActionLoadingKey] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [shippingForm, setShippingForm] = useState(() => buildInitialShippingForm());
  const [paymentMethod, setPaymentMethod] = useState("momo");
  const [note, setNote] = useState("");
  const [lastOrder, setLastOrder] = useState(null);

  useEffect(() => {
    async function loadCart() {
      const nextSessionUser = getStoredSessionUser();
      setSessionUser(nextSessionUser);

      if (!nextSessionUser) {
        setCart(emptyCart());
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await requestAuthJson(`${API_BASE_URL}/api/shop/cart`);
        setCart(data?.cart || emptyCart());
      } catch (cartError) {
        setFeedback(cartError.message || "Khong the tai gio hang.");
      } finally {
        setLoading(false);
      }
    }

    loadCart();

    window.addEventListener("auth-session-changed", loadCart);
    window.addEventListener("cart-changed", loadCart);

    return () => {
      window.removeEventListener("auth-session-changed", loadCart);
      window.removeEventListener("cart-changed", loadCart);
    };
  }, []);

  function updateShippingField(field, value) {
    setShippingForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function updateQuantity(productId, quantity) {
    try {
      setActionLoadingKey(productId);
      setFeedback("");

      const data = await requestAuthJson(
        `${API_BASE_URL}/api/shop/cart/items/${productId}`,
        {
          method: "PATCH",
          body: { quantity },
        },
      );

      setCart(data?.cart || emptyCart());
      emitCartChanged();
    } catch (cartError) {
      setFeedback(cartError.message || "Khong the cap nhat gio hang.");
    } finally {
      setActionLoadingKey("");
    }
  }

  async function removeItem(productId) {
    try {
      setActionLoadingKey(productId);
      setFeedback("");

      const data = await requestAuthJson(
        `${API_BASE_URL}/api/shop/cart/items/${productId}`,
        { method: "DELETE" },
      );

      setCart(data?.cart || emptyCart());
      emitCartChanged();
    } catch (cartError) {
      setFeedback(cartError.message || "Khong the xoa san pham.");
    } finally {
      setActionLoadingKey("");
    }
  }

  async function clearCartItems() {
    try {
      setActionLoadingKey("clear-cart");
      setFeedback("");

      const data = await requestAuthJson(`${API_BASE_URL}/api/shop/cart`, {
        method: "DELETE",
      });

      setCart(data?.cart || emptyCart());
      emitCartChanged();
    } catch (cartError) {
      setFeedback(cartError.message || "Khong the lam trong gio hang.");
    } finally {
      setActionLoadingKey("");
    }
  }

  async function handleCheckout(event) {
    event.preventDefault();

    try {
      setCheckoutLoading(true);
      setFeedback("");
      setLastOrder(null);

      const data = await requestAuthJson(`${API_BASE_URL}/api/shop/checkout`, {
        method: "POST",
        body: {
          shippingAddress: shippingForm,
          paymentMethod,
          note,
        },
      });

      setLastOrder(data?.order || null);
      setCart(emptyCart());
      emitCartChanged();

      if (data?.payment?.payUrl) {
        window.location.assign(data.payment.payUrl);
        return;
      }

      setFeedback(
        data?.message ||
          `Dat hang thanh cong. Ma don cua ban la ${data?.order?.orderCode}.`,
      );
    } catch (checkoutError) {
      setFeedback(checkoutError.message || "Khong the dat hang luc nay.");

      try {
        const latestCart = await requestAuthJson(`${API_BASE_URL}/api/shop/cart`);
        setCart(latestCart?.cart || emptyCart());
        emitCartChanged();
      } catch {
        // Keep the existing UI state if cart reload also fails.
      }
    } finally {
      setCheckoutLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-3 py-4 text-[#2f241f] md:px-6 md:py-6">
      <section className="mx-auto w-full max-w-[1180px] rounded-[32px] border border-[rgba(95,63,42,0.12)] bg-[rgba(255,251,245,0.82)] p-5 shadow-[0_20px_60px_rgba(79,52,35,0.08)] md:p-6">
        <StoreHeader />

        {!sessionUser ? (
          <div className="rounded-3xl border border-[rgba(95,63,42,0.1)] bg-white/75 p-6">
            <h1 className="text-3xl font-semibold">Gio hang cua ban</h1>
            <p className="mt-4 leading-7 text-[#5c4a40]">
              Ban can dang nhap de luu gio hang va dat hang.
            </p>
            <Link
              to="/login"
              className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-[#2f241f] px-5 font-bold text-[#fff8f0] no-underline"
            >
              Dang nhap ngay
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs tracking-[0.16em] text-[#8b6243] uppercase">
                  Gio hang
                </p>
                <h1 className="mt-2 text-4xl font-semibold md:text-5xl">
                  Xac nhan so luong truoc khi dat hang
                </h1>
              </div>

              <button
                type="button"
                className="rounded-full border border-[rgba(95,63,42,0.14)] bg-white/80 px-4 py-2.5 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                onClick={clearCartItems}
                disabled={!cart.items.length || actionLoadingKey === "clear-cart" || checkoutLoading}
              >
                {actionLoadingKey === "clear-cart" ? "Dang xoa..." : "Lam trong gio"}
              </button>
            </div>

            {feedback ? (
              <div className="mb-6 rounded-2xl bg-[#f5ebde] px-4 py-3 text-[#734d36]">
                {feedback}
              </div>
            ) : null}

            {loading ? (
              <div className="rounded-3xl border border-[rgba(95,63,42,0.1)] bg-white/75 p-6">
                Dang tai gio hang...
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
                <div className="grid gap-4">
                  {cart.items.length ? (
                    cart.items.map((item) => {
                      const image = getDisplayImage(item.product?.images);
                      const isBusy = actionLoadingKey === item.product._id || checkoutLoading;

                      return (
                        <article
                          key={item.product._id}
                          className="grid gap-4 rounded-[28px] border border-[rgba(95,63,42,0.1)] bg-white/75 p-5 md:grid-cols-[140px_1fr]"
                        >
                          <div className="overflow-hidden rounded-[22px] bg-[#f3e5d7]">
                            {image ? (
                              <img
                                className="block aspect-square h-full w-full object-cover"
                                src={image}
                                alt={item.product.name}
                              />
                            ) : (
                              <div className="flex aspect-square items-end bg-[linear-gradient(135deg,rgba(164,116,78,0.28),rgba(245,222,194,0.7))] p-4">
                                <span className="rounded-full bg-white/75 px-3 py-2 text-sm font-bold">
                                  {item.product.name}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div>
                                <Link
                                  className="text-2xl font-semibold text-[#2f241f] no-underline"
                                  to={`/san-pham/${item.product.slug}`}
                                >
                                  {item.product.name}
                                </Link>
                                <div className="mt-2 text-sm text-[#6a564b]">
                                  Ton kho hien tai: {item.product.quantityInStock}
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="text-sm text-[#8b6243]">Don gia</div>
                                <strong className="text-xl">{formatCurrency(item.unitPrice)}</strong>
                              </div>
                            </div>

                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  className="rounded-full border border-[rgba(95,63,42,0.14)] bg-white/80 px-4 py-2"
                                  onClick={() => updateQuantity(item.product._id, Math.max(1, item.quantity - 1))}
                                  disabled={isBusy}
                                >
                                  -
                                </button>
                                <input
                                  className="w-24 rounded-full border border-[rgba(95,63,42,0.14)] bg-white/80 px-4 py-2 text-center outline-none"
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(event) =>
                                    updateQuantity(
                                      item.product._id,
                                      Math.max(1, Number(event.target.value) || 1),
                                    )
                                  }
                                  disabled={isBusy}
                                />
                                <button
                                  type="button"
                                  className="rounded-full border border-[rgba(95,63,42,0.14)] bg-white/80 px-4 py-2"
                                  onClick={() => updateQuantity(item.product._id, item.quantity + 1)}
                                  disabled={isBusy}
                                >
                                  +
                                </button>
                              </div>

                              <div className="flex items-center gap-3">
                                <strong className="text-xl">
                                  {formatCurrency(item.lineTotal)}
                                </strong>
                                <button
                                  type="button"
                                  className="rounded-full bg-[#f3e5d7] px-4 py-2 font-semibold text-[#5a4336] disabled:cursor-not-allowed disabled:opacity-60"
                                  onClick={() => removeItem(item.product._id)}
                                  disabled={isBusy}
                                >
                                  Xoa
                                </button>
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <div className="rounded-3xl border border-[rgba(95,63,42,0.1)] bg-white/75 p-6">
                      Gio hang dang trong. Hay quay lai trang san pham de them mon hang.
                    </div>
                  )}
                </div>

                <div className="grid gap-5 rounded-[28px] border border-[rgba(95,63,42,0.1)] bg-white/75 p-5">
                  <div>
                    <p className="text-xs tracking-[0.16em] text-[#8b6243] uppercase">
                      Dat hang
                    </p>
                    <h2 className="mt-2 text-3xl font-semibold">Thong tin giao hang</h2>
                  </div>

                  <div className="rounded-3xl bg-[#fff8f0] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span>Tong so luong</span>
                      <strong>{cart.totalQuantity}</strong>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span>Tam tinh</span>
                      <strong>{formatCurrency(cart.totalAmount)}</strong>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span>Phi van chuyen</span>
                      <strong>{formatCurrency(0)}</strong>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-[rgba(95,63,42,0.1)] pt-4 text-lg">
                      <span>Thanh toan</span>
                      <strong>{formatCurrency(cart.totalAmount)}</strong>
                    </div>
                  </div>

                  <form className="grid gap-4" onSubmit={handleCheckout}>
                    <label className="grid gap-2 text-sm font-semibold text-[#5f493d]">
                      Ho va ten
                      <input
                        className="w-full rounded-2xl border border-[#d8c4ae] bg-white/85 px-4 py-3 outline-none"
                        value={shippingForm.fullName}
                        onChange={(event) => updateShippingField("fullName", event.target.value)}
                        required
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-semibold text-[#5f493d]">
                      So dien thoai
                      <input
                        className="w-full rounded-2xl border border-[#d8c4ae] bg-white/85 px-4 py-3 outline-none"
                        value={shippingForm.phone}
                        onChange={(event) => updateShippingField("phone", event.target.value)}
                        required
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-semibold text-[#5f493d]">
                      Dia chi
                      <input
                        className="w-full rounded-2xl border border-[#d8c4ae] bg-white/85 px-4 py-3 outline-none"
                        value={shippingForm.street}
                        onChange={(event) => updateShippingField("street", event.target.value)}
                        required
                      />
                    </label>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="grid gap-2 text-sm font-semibold text-[#5f493d]">
                        Phuong / Xa
                        <input
                          className="w-full rounded-2xl border border-[#d8c4ae] bg-white/85 px-4 py-3 outline-none"
                          value={shippingForm.ward}
                          onChange={(event) => updateShippingField("ward", event.target.value)}
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-semibold text-[#5f493d]">
                        Quan / Huyen
                        <input
                          className="w-full rounded-2xl border border-[#d8c4ae] bg-white/85 px-4 py-3 outline-none"
                          value={shippingForm.district}
                          onChange={(event) => updateShippingField("district", event.target.value)}
                          required
                        />
                      </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="grid gap-2 text-sm font-semibold text-[#5f493d]">
                        Tinh / Thanh pho
                        <input
                          className="w-full rounded-2xl border border-[#d8c4ae] bg-white/85 px-4 py-3 outline-none"
                          value={shippingForm.city}
                          onChange={(event) => updateShippingField("city", event.target.value)}
                          required
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-semibold text-[#5f493d]">
                        Quoc gia
                        <input
                          className="w-full rounded-2xl border border-[#d8c4ae] bg-white/85 px-4 py-3 outline-none"
                          value={shippingForm.country}
                          onChange={(event) => updateShippingField("country", event.target.value)}
                        />
                      </label>
                    </div>

                    <label className="grid gap-2 text-sm font-semibold text-[#5f493d]">
                      Ghi chu
                      <textarea
                        className="min-h-24 w-full rounded-2xl border border-[#d8c4ae] bg-white/85 px-4 py-3 outline-none"
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        placeholder="Vi du: giao gio hanh chinh, goi truoc khi giao..."
                      />
                    </label>

                    <div className="grid gap-3 rounded-3xl bg-[#fff8f0] p-4">
                      <label className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="momo"
                          checked={paymentMethod === "momo"}
                          onChange={(event) => setPaymentMethod(event.target.value)}
                        />
                        <span>Thanh toan bang MoMo</span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="cod"
                          checked={paymentMethod === "cod"}
                          onChange={(event) => setPaymentMethod(event.target.value)}
                        />
                        <span>Thanh toan khi nhan hang</span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#2f241f] px-5 font-bold text-[#fff8f0] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={checkoutLoading || !cart.items.length}
                    >
                      {checkoutLoading
                        ? "Dang tao don hang..."
                        : paymentMethod === "momo"
                          ? "Dat hang va den MoMo"
                          : "Dat hang"}
                    </button>
                  </form>

                  <p className="text-sm leading-6 text-[#6a564b]">
                    Nut Dat hang se bi disable trong luc xu ly de tranh tao nhieu transaction trung nhau.
                  </p>
                </div>
              </div>
            )}

            {lastOrder ? (
              <div className="mt-6 rounded-[28px] border border-[rgba(95,63,42,0.1)] bg-white/75 p-5">
                <p className="text-xs tracking-[0.16em] text-[#8b6243] uppercase">
                  Don hang moi nhat
                </p>
                <h2 className="mt-2 text-2xl font-semibold">{lastOrder.orderCode}</h2>
                <p className="mt-2 text-[#5c4a40]">
                  Dat luc {formatDateTime(lastOrder.placedAt)}.
                </p>
              </div>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}

export default Cart;
