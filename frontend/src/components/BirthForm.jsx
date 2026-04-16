import { useState } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export default function BirthForm({ onSubmit, loading, cta, testIdPrefix = "birth" }) {
  const [full_name, setFullName] = useState("");
  const [date_of_birth, setDob] = useState("");
  const [time_of_birth, setTob] = useState("");
  const [place_of_birth, setPob] = useState("");

  const submit = (e) => {
    e.preventDefault();
    onSubmit({ full_name, date_of_birth, time_of_birth, place_of_birth });
  };

  return (
    <form onSubmit={submit} data-testid={`${testIdPrefix}-form`} className="space-y-5">
      <div>
        <Label htmlFor="fn" className="font-accent text-[10px] text-zinc-400">Full Name (optional)</Label>
        <Input id="fn" value={full_name} onChange={(e) => setFullName(e.target.value)}
          className="mt-2 bg-[#121824] border-[rgba(212,175,55,0.2)] text-zinc-100 focus:border-[#FF9933]"
          data-testid={`${testIdPrefix}-name-input`}
        />
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <Label htmlFor="dob" className="font-accent text-[10px] text-zinc-400">Date of Birth</Label>
          <Input id="dob" type="date" required
            value={date_of_birth} onChange={(e) => setDob(e.target.value)}
            className="mt-2 bg-[#121824] border-[rgba(212,175,55,0.2)] text-zinc-100 focus:border-[#FF9933]"
            data-testid={`${testIdPrefix}-dob-input`}
          />
        </div>
        <div>
          <Label htmlFor="tob" className="font-accent text-[10px] text-zinc-400">Time of Birth</Label>
          <Input id="tob" type="time" required
            value={time_of_birth} onChange={(e) => setTob(e.target.value)}
            className="mt-2 bg-[#121824] border-[rgba(212,175,55,0.2)] text-zinc-100 focus:border-[#FF9933]"
            data-testid={`${testIdPrefix}-tob-input`}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="pob" className="font-accent text-[10px] text-zinc-400">Place of Birth</Label>
        <Input id="pob" required placeholder="City, Country"
          value={place_of_birth} onChange={(e) => setPob(e.target.value)}
          className="mt-2 bg-[#121824] border-[rgba(212,175,55,0.2)] text-zinc-100 focus:border-[#FF9933]"
          data-testid={`${testIdPrefix}-pob-input`}
        />
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
