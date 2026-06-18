/** Cover block for every reading PDF / archive page.
 *  Combines the user's NAME (prominent) + birth details + the
 *  Ascendant / Sun Sign / Moon Sign hero trio into one cohesive section. */

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
};

export default function ReadingCover({
  name,
  dob,
  tob,
  pob,
  ascendant,
  ascendantSanskrit,
  sunSign,
  moonSign,
  testIdPrefix = "reading",
}) {
  return (
    <div
      className="snw-cover"
      data-testid={`${testIdPrefix}-cover`}
    >
      {name && (
        <div className="snw-cover-name" data-testid={`${testIdPrefix}-cover-name`}>
          {name}
        </div>
      )}

      <div className="snw-cover-meta">
        <div>
          <span className="snw-cover-meta-label">Date of Birth</span>
          <span className="snw-cover-meta-value">{fmtDate(dob)}</span>
        </div>
        <div>
          <span className="snw-cover-meta-label">Time of Birth</span>
          <span className="snw-cover-meta-value">{tob || "—"}</span>
        </div>
        <div>
          <span className="snw-cover-meta-label">Place of Birth</span>
          <span className="snw-cover-meta-value">{pob || "—"}</span>
        </div>
      </div>

      <div className="snw-cover-divider" />

      <div className="snw-tri">
        <div className="snw-tri-card">
          <div className="snw-tri-label">Ascendant</div>
          <div className="snw-tri-value asc">{ascendant || "—"}</div>
          {ascendantSanskrit && <div className="snw-tri-sub">{ascendantSanskrit}</div>}
        </div>
        <div className="snw-tri-card">
          <div className="snw-tri-label">Sun Sign</div>
          <div className="snw-tri-value sun">{sunSign || "—"}</div>
        </div>
        <div className="snw-tri-card">
          <div className="snw-tri-label">Moon Sign</div>
          <div className="snw-tri-value moon">{moonSign || "—"}</div>
        </div>
      </div>
    </div>
  );
}
