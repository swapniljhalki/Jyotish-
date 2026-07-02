import { User, Calendar, Clock, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
};

/** Shows the birth details exactly as the user submitted them. */
export default function BirthDetailsSummary({ inputs, testIdPrefix }) {
  const { t } = useTranslation();
  if (!inputs) return null;
  const rows = [
    [User, t("result.name"), inputs.full_name || "—"],
    [Calendar, t("result.dob"), fmtDate(inputs.date_of_birth)],
    [Clock, t("result.tob"), inputs.time_of_birth || "—"],
    [MapPin, t("result.pob"), inputs.place_of_birth || "—"],
  ];
  return (
    <div
      className="glass-card p-5 md:p-6 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4"
      data-testid={`${testIdPrefix}-birth-details`}
    >
      {rows.map(([Icon, label, value]) => (
        <div key={label} className="flex items-start gap-2.5">
          <Icon className="w-4 h-4 mt-0.5 text-[#B8741A] shrink-0" aria-hidden="true" />
          <div>
            <div className="font-accent text-[9px] text-zinc-800 uppercase tracking-widest">{label}</div>
            <div className="font-body text-sm text-zinc-100 mt-0.5 break-words">{value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
