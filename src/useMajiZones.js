import { useEffect, useState } from "react";
import { api } from "./api.js";

// Maji's active delivery zones (GET /api/logistics/estates?deliveryStatus=active).
// Shared by the session booking form and the Water & Logistics card, so the
// list is fetched once and reused for a few minutes instead of twice.
const TTL_MS = 5 * 60 * 1000;
let cache = null; // { value, at }
let inflight = null; // the request in progress, so two callers share one

function load() {
  if (cache && Date.now() - cache.at < TTL_MS)
    return Promise.resolve(cache.value);
  if (!inflight) {
    inflight = api
      .getEstates("active")
      .then((res) => {
        const names = (res.estates || []).map((e) => e.name).filter(Boolean);
        const value = {
          zones: [...new Set(names)],
          source: res.source || "mock",
          stale: Boolean(res.stale),
          asOf: res.asOf || null,
        };
        // A saved copy (Maji was down) is not cached, so the next visit tries Maji again.
        if (!value.stale) cache = { value, at: Date.now() };
        return value;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

// enabled=false waits: the booking form only loads zones once it is opened.
export function useMajiZones(enabled = true) {
  const [state, setState] = useState({
    zones: [],
    source: "mock",
    stale: false,
    asOf: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    load()
      .then((v) => {
        if (!cancelled) setState({ ...v, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled)
          setState((s) => ({
            ...s,
            loading: false,
            error: err.message || "Maji Website could not be reached.",
          }));
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}

// "Kileleshwa, Nairobi" -> "kileleshwa", to compare with Maji's zone names.
export const homeKey = (estate) =>
  String(estate || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
