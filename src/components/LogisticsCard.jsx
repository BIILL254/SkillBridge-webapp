import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api.js";
import { useMajiZones, homeKey } from "../useMajiZones.js";

// Shown on the Schedule page for students planning in-person study sessions.
//
// How it works:
//   1. Maji's active delivery zones appear as chips. Pick one.
//   2. The card loads the water vendors in that zone (Maji: GET /api/vendors/all?estate=)
//      and shows the best ones, with a Call link.
//   3. "Plan a session in <zone>" opens the booking form with that place filled in,
//      and the session is saved with it.
//
// Resilience (Weeks 10 and 11): if Maji can't be reached the card shows a clear
// message, or saved data with a banner when the server has a good copy. It never
// crashes or goes blank.
const SHOWN_VENDORS = 3;
const timeOf = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function LogisticsCard({ estate, sessions = [], onPlanHere }) {
  const { zones, source, stale, asOf, loading, error } = useMajiZones();
  const [selected, setSelected] = useState(null);
  const [showAllZones, setShowAllZones] = useState(false);
  const userPicked = useRef(false);

  const [vendors, setVendors] = useState(null); // null = loading
  const [vendorsError, setVendorsError] = useState(null);
  const [vendorsSavedAt, setVendorsSavedAt] = useState(null);

  // The zone that matches the student's own estate, if Maji delivers there.
  const homeZone = useMemo(() => {
    const key = homeKey(estate);
    if (!key) return null; // no estate set: don't match every zone
    return (
      zones.find((z) => z.toLowerCase() === key) ||
      zones.find((z) => z.toLowerCase().includes(key)) ||
      null
    );
  }, [zones, estate]);

  // The next in-person session that has a place, so the card can offer it first.
  const nextPlace = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return (
      sessions
        .filter((s) => s.location && s.date >= today)
        .sort((a, b) =>
          `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`),
        )[0] || null
    );
  }, [sessions]);

  // Start on the zone that is most likely wanted: the next planned place, else home.
  useEffect(() => {
    if (userPicked.current || selected || zones.length === 0) return;
    const planned =
      nextPlace &&
      zones.find((z) => z.toLowerCase() === nextPlace.location.toLowerCase());
    setSelected(planned || homeZone || null);
  }, [zones, homeZone, nextPlace, selected]);

  // Load the vendors in the selected zone.
  useEffect(() => {
    if (!selected) {
      setVendors(null);
      return undefined;
    }
    let cancelled = false;
    setVendors(null);
    setVendorsError(null);
    setVendorsSavedAt(null);
    api
      .getAllVendors(selected)
      .then((res) => {
        if (cancelled) return;
        setVendors(res.vendors || []);
        setVendorsSavedAt(res.stale ? res.asOf : null);
      })
      .catch((err) => {
        if (cancelled) return;
        setVendors([]);
        setVendorsError(err.message || "Maji Website could not be reached.");
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const pick = (zone) => {
    userPicked.current = true;
    setSelected(zone === selected ? null : zone);
  };

  // Best vendors first: verified, then highest rating.
  const ranked = (vendors || [])
    .slice()
    .sort(
      (a, b) =>
        Number(b.isVerified) - Number(a.isVerified) ||
        Number(b.rating) - Number(a.rating),
    );
  const top = ranked.slice(0, SHOWN_VENDORS);

  // Chips: the zone you picked and your home zone stay visible even when the list is collapsed.
  const orderedZones = useMemo(() => {
    const first = [selected, homeZone].filter(Boolean);
    return [...new Set([...first, ...zones])];
  }, [zones, selected, homeZone]);
  const chips = showAllZones ? orderedZones : orderedZones.slice(0, 8);

  return (
    <div className="card space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm font-display flex items-center gap-2">
          <span>Water & Logistics</span>
          {source === "live" && !error && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          )}
        </div>
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
            error || stale
              ? "text-amber-700 bg-amber-50 border-amber-200"
              : source === "live"
                ? "text-emerald-700 bg-emerald-50 border-emerald-100"
                : "text-[var(--sb-text-tertiary)] bg-[var(--sb-surface-alt)] border-[var(--sb-border)]"
          }`}
        >
          {error
            ? "Offline Fallback"
            : stale
              ? "Saved data"
              : source === "live"
                ? "Live · Maji Website"
                : "Preview data"}
        </span>
      </div>

      <p className="text-xs text-[var(--sb-text-tertiary)]">
        Meeting in person? Pick an area Maji delivers to, see its water vendors,
        then plan your session there.
      </p>

      {/* Saved-data banner (the fallback must be visible) */}
      {stale && !error && (
        <div
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900"
        >
          Showing saved data from {timeOf(asOf)}. Maji Website is not
          responding.
        </div>
      )}

      {/* Graceful failure: no crash, a clear message */}
      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900 space-y-1">
          <div className="font-medium">⚠️ Maji Website can't be reached</div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            We couldn't load the delivery areas ({error}). You can still book an
            online session, and in-person sessions can be planned once Maji is
            back.
          </p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !error && (
        <div className="flex flex-col gap-2" aria-hidden="true">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-9 rounded-xl bg-[var(--sb-surface-alt)] animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Your estate isn't one Maji delivers to */}
      {!loading && !error && zones.length > 0 && estate && !homeZone && (
        <p className="text-[11px] text-[var(--sb-text-tertiary)]">
          Maji doesn't deliver in {String(estate).split(",")[0]} yet. Pick a
          nearby area below to meet there.
        </p>
      )}

      {/* The student's next planned in-person session */}
      {nextPlace && !error && (
        <p className="text-[11px] text-emerald-700">
          📍 Your next in-person session: {nextPlace.location} on{" "}
          {nextPlace.date} at {nextPlace.time}
        </p>
      )}

      {/* Delivery zones: pick one */}
      {!error && zones.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-[var(--sb-border-subtle)]">
          <div className="flex items-center justify-between text-[11px] font-medium text-[var(--sb-text-secondary)]">
            <span>Delivery areas ({zones.length}): choose where to meet</span>
            <button
              type="button"
              onClick={() => setShowAllZones((v) => !v)}
              className="text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer text-[10px]"
            >
              {showAllZones ? "Show less" : "View all"}
            </button>
          </div>
          <div
            className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1"
            role="group"
            aria-label="Delivery areas"
          >
            {chips.map((z) => {
              const isSelected = z === selected;
              const isHome = z === homeZone;
              return (
                <button
                  key={z}
                  type="button"
                  onClick={() => pick(z)}
                  aria-pressed={isSelected}
                  title={isHome ? "Your estate" : undefined}
                  className={`text-[11px] px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-emerald-600 text-white border-emerald-600 font-medium"
                      : isHome
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-medium"
                        : "bg-[var(--sb-surface-alt)] text-[var(--sb-text-secondary)] border-[var(--sb-border-subtle)] hover:border-emerald-300"
                  }`}
                >
                  {z}
                  {isHome && !isSelected ? " ✓" : ""}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* The chosen zone: its vendors and the plan button */}
      {!error && selected && (
        <div className="space-y-2 pt-1 border-t border-[var(--sb-border-subtle)]">
          <div className="text-[11px] font-medium text-[var(--sb-text-secondary)] uppercase tracking-wide">
            Water vendors in {selected}
          </div>

          {vendors === null && (
            <div className="flex flex-col gap-2" aria-hidden="true">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="h-9 rounded-xl bg-[var(--sb-surface-alt)] animate-pulse"
                />
              ))}
            </div>
          )}

          {vendorsSavedAt && (
            <div
              role="status"
              className="rounded-xl border border-amber-200 bg-amber-50/60 p-2 text-[11px] text-amber-900"
            >
              Showing saved data from {timeOf(vendorsSavedAt)}. Maji Website is
              not responding.
            </div>
          )}

          {vendorsError && (
            <p className="text-[11px] text-amber-800">
              Couldn't load vendors for {selected} right now ({vendorsError}).
              You can still plan the session.
            </p>
          )}

          {vendors && vendors.length === 0 && !vendorsError && (
            <p className="text-[11px] text-[var(--sb-text-tertiary)]">
              No Maji water vendors are listed in {selected} yet.
            </p>
          )}

          {top.length > 0 && (
            <div className="flex flex-col gap-2">
              {top.map((v) => (
                <div
                  key={v.vendorId}
                  className="flex items-center justify-between gap-2 border border-[var(--sb-border-subtle)] rounded-xl px-3 py-2 bg-[var(--sb-surface-alt)]"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[var(--sb-text-primary)] truncate">
                      {v.businessName}
                    </div>
                    <div className="text-[10px] text-[var(--sb-text-tertiary)]">
                      {Number(v.rating) > 0
                        ? `★ ${Number(v.rating).toFixed(1)}`
                        : "No rating yet"}
                      {v.isVerified ? " · verified" : ""}
                      {v.isOnline ? " · online now" : ""}
                    </div>
                  </div>
                  {v.phone && (
                    <a
                      href={`tel:${v.phone}`}
                      className="shrink-0 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1 hover:bg-emerald-100"
                    >
                      Call
                    </a>
                  )}
                </div>
              ))}
              {ranked.length > SHOWN_VENDORS && (
                <p className="text-[10px] text-[var(--sb-text-tertiary)]">
                  +{ranked.length - SHOWN_VENDORS} more in {selected}. See them
                  all on Discover under Water Sales.
                </p>
              )}
            </div>
          )}

          {onPlanHere && (
            <button
              type="button"
              onClick={() => onPlanHere(selected)}
              className="w-full mt-1 py-2 rounded-xl text-[11px] font-semibold bg-[var(--sb-inverse)] text-[var(--sb-inverse-text)] hover:bg-emerald-600 transition-all duration-300"
            >
              Plan a session in {selected} →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
