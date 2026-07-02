import { useState } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import PlaceOfBirthInput from "./PlaceOfBirthInput";

export default function BirthForm({ onSubmit, loading, cta, testIdPrefix = "birth" }) {
  const [full_name, setFullName] = useState("");
  const [date_of_birth, setDob] = useState("");
  const [time_of_birth, setTob] = useState("");
  const [place_of_birth, setPob] = useState("");
  // Latitude/longitude are captured when the user picks from the dropdown.
  // Kept locally for now — easy to forward to the backend later if we want
  // to compute charts without re-geocoding on the server.
  // eslint-disable-next-line no-unused-vars
  const [coords, setCoords] = useState(null);

  const submit = (e) => {
    e.preventDefault();
    onSubmit({ full_name, date_of_birth, time_of_birth, place_of_birth });
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
