import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import StoreHeader from "../../components/StoreHeader";
import {
  API_BASE_URL,
  emitCartChanged,
  fetchJson,
  formatCurrency,
  getDisplayImage,
  getStoredSessionUser,
  requestAuthJson,
} from "../../utils/storefront";

function InfoBlock({ label, value }) {
  if (!value) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-[rgba(95,63,42,0.1)] bg-white/70 p-4">
      <div className="text-xs tracking-[0.12em] text-[#8b6243] uppercase">
        {label}
      </div>
      <div className="mt-2 text-base font-semibold">{value}</div>
    </div>
  );
}

function ProductDetail() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [cartSubmitting, setCartSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadProduct() {
      try {
        setLoading(true);
        setError("");
        setFeedback("");

        const data = await fetchJson(`${API_BASE_URL}/api/home/products/${slug}`);

        if (isMounted) {
          setProduct(data.product || null);
          setQuantity(1);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || "Khong the tai chi tiet san pham.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadProduct();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const image = product ? getDisplayImage(product.images) : "";
  const dimensions = product?.dimensions || {};
  const dimensionText =
    dimensions.length || dimensions.width || dimensions.height
      ? `${dimensions.length || 0} x ${dimensions.width || 0} x ${dimensions.height || 0} ${dimensions.unit || "cm"}`
      : "";

  async function handleAddToCart() {
    if (!product) {
      return;
    }

    if (!getStoredSessionUser()) {
      navigate("/login");
      return;
    }

    try {
      setCartSubmitting(true);
      setFeedback("");

      await requestAuthJson(`${API_BASE_URL}/api/shop/cart/items`, {
        method: "POST",
        body: {
          productId: product._id,
          quantity,
        },
      });

      emitCartChanged();
      setFeedback("Da them san pham vao gio hang.");
    } catch (cartError) {
      setFeedback(cartError.message || "Khong the them vao gio hang.");
    } finally {
      setCartSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen px-3 py-4 text-[#2f241f] md:px-6 md:py-6">
      <section className="mx-auto w-full max-w-[1180px] rounded-[32px] border border-[rgba(95,63,42,0.12)] bg-[rgba(255,251,245,0.82)] p-5 shadow-[0_20px_60px_rgba(79,52,35,0.08)] md:p-6">
        <StoreHeader />

        <div className="mb-6 flex flex-wrap gap-3 text-sm">
          <Link className="rounded-full bg-white/75 px-4 py-2 no-underline" to="/">
            Trang chu
          </Link>
          {product?.category?.slug ? (
            <Link
              className="rounded-full bg-white/75 px-4 py-2 no-underline"
              to={`/danh-muc/${product.category.slug}`}
            >
              {product.category.name}
            </Link>
          ) : null}
        </div>

        {loading ? (
          <div className="rounded-3xl border border-[rgba(95,63,42,0.1)] bg-white/75 p-6">
            Dang tai chi tiet san pham...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-[rgba(95,63,42,0.1)] bg-white/75 p-6 text-[#8a3d2f]">
            {error}
          </div>
        ) : product ? (
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="overflow-hidden rounded-[28px] border border-[rgba(95,63,42,0.1)] bg-white/75">
              <div className="aspect-[4/3] overflow-hidden">
                {image ? (
                  <img
                    className="block h-full w-full object-cover"
                    src={image}
                    alt={product.name}
                  />
                ) : (
                  <div className="flex h-full w-full items-end bg-[linear-gradient(135deg,rgba(164,116,78,0.28),rgba(245,222,194,0.7))] p-6">
                    <span className="rounded-full bg-white/75 px-3 py-2 text-sm font-bold">
                      {product.category?.name || "San pham"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-5">
              <div>
                <p className="text-xs tracking-[0.16em] text-[#8b6243] uppercase">
                  Chi tiet san pham
                </p>
                <h1 className="mt-3 text-4xl font-semibold md:text-5xl">
                  {product.name}
                </h1>
                <p className="mt-4 text-lg leading-8 text-[#5c4a40]">
                  {product.shortDescription || "San pham nay chua co mo ta ngan."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <strong className="text-3xl">{formatCurrency(product.price)}</strong>
                {product.compareAtPrice > product.price ? (
                  <span className="text-lg text-[#8b6243] line-through">
                    {formatCurrency(product.compareAtPrice)}
                  </span>
                ) : null}
                <span className="rounded-full bg-[#f3e5d7] px-4 py-2 text-sm font-semibold">
                  {product.quantityInStock > 0 ? "Con hang" : "Tam het hang"}
                </span>
              </div>

              <div className="rounded-[28px] border border-[rgba(95,63,42,0.1)] bg-white/70 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm text-[#6a564b]">So luong muon mua</div>
                    <div className="mt-3 flex items-center gap-3">
                      <button
                        type="button"
                        className="rounded-full border border-[rgba(95,63,42,0.14)] bg-white/80 px-4 py-2"
                        onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                        disabled={cartSubmitting || product.quantityInStock <= 0}
                      >
                        -
                      </button>
                      <input
                        className="w-24 rounded-full border border-[rgba(95,63,42,0.14)] bg-white/80 px-4 py-2 text-center outline-none"
                        type="number"
                        min="1"
                        max={Math.max(1, product.quantityInStock)}
                        value={quantity}
                        onChange={(event) =>
                          setQuantity(Math.max(1, Number(event.target.value) || 1))
                        }
                        disabled={cartSubmitting || product.quantityInStock <= 0}
                      />
                      <button
                        type="button"
                        className="rounded-full border border-[rgba(95,63,42,0.14)] bg-white/80 px-4 py-2"
                        onClick={() => setQuantity((prev) => prev + 1)}
                        disabled={cartSubmitting || product.quantityInStock <= 0}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#2f241f] px-6 font-bold text-[#fff8f0] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={handleAddToCart}
                    disabled={cartSubmitting || product.quantityInStock <= 0}
                  >
                    {cartSubmitting ? "Dang them..." : "Them vao gio hang"}
                  </button>
                </div>

                <p className="mt-4 text-sm leading-6 text-[#6a564b]">
                  He thong chi kiem tra ton kho khi them vao gio. Kho se chi bi tru
                  trong transaction luc Dat hang.
                </p>

                {feedback ? (
                  <div className="mt-4 rounded-2xl bg-[#f5ebde] px-4 py-3 text-[#734d36]">
                    {feedback}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <InfoBlock label="Danh muc" value={product.category?.name} />
                <InfoBlock label="SKU" value={product.sku} />
                <InfoBlock label="Chat lieu" value={product.material} />
                <InfoBlock label="Phong cach" value={product.style} />
                <InfoBlock label="Mau sac" value={product.color} />
                <InfoBlock label="Kich thuoc" value={dimensionText} />
              </div>

              <div className="rounded-[28px] border border-[rgba(95,63,42,0.1)] bg-white/70 p-5">
                <h2 className="text-2xl font-semibold">Mo ta chi tiet</h2>
                <p className="mt-4 leading-8 text-[#5c4a40]">
                  {product.description || "San pham nay chua co mo ta chi tiet."}
                </p>
              </div>

              {product.tags?.length ? (
                <div className="flex flex-wrap gap-3">
                  {product.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-[rgba(95,63,42,0.14)] bg-white/80 px-4 py-2 text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default ProductDetail;
