export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export function getStoredSessionUser() {
  try {
    const rawSession = localStorage.getItem("auth_demo_session");

    if (!rawSession) {
      return null;
    }

    const parsedSession = JSON.parse(rawSession);
    return parsedSession?.user || null;
  } catch (_error) {
    return null;
  }
}

export function formatCurrency(price) {
  if (typeof price !== "number") {
    return "Lien he";
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
}

export function getDisplayImage(images = []) {
  const validImage = images.find(
    (image) =>
      image && typeof image === "string" && !image.includes("placehold.co"),
  );

  return validImage || "";
}

export async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || "Khong the tai du lieu.");
  }

  return response.json();
}
