import { useEffect, useState } from "react";
import { api } from "../api.js";
import { ME } from "../data.js";

const STOCK_STYLES = {
  high: "text-emerald-700 bg-emerald-50 border-emerald-100",
  medium: "text-amber-700 bg-amber-50 border-amber-100",
  low: "text-red-700 bg-red-50 border-red-100",
};

// Shown on the Schedule page for anyone planning a physical (in-person)
// study session — surfaces nearby water vendor stations and the payment
// methods active for the signed-in student's estate. This is SkillBridge
// consuming Maji Website's upstream API (see API_NEEDS_UPSTREAM.md); when
// MAJI_API_BASE_URL isn't configured yet, the backend returns mock data and
// this card shows a small "Preview data" badge so it's clear it's not live.
export default function LogisticsCard() {
  const [stations, setStations] = useState(null);
  const [methods, setMethods] = useState(null);
  const [source, setSource] = useState("mock");
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getStations(ME.estate), api.getPaymentMethods(ME.estate)])
      .then(([stationRes, methodRes]) => {
        if (cancelled) return;
        setStations(stationRes.stations);
        setMethods(methodRes.methods);
        setSource(stationRes.source);
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-1">
        <div className="font-semibold text-sm font-display">Nearby water stations</div>
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
            source === "live"
              ? "text-emerald-700 bg-emerald-50 border-emerald-100"
              : "text-[#888] bg-[#FAFAFA] border-[#E5E5E5]"
          }`}
        >
          {source === "live" ? "Live · Maji Website" : "Preview data"}
        </span>
      </div>
      <p className="text-xs text-[#999] mb-4">For groups meeting in person near {ME.estate}.</p>

      {error && <div className="text-xs text-red-600">Couldn't reach logistics: {error}</div>}

      {!error && !stations && (
        <div className="flex flex-col gap-2" aria-hidden="true">
          {[0, 1].map((i) => <div key={i} className="h-12 rounded-xl bg-[#F5F5F5] animate-pulse" />)}
        </div>
      )}

      {stations && stations.length === 0 && (
        <div className="text-xs text-[#999] py-2">No vendor stations found near {ME.estate} yet.</div>
      )}

      {stations && stations.length > 0 && (
        <div className="flex flex-col gap-2 mb-4">
          {stations.map((s) => (
            <div key={s.id} className="flex items-center justify-between border border-[#F0F0F0] rounded-xl px-3 py-2">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#111] truncate">{s.name}</div>
                <div className="text-[11px] text-[#999]">{s.hours}</div>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border flex-shrink-0 ${STOCK_STYLES[s.stockLevel] || STOCK_STYLES.medium}`}>
                {s.stockLevel} stock
              </span>
            </div>
          ))}
        </div>
      )}

      {methods && methods.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-[#aaa] font-semibold mb-1.5">Payment options here</div>
          <div className="flex flex-wrap gap-1.5">
            {methods.map((m) => (
              <span key={m.method} className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-[#FAFAFA] border-[#E5E5E5] text-[#444]">
                {m.method}{m.feeKes ? ` · KES ${m.feeKes} fee` : ""}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
