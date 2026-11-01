import { useEffect, useState } from "react";
import { api } from "../api.js";

// Shown on Discover when the Water Sales or Water Treatment filter is on.
// Lists real water vendors from Maji Website (GET /api/vendors/all, proxied
// by our backend) so students can approach them about water sales and water
// treatment. Maji treats every vendor as someone you can approach for both;
// it has no separate "trainer" field.
//
// Week 11 Resilience:
//   - Graceful fallback: when Maji is slow or down, shows saved data from memory
//   - Displays visible banner: "Showing saved data from [time]. The partner is not responding."
//   - If nothing is saved, displays a friendly "unavailable" message
const sameEstate = (vendorEstate, studentEstate) =>
  String(studentEstate || "").split(",")[0].trim().toLowerCase() === String(vendorEstate || "").toLowerCase();

export default function WaterVendorsCard({ estate, topic, onRequest, sentSet }) {
  const [vendors, setVendors] = useState(null);
  const [source, setSource] = useState("mock");
  const [isStale, setIsStale] = useState(false);
  const [asOf, setAsOf] = useState(null);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setIsStale(false);
    setAsOf(null);

    api.getAllVendors()
      .then((res) => {
        if (cancelled) return;
        setVendors(res.vendors || []);
        if (res.source) setSource(res.source);
        if (res.stale) {
          setIsStale(true);
          setAsOf(res.asOf);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Partner data is unavailable right now. Try again in a minute.");
        }
      });
    return () => { cancelled = true; };
  }, []);

  const sorted = (vendors || []).slice().sort((a, b) => {
    const mine = Number(sameEstate(b.estate, estate)) - Number(sameEstate(a.estate, estate));
    return mine || (b.rating ?? 0) - (a.rating ?? 0);
  });
  const shown = showAll ? sorted : sorted.slice(0, 4);

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm font-display">Water vendors for {topic}</div>
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
            isStale
              ? "text-amber-800 bg-amber-100 border-amber-300"
              : error
              ? "text-amber-700 bg-amber-50 border-amber-200"
              : source === "live"
              ? "text-emerald-700 bg-emerald-50 border-emerald-100"
              : "text-[var(--sb-text-tertiary)] bg-[var(--sb-surface-alt)] border-[var(--sb-border)]"
          }`}
        >
          {isStale
            ? "Saved data (fallback)"
            : error
            ? "Unavailable"
            : source === "live"
            ? "Live · Maji Website"
            : "Preview data"}
        </span>
      </div>

      <p className="text-xs text-[var(--sb-text-tertiary)]">
        Maji lists these vendors as people you can approach about water sales and water treatment. Your estate comes first.
      </p>

      {/* Week 11 Part D: Visible Stale Data Banner */}
      {isStale && asOf && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-3 text-xs text-amber-900 flex items-start gap-2 shadow-xs">
          <span className="text-amber-700 text-sm mt-[-1px]">⚠️</span>
          <div className="leading-relaxed">
            <span className="font-semibold">Notice:</span> Showing saved data from{" "}
            <span className="font-mono font-medium">{new Date(asOf).toLocaleTimeString()}</span>. The partner is not responding.
          </div>
        </div>
      )}

      {error && !isStale && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900">
          Partner data is unavailable right now ({error}). Try again in a minute.
        </div>
      )}

      {!error && !vendors && (
        <div className="flex flex-col gap-2" aria-hidden="true">
          {[0, 1].map((i) => <div key={i} className="h-12 rounded-xl bg-[var(--sb-surface-alt)] animate-pulse" />)}
        </div>
      )}

      {!error && vendors && vendors.length === 0 && (
        <p className="text-xs text-[var(--sb-text-tertiary)]">Maji has no vendors listed yet.</p>
      )}

      {!error && shown.length > 0 && (
        <div className="flex flex-col gap-2">
          {shown.map((v) => {
            const isSent = Boolean(sentSet && sentSet.has(`v:${v.vendorId}`));
            return (
            <div key={v.vendorId} className="border border-[var(--sb-border-subtle)] rounded-xl px-3 py-2 bg-[var(--sb-surface-alt)]">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-[var(--sb-text-primary)] truncate">{v.businessName}</div>
                <span className="shrink-0 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                  ★ {Number(v.rating).toFixed(1)}
                </span>
              </div>
              <div className="text-[11px] text-[var(--sb-text-secondary)] mt-0.5">
                {v.estate}
                {sameEstate(v.estate, estate) ? " · your estate" : ""}
                {v.isVerified ? " · verified" : ""}
                {v.isOnline ? " · online now" : ""}
              </div>
              {(v.ownerName || v.phone) && (
                <div className="text-[11px] text-[var(--sb-text-tertiary)] mt-0.5">
                  {v.ownerName}
                  {v.ownerName && v.phone ? " · " : ""}
                  {v.phone && <a className="text-emerald-600 font-semibold" href={`tel:${v.phone}`}>{v.phone}</a>}
                </div>
              )}
              {onRequest && (
                <button
                  type="button"
                  onClick={isSent ? undefined : () => onRequest(v)}
                  disabled={isSent}
                  className={`w-full mt-2 py-2 rounded-xl text-[11px] font-semibold transition-all duration-300 ${
                    isSent
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100 cursor-default"
                      : "bg-[var(--sb-inverse)] text-[var(--sb-inverse-text)] hover:-translate-y-0.5 hover:bg-emerald-600"
                  }`}
                >
                  {isSent ? "✓ Request sent" : "Request exchange →"}
                </button>
              )}
            </div>
            );
          })}
        </div>
      )}

      {!error && sorted.length > 4 && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="text-emerald-600 hover:text-emerald-700 font-semibold text-[11px] cursor-pointer"
        >
          {showAll ? "Show fewer" : `Show all ${sorted.length} vendors`}
        </button>
      )}
    </div>
  );
}
