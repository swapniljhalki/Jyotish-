// PlaceOfBirthInput — type-to-search global location dropdown.
// Backend `/api/geo/search` proxies OpenStreetMap Nominatim and returns a
// slim list of {label, lat, lon, ...}. Keyboard-accessible (↑/↓/Enter/Esc).
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, MapPin, X } from "lucide-react";
import api from "../lib/api";

export default function PlaceOfBirthInput({
  value,
  onChange,
  onSelect,        // optional: receives full {label, lat, lon, ...} on pick
  required = true,
  placeholder = "Start typing a city…",
  testId = "pob",
  className = "",
}) {
  const { i18n } = useTranslation();
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef(null);
  const debounceRef = useRef(null);
  const skipNextSearch = useRef(false);

  // Keep query in sync if parent overrides value (rare)
  useEffect(() => {
    if (value !== undefined && value !== query) setQuery(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get(
          `/geo/search?q=${encodeURIComponent(query)}&limit=8&lang=${i18n.resolvedLanguage}`,
        );
        setResults(data.results || []);
        setOpen(true);
        setHighlight(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [query, i18n.resolvedLanguage]);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);

  const pick = (item) => {
    skipNextSearch.current = true;
    setQuery(item.label);
    onChange?.(item.label);
    onSelect?.(item);
    setOpen(false);
    setResults([]);
  };

  const onKeyDown = (e) => {
    if (!open || !results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(results[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const clear = () => {
    setQuery("");
    setResults([]);
    setOpen(false);
    onChange?.("");
  };

  return (
    <div ref={boxRef} className="relative" data-testid={`${testId}-wrapper`}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D96600] pointer-events-none" />
        <input
          type="text"
          required={required}
          value={query}
          onChange={(e) => { setQuery(e.target.value); onChange?.(e.target.value); }}
          onFocus={() => results.length && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          data-testid={`${testId}-input`}
          className={`w-full pl-10 pr-9 py-2.5 rounded-md bg-white border border-[rgba(212,175,55,0.4)] text-zinc-900 font-body focus:outline-none focus:border-[#FF9933] focus:ring-2 focus:ring-[#FF9933]/20 transition ${className}`}
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 animate-spin" />
        ) : query ? (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-700 rounded"
            data-testid={`${testId}-clear`}
            aria-label="Clear"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {open && (
        <ul
          className="absolute left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-md border border-[rgba(212,175,55,0.4)] bg-white shadow-xl z-50 ring-1 ring-black/5"
          data-testid={`${testId}-dropdown`}
        >
          {results.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-zinc-500 font-body italic" data-testid={`${testId}-no-results`}>
              No matches — keep typing or try a nearby city.
            </li>
          ) : (
            results.map((r, idx) => (
              <li
                key={`${r.osm_id || idx}-${r.label}`}
                onMouseDown={(e) => { e.preventDefault(); pick(r); }}
                onMouseEnter={() => setHighlight(idx)}
                data-testid={`${testId}-option-${idx}`}
                className={`px-3 py-2.5 cursor-pointer flex items-start gap-2 text-sm font-body border-b border-zinc-100 last:border-b-0 ${
                  idx === highlight ? "bg-[#FFF3E0]" : "hover:bg-zinc-50"
                }`}
              >
                <MapPin className="h-3.5 w-3.5 mt-0.5 text-[#D96600] flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-zinc-900 truncate">{r.label}</div>
                  {r.lat && r.lon && (
                    <div className="text-[10px] text-zinc-400 font-accent uppercase tracking-wider">
                      {r.lat.toFixed(3)}°, {r.lon.toFixed(3)}°
                    </div>
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
