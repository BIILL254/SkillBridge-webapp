import { useEffect, useState } from "react";
import { api } from "../api.js";

// Shown on the Schedule page for university students planning in-person
// study sessions. Surfaces active water delivery zones and nearby vendor
// stations by consuming Maji Website's upstream API (Week 10 Integration).
//
// Lab 10 Resilience:
// If the partner's API is unavailable or returns an error (ECONNREFUSED,
// 502 Bad Gateway), the card handles it gracefully without crashing or
// displaying a blank screen.
export default function LogisticsCard({ estate }) {
  const [stations, setStations] = useState(null);
  const [estates, setEstates] = useState([]);
  const [source, setSource] = useState("mock");
  const [error, setError] = useState(null);
  const [showAllEstates, setShowAllEstates] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    // Fetch stations and active estates in parallel
    Promise.allSettled([
      api.getStations(estate),
      api.getEstates("active"),
    ]).then(([stationsRes, estatesRes]) => {
      if (cancelled) return;

      let hasSuccess = false;

      if (stationsRes.status === "fulfilled") {
        setStations(stationsRes.value.stations || []);
        if (stationsRes.value.source) setSource(stationsRes.value.source);
        hasSuccess = true;
      }

      if (estatesRes.status === "fulfilled") {
        setEstates(estatesRes.value.estates || []);
        if (estatesRes.value.source) setSource(estatesRes.value.source);
        hasSuccess = true;
      }

      if (!hasSuccess) {
        // Both failed — partner is down or unreachable (Lab 10 Part D)
        const errMsg =
          (stationsRes.status === "rejected" && stationsRes.reason?.message) ||
          (estatesRes.status === "rejected" && estatesRes.reason?.message) ||
          "Partner service is currently unreachable.";
        setError(errMsg);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [estate]);

  return (
    <div className="card space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm font-display flex items-center gap-2">
          <span>Water & Logistics</span>
          {source === "live" && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          )}
        </div>
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
            error
              ? "text-amber-700 bg-amber-50 border-amber-200"
              : source === "live"
              ? "text-emerald-700 bg-emerald-50 border-emerald-100"
              : "text-[var(--sb-text-tertiary)] bg-[var(--sb-surface-alt)] border-[var(--sb-border)]"
          }`}
        >
          {error ? "Offline Fallback" : source === "live" ? "Live · Maji Website" : "Preview data"}
        </span>
      </div>

      <p className="text-xs text-[var(--sb-text-tertiary)]">
        {estate
          ? `For study groups meeting in person near ${estate}.`
          : "Upstream water delivery zones verified by Maji Website for in-person group sessions."}
      </p>

      {/* Part D: Graceful Failure Notice (No crash, clear message) */}
      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900 space-y-1">
          <div className="font-medium flex items-center gap-1.5">
            <span>⚠️ Maji Website Service Unavailable</span>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            The upstream water logistics partner could not be reached ({error}). Physical study sessions will
            default to campus meeting points until partner connection recovers.
          </p>
        </div>
      )}

      {/* Loading Skeleton */}
      {!error && !stations && estates.length === 0 && (
        <div className="flex flex-col gap-2" aria-hidden="true">
          {[0, 1].map((i) => (
            <div key={i} className="h-9 rounded-xl bg-[var(--sb-surface-alt)] animate-pulse" />
          ))}
        </div>
      )}

      {/* Stations near user estate */}
      {!error && stations && stations.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-medium text-[var(--sb-text-secondary)] uppercase tracking-wide">
            Nearby Pickup Stations
          </div>
          <div className="flex flex-col gap-2">
            {stations.map((s) => (
              <div
                key={s.vendorId || s.stationName}
                className="flex items-center border border-[var(--sb-border-subtle)] rounded-xl px-3 py-2 bg-[var(--sb-surface-alt)]"
              >
                <div className="text-xs font-semibold text-[var(--sb-text-primary)] truncate">
                  {s.stationName}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Verified Estates list from Maji Website */}
      {!error && estates.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-[var(--sb-border-subtle)]">
          <div className="flex items-center justify-between text-[11px] font-medium text-[var(--sb-text-secondary)]">
            <span>Verified Active Delivery Zones ({estates.length})</span>
            <button
              type="button"
              onClick={() => setShowAllEstates(!showAllEstates)}
              className="text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer text-[10px]"
            >
              {showAllEstates ? "Show less" : "View all"}
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
            {(showAllEstates ? estates : estates.slice(0, 6)).map((e) => {
              const isUserEstate = estate && e.name.toLowerCase().includes(estate.toLowerCase());
              return (
                <span
                  key={e.id || e.name}
                  className={`text-[11px] px-2 py-0.5 rounded-lg border transition-colors ${
                    isUserEstate
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-medium"
                      : "bg-[var(--sb-surface-alt)] text-[var(--sb-text-secondary)] border-[var(--sb-border-subtle)]"
                  }`}
                  title={isUserEstate ? "Your current home estate" : undefined}
                >
                  {e.name} {isUserEstate && "✓"}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
