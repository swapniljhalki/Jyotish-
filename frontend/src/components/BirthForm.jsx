import { useState } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import PlaceOfBirthInput from "./PlaceOfBirthInput";

export default function BirthForm({
  onSubmit,
  loading,
  cta,
  testIdPrefix = "birth",
  showFocusArea = false,
}) {
  const [full_name, setFullName] = useState("");
  const [date_of_birth, setDob] = useState("");
  const [time_of_birth, setTob] = useState("");
  const [place_of_birth, setPob] = useState("");
  const [focus_area, setFocusArea] = useState("");
  // Latitude/longitude are captured when the user picks from the dropdown.
  // Kept locally for now — easy to forward to the backend later if we want
  // to compute charts without re-geocoding on the server.
  const [, setCoords] = useState(null);

  const submit = (e) => {
    e.preventDefault();
    const payload = { full_name, date_of_birth, time_of_birth, place_of_birth };
    if (showFocusArea) payload.focus_area = focus_area.trim();
    onSubmit(payload);
  };

  return (
    <form onSubmit={submit} data-testid={`${testIdPrefix}-form`} className="space-y-5">
      <div>
        <Label htmlFor="fn" className="font-accent text-[10px] text-zinc-700">Full Name (optional)</Label>
        <Input id="fn" value={full_name} onChange={(e) => setFullName(e.target.value)}
          className="mt-2 bg-[#121824] border-[rgba(212,175,55,0.2)] text-zinc-100 focus:border-[#FF9933]"
          data-testid={`${testIdPrefix}-name-input`}
        />
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <Label htmlFor="dob" className="font-accent text-[10px] text-zinc-700">Date of Birth</Label>
          <Input id="dob" type="date" required
            value={date_of_birth} onChange={(e) => setDob(e.target.value)}
            className="mt-2 bg-[#121824] border-[rgba(212,175,55,0.2)] text-zinc-100 focus:border-[#FF9933]"
            data-testid={`${testIdPrefix}-dob-input`}
          />
        </div>
        <div>
          <Label htmlFor="tob" className="font-accent text-[10px] text-zinc-700">Time of Birth</Label>
          <Input id="tob" type="time" required
            value={time_of_birth} onChange={(e) => setTob(e.target.value)}
            className="mt-2 bg-[#121824] border-[rgba(212,175,55,0.2)] text-zinc-100 focus:border-[#FF9933]"
            data-testid={`${testIdPrefix}-tob-input`}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="pob" className="font-accent text-[10px] text-zinc-700">Place of Birth</Label>
        <div className="mt-2">
          <PlaceOfBirthInput
            value={place_of_birth}
            onChange={setPob}
            onSelect={(r) => setCoords({ lat: r.lat, lon: r.lon, country: r.country })}
            testId={`${testIdPrefix}-pob`}
            placeholder="Start typing a city — e.g., Mumbai"
          />
        </div>
      </div>
      {showFocusArea && (
        <div>
          <Label htmlFor={`${testIdPrefix}-focus`} className="font-accent text-[10px] text-zinc-700">
            Area of Focus (optional)
          </Label>
          <textarea
            id={`${testIdPrefix}-focus`}
            value={focus_area}
            onChange={(e) => setFocusArea(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Please write your problem area (ex- career, finance, relationships etc) which needs to be focussed"
            data-testid={`${testIdPrefix}-focus-area-input`}
            className="mt-2 w-full rounded-md bg-[#121824] border border-[rgba(212,175,55,0.2)] text-zinc-100 placeholder-zinc-500 focus:border-[#FF9933] focus:outline-none px-3 py-2 text-sm font-body leading-relaxed resize-y"
          />
          <p className="mt-1 text-[10px] text-zinc-500">
            The AI reading will pay extra attention to this area if provided.
          </p>
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="btn-saffron disabled:opacity-60"
        data-testid={`${testIdPrefix}-submit-btn`}
      >
        {loading ? "Consulting stars..." : cta}
      </button>
    </form>
  );
}
