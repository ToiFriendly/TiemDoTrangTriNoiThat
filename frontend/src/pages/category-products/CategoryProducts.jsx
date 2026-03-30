import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  API_BASE_URL,
  fetchJson,
  formatCurrency,
  getDisplayImage,
} from "../../utils/storefront";

function ProductCard({ product }) {
  const image = getDisplayImage(product.images);

  return (
    <Link
      className="overflow-hidden rounded-3xl border border-[rgba(95,63,42,0.1)] bg-white/75 no-underline transition hover:-translate-y-1"
      to={`/san-pham/${product.slug}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {image ? (
          <img
            className="block h-full w-full object-cover"
            src={image}
            alt={product.name}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-end bg-[linear-gradient(135deg,rgba(164,116,78,0.28),rgba(245,222,194,0.7))] p-5">
            <span className="rounded-full bg-white/75 px-3 py-2 text-sm font-bold">
              {product.category?.name || "San pham"}
            </span>
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="mb-3 flex items-center justify-between gap-3 text-[0.84rem] tracking-[0.08em] text-[#8b6243] uppercase max-sm:flex-col max-sm:items-start">
          <span>{product.category?.name || "Chua phan loai"}</span>
          <span>{product.quantityInStock > 0 ? "Con hang" : "Tam het hang"}</span>
        </div>
        <h2 className="text-xl font-semibold">{product.name}</h2>
        <p className="mt-3 leading-7 text-[#655247]">
          {product.shortDescription || "San pham nay chua co mo ta ngan."}
        </p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <strong className="text-lg">{formatCurrency(product.price)}</strong>
          <span className="font-bold text-[#8b6243]">Xem chi tiet</span>
        </div>
      </div>
    </Link>
  );
}

function CategoryProducts() {
  const { slug } = useParams();
  const [category, setCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadCategoryProducts() {
      try {
        setLoading(true);
        setError("");

        const data = await fetchJson(`${API_BASE_URL}/api/home/categories/${slug}`);

        if (isMounted) {
          setCategory(data.category || null);
          setProducts(Array.isArray(data.products) ? data.products : []);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || "Khong the tai danh muc.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadCategoryProducts();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  return (
    <main className="min-h-screen px-3 py-4 text-[#2f241f] md:px-6 md:py-6">
      <section className="mx-auto w-full max-w-[1180px] rounded-[32px] border border-[rgba(95,63,42,0.12)] bg-[rgba(255,251,245,0.82)] p-5 shadow-[0_20px_60px_rgba(79,52,35,0.08)] md:p-6">
        <div className="mb-6 flex flex-wrap gap-3 text-sm">
          <Link className="rounded-full bg-white/75 px-4 py-2 no-underline" to="/">
            Trang chu
          </Link>
          {category?.parentCategory?.slug ? (
            <Link
              className="rounded-full bg-white/75 px-4 py-2 no-underline"
              to={`/danh-muc/${category.parentCategory.slug}`}
            >
              {category.parentCategory.name}
            </Link>
          ) : null}
        </div>

        {loading ? (
          <div className="rounded-3xl border border-[rgba(95,63,42,0.1)] bg-white/75 p-6">
            Dang tai danh muc...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-[rgba(95,63,42,0.1)] bg-white/75 p-6 text-[#8a3d2f]">
            {error}
          </div>
        ) : (
          <>
            <div className="grid gap-6 rounded-[28px] border border-[rgba(95,63,42,0.1)] bg-white/70 p-6 lg:grid-cols-[0.85fr_1.15fr]">
              <div className="overflow-hidden rounded-[24px]">
                {category?.image ? (
                  <img
                    className="block aspect-[5/4] h-full w-full object-cover"
                    src={category.image}
                    alt={category.name}
                  />
                ) : (
                  <div className="aspect-[5/4] h-full w-full bg-[linear-gradient(135deg,rgba(164,116,78,0.28),rgba(245,222,194,0.7))]" />
                )}
              </div>

              <div className="flex flex-col justify-center">
                <p className="text-xs tracking-[0.16em] text-[#8b6243] uppercase">
                  Danh muc
                </p>
                <h1 className="mt-3 text-4xl font-semibold md:text-5xl">
                  {category?.name || "Danh muc"}
                </h1>
                <p className="mt-4 max-w-[60ch] leading-8 text-[#5c4a40]">
                  {category?.description || "Danh muc nay chua co mo ta."}
                </p>
                <div className="mt-6 inline-flex w-fit rounded-full bg-[#f3e5d7] px-4 py-2 font-semibold">
                  {products.length} san pham
                </div>
              </div>
            </div>

            <div className="mt-6">
              {products.length ? (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {products.map((product) => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-[rgba(95,63,42,0.1)] bg-white/75 p-6">
                  Danh muc nay hien chua co san pham active de hien thi.
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

export default CategoryProducts;
