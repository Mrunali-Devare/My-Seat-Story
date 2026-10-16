export const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export const formatShowTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", { weekday: "short", hour: "2-digit", minute: "2-digit", hour12: true });
};

export const formatShowDateOnly = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

export const formatShowTimeOnly = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
