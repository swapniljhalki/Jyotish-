/** Single-table view of the user's current Numerology Dasha at all 4 levels:
 *  Mahadasha → Antardasha → Pratyantardasha → Daily Dasha.
 *  Designed to be PDF-friendly: fixed widths, no overflow, no scrollbars,
 *  plain CSS with explicit pixel sizing so html-to-image captures it crisply.
 */

const NUMBER_TINT = {
  1: "#B8870B", // Sun
  2: "#5C3A09", // Moon
  3: "#9C6F00", // Jupiter
  4: "#6E3FA8", // Rahu
  5: "#377D3B", // Mercury
  6: "#B91C5A", // Venus
  7: "#7C4FBF", // Ketu
  8: "#56607A", // Saturn
  9: "#B33A1F", // Mars
};

const PLANET_NAME = {
  1: "Surya (Sun)",
  2: "Chandra (Moon)",
  3: "Guru (Jupiter)",
  4: "Rahu",
  5: "Budha (Mercury)",
  6: "Shukra (Venus)",
  7: "Ketu",
  8: "Shani (Saturn)",
  9: "Mangala (Mars)",
};

const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

const fmtDuration = (p) => {
  if (!p) return "—";
  if ("years" in p)  return `${Number(p.years).toFixed(2)} years`;
  if ("days"  in p)  return `${Math.round(p.days)} days`;
  return "—";
};

export default function NumDashaCurrentTable({ dasha }) {
  if (!dasha?.mahadashas?.length || !dasha.current) return null;
  const { current } = dasha;

  // Walk the tree to find the period object for each active level.
  const md = dasha.mahadashas.find((m) => m.number === current.mahadasha) || null;
  const ad = md?.antardashas?.find((a) => a.number === current.antardasha) || null;
  const pd = ad?.pratyantardashas?.find((p) => p.number === current.pratyantardasha) || null;

  // Daily Dasha is a derived value — we may not have explicit start/end in the
  // tree, so fall back gracefully.
  const dd = current.daily_dasha
    ? {
        number:  current.daily_dasha,
        planet:  PLANET_NAME[current.daily_dasha] || "—",
        english: PLANET_NAME[current.daily_dasha] || "",
        start:   current.daily_dasha_start || null,
        end:     current.daily_dasha_end || null,
      }
    : null;

  const rows = [
    { label: "Mahadasha",       desc: "Major life-period",      p: md, n: current.mahadasha },
    { label: "Antardasha",      desc: "Sub-period",             p: ad, n: current.antardasha },
    { label: "Pratyantardasha", desc: "Sub-sub-period",         p: pd, n: current.pratyantardasha },
    { label: "Daily Dasha",     desc: current.today_weekday || "Today's vibration", p: dd, n: current.daily_dasha },
  ];

  return (
    <table className="snw-dasha-table" data-testid="num-dasha-current-table">
      <thead>
        <tr>
          <th style={{ width: "22%" }}>Level</th>
          <th style={{ width: "10%", textAlign: "center" }}>#</th>
          <th style={{ width: "24%" }}>Planet</th>
          <th style={{ width: "16%" }}>From</th>
          <th style={{ width: "16%" }}>To</th>
          <th style={{ width: "12%", textAlign: "right" }}>Duration</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ label, desc, p, n }) => {
          const tint = n ? NUMBER_TINT[n] || "#5C3A09" : "#5C3A09";
          return (
            <tr key={label}>
              <td>
                <div className="snw-dasha-level">{label}</div>
                <div className="snw-dasha-desc">{desc}</div>
              </td>
              <td style={{ textAlign: "center" }}>
                <span className="snw-dasha-num" style={{ color: tint }}>{n || "—"}</span>
              </td>
              <td className="snw-dasha-planet">
                {p?.glyph && <span style={{ marginRight: 6 }}>{p.glyph}</span>}
                {p?.english || p?.planet || PLANET_NAME[n] || "—"}
              </td>
              <td>{fmtDate(p?.start)}</td>
              <td>{fmtDate(p?.end)}</td>
              <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtDuration(p)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
