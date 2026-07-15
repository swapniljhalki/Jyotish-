import { useEffect, useState, useRef } from "react";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Navigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Trash2, Mail, Users as UsersIcon, BookOpen, CalendarDays } from "lucide-react";
import SchedulerAdmin from "../components/SchedulerAdmin";
import KundaliChart from "../components/KundaliChart";
import AdviceMarkdown from "../components/AdviceMarkdown";
import snwLogo from "../assets/snw-logo.jpg";

export default function Admin() {
  const { user, loading } = useAuth();
  const [users, setUsers] = useState([]);
  const [emails, setEmails] = useState([]);
  const [readings, setReadings] = useState([]);
  const [readingDetail, setReadingDetail] = useState(null);
  const printableRef = useRef(null);
  const [err, setErr] = useState("");

  const loadUsers = async () => {
    try {
      const { data } = await api.get("/admin/users");
      setUsers(data.users);
    } catch (e) { setErr(formatApiError(e.response?.data?.detail) || e.message); }
  };
  const loadEmails = async () => {
    try {
      const { data } = await api.get("/admin/emails");
      setEmails(data.emails);
    } catch (e) { setErr(formatApiError(e.response?.data?.detail) || e.message); }
  };
  const loadReadings = async () => {
    try {
      const { data } = await api.get("/admin/readings");
      setReadings(data.readings);
    } catch (e) { setErr(formatApiError(e.response?.data?.detail) || e.message); }
  };
  const [deletingAll, setDeletingAll] = useState(false);
  const deleteAllReadings = async () => {
    // Two-step confirm: browser confirm() + require typing DELETE. Cheap,
    // dependency-free, and the destruction is total (all users, all tiers).
    const confirm1 = window.confirm(
      `⚠️  DELETE ALL ${readings.length} READINGS?\n\n` +
      "This will permanently remove every reading in the database for every user.\n" +
      "This action cannot be undone.\n\nClick OK to continue."
    );
    if (!confirm1) return;
    const typed = window.prompt('Type DELETE (all caps) to confirm:', "");
    if (typed !== "DELETE") {
      toast.info("Cancelled — nothing was deleted.");
      return;
    }
    setDeletingAll(true);
    try {
      const { data } = await api.delete("/admin/readings");
      toast.success(`Deleted ${data.deleted} readings.`);
      setReadings([]);
      setReadingDetail(null);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setDeletingAll(false);
    }
  };
  const openReading = async (id) => {
    try {
      const { data } = await api.get(`/admin/readings/${id}`);
      setReadingDetail(data);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail) || e.message); }
  };

  useEffect(() => {
    if (user?.role === "admin") {
      loadUsers();
      loadEmails();
      loadReadings();
    }
  }, [user]);

  if (loading || user === null) return null;
  if (!user || user.role !== "admin") return <Navigate to="/" replace />;

  const updateTier = async (uid, tier) => {
    try {
      await api.patch(`/admin/users/${uid}`, { tier });
      toast.success(`Tier updated to ${tier}`);
      loadUsers();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const deleteUser = async (uid) => {
    if (!window.confirm("Delete this user? This cannot be undone.")) return;
    try {
      await api.delete(`/admin/users/${uid}`);
      toast.success("User deleted");
      loadUsers();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div className="cosmic-bg min-h-[calc(100vh-64px)]">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-16">
        <div className="mb-10 fade-up">
          <p className="font-accent text-xs text-[#B8860B] mb-3">Admin</p>
          <h1 className="font-heading text-5xl md:text-6xl text-zinc-50">
            Control <span className="text-gold-gradient italic">panel.</span>
          </h1>
        </div>

        {err && <div className="text-red-400 text-sm mb-4" data-testid="admin-error">{err}</div>}

        <Tabs defaultValue={new URLSearchParams(window.location.search).get("tab") || "users"} className="w-full" data-testid="admin-tabs">
          <TabsList className="bg-[#121824] border border-[rgba(212,175,55,0.2)]">
            <TabsTrigger value="users" className="data-[state=active]:bg-[rgba(255,153,51,0.15)] data-[state=active]:text-[#FFD700]" data-testid="admin-tab-users">
              <UsersIcon className="h-4 w-4 mr-2" /> Users ({users.length})
            </TabsTrigger>
            <TabsTrigger value="readings" className="data-[state=active]:bg-[rgba(255,153,51,0.15)] data-[state=active]:text-[#FFD700]" data-testid="admin-tab-readings">
              <BookOpen className="h-4 w-4 mr-2" /> All Readings ({readings.length})
            </TabsTrigger>
            <TabsTrigger value="scheduler" className="data-[state=active]:bg-[rgba(255,153,51,0.15)] data-[state=active]:text-[#FFD700]" data-testid="admin-tab-scheduler">
              <CalendarDays className="h-4 w-4 mr-2" /> Scheduler
            </TabsTrigger>
            <TabsTrigger value="emails" className="data-[state=active]:bg-[rgba(255,153,51,0.15)] data-[state=active]:text-[#FFD700]" data-testid="admin-tab-emails">
              <Mail className="h-4 w-4 mr-2" /> Email Outbox ({emails.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <div className="glass-card p-4 md:p-6" data-testid="admin-users-table">
              <Table>
                <TableHeader>
                  <TableRow className="border-[rgba(212,175,55,0.2)]">
                    <TableHead className="text-zinc-700 font-accent text-[10px]">Email</TableHead>
                    <TableHead className="text-zinc-700 font-accent text-[10px]">Name</TableHead>
                    <TableHead className="text-zinc-700 font-accent text-[10px]">Tier</TableHead>
                    <TableHead className="text-zinc-700 font-accent text-[10px]">Role</TableHead>
                    <TableHead className="text-zinc-700 font-accent text-[10px]">Provider</TableHead>
                    <TableHead className="text-zinc-700 font-accent text-[10px]">Verified</TableHead>
                    <TableHead className="text-zinc-700 font-accent text-[10px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} className="border-[rgba(212,175,55,0.1)]" data-testid={`admin-user-row-${u.email}`}>
                      <TableCell className="text-zinc-100 font-body">{u.email}</TableCell>
                      <TableCell className="text-zinc-800 font-body">{u.name}</TableCell>
                      <TableCell>
                        <Select value={u.tier} onValueChange={(v) => updateTier(u.id, v)}>
                          <SelectTrigger className="w-28 bg-[#121824] border-[rgba(212,175,55,0.2)] text-zinc-100" data-testid={`admin-tier-select-${u.email}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#121824] border-[rgba(212,175,55,0.3)] text-zinc-100">
                            <SelectItem value="free">free</SelectItem>
                            <SelectItem value="basic">basic</SelectItem>
                            <SelectItem value="premium">premium</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="font-body">
                        <span className={u.role === "admin" ? "text-[#FFD700]" : "text-zinc-700"}>{u.role}</span>
                      </TableCell>
                      <TableCell className="text-zinc-700 font-body text-xs">{u.auth_provider}</TableCell>
                      <TableCell className="text-xs">
                        {u.email_verified ? <span className="text-green-400">✓</span> : <span className="text-zinc-800">—</span>}
                      </TableCell>
                      <TableCell>
                        {u.id !== user.id && (
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => deleteUser(u.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-transparent"
                            data-testid={`admin-delete-${u.email}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="readings" className="mt-6">
            <div className="glass-card p-4 md:p-6" data-testid="admin-readings-table">
              {readings.length > 0 && (
                <div className="mb-4 flex justify-end">
                  <Button
                    variant="destructive"
                    onClick={deleteAllReadings}
                    disabled={deletingAll}
                    data-testid="admin-delete-all-readings-btn"
                    className="bg-red-700 hover:bg-red-800 text-white font-accent text-xs tracking-widest"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {deletingAll ? "Deleting…" : `Delete all readings (${readings.length})`}
                  </Button>
                </div>
              )}
              {readings.length === 0 ? (
                <p className="text-zinc-800 font-body italic text-center py-10">No readings yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-[rgba(212,175,55,0.2)]">
                      <TableHead className="text-zinc-700 font-accent text-[10px]">Date</TableHead>
                      <TableHead className="text-zinc-700 font-accent text-[10px]">User</TableHead>
                      <TableHead className="text-zinc-700 font-accent text-[10px]">Tier</TableHead>
                      <TableHead className="text-zinc-700 font-accent text-[10px]">Ascendant</TableHead>
                      <TableHead className="text-zinc-700 font-accent text-[10px]">Sun</TableHead>
                      <TableHead className="text-zinc-700 font-accent text-[10px]">Moon</TableHead>
                      <TableHead className="text-zinc-700 font-accent text-[10px]">Shared</TableHead>
                      <TableHead className="text-zinc-700 font-accent text-[10px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {readings.map((r) => (
                      <TableRow key={r.id} className="border-[rgba(212,175,55,0.1)]" data-testid={`admin-reading-row-${r.id}`}>
                        <TableCell className="text-zinc-800 font-body text-xs whitespace-nowrap">
                          {new Date(r.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-zinc-200 font-body text-sm">
                          <div>{r.user_name || "—"}</div>
                          <div className="text-xs text-zinc-800">{r.user_email || "(deleted user)"}</div>
                        </TableCell>
                        <TableCell>
                          <span className={
                            r.tier === "premium"
                              ? "text-[#FFD700] font-accent text-xs"
                              : "text-[#FF9933] font-accent text-xs"
                          }>
                            {r.tier}
                          </span>
                        </TableCell>
                        <TableCell className="text-zinc-800 font-body text-sm">{r.summary?.ascendant || "—"}</TableCell>
                        <TableCell className="text-zinc-800 font-body text-sm">{r.summary?.sun_sign || "—"}</TableCell>
                        <TableCell className="text-zinc-800 font-body text-sm">{r.summary?.moon_sign || "—"}</TableCell>
                        <TableCell className="text-xs">
                          {r.is_shared ? <span className="text-green-400">✓</span> : <span className="text-zinc-800">—</span>}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => openReading(r.id)}
                            className="text-[#FF9933] hover:text-[#FFD700] hover:bg-transparent text-xs"
                            data-testid={`admin-reading-view-${r.id}`}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>

          <TabsContent value="scheduler" className="mt-6">
            <SchedulerAdmin />
          </TabsContent>

          <TabsContent value="emails" className="mt-6">
            <div className="space-y-3" data-testid="admin-emails-list">
              {emails.length === 0 && (
                <p className="text-zinc-800 font-body italic text-center py-10">No emails yet.</p>
              )}
              {emails.map((e) => (
                <div key={e.id} className="glass-card p-5" data-testid={`admin-email-${e.kind}`}>
                  <div className="flex items-start justify-between mb-2 gap-3">
                    <div>
                      <div className="font-accent text-[10px] text-[#B8860B] mb-1">{e.kind}</div>
                      <div className="font-heading text-lg text-zinc-50">{e.subject}</div>
                      <div className="text-xs text-zinc-800 font-body">→ {e.to}</div>
                    </div>
                    <div className="text-xs text-zinc-900 font-body whitespace-nowrap">
                      {new Date(e.sent_at).toLocaleString()}
                    </div>
                  </div>
                  <pre className="mt-3 text-xs text-zinc-800 font-body whitespace-pre-wrap bg-[#0A0D14] p-3 rounded border border-[rgba(212,175,55,0.15)]">
                    {e.body}
                  </pre>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Reading detail modal */}
        {readingDetail && (
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setReadingDetail(null)}
            data-testid="admin-reading-modal"
          >
            <div
              className="bg-[#0F1320] border border-[rgba(212,175,55,0.3)] rounded-lg max-w-3xl w-full max-h-[85vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Action bar — not printed */}
              <div className="no-print sticky top-0 z-10 flex items-center justify-end gap-2 px-6 py-3 border-b border-[rgba(212,175,55,0.15)] bg-[#0F1320]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReadingDetail(null)}
                  className="text-zinc-700 hover:text-[#FF9933]"
                  data-testid="admin-reading-close"
                >
                  Close
                </Button>
              </div>

              {/* Printable content */}
              <div ref={printableRef} className="printable-area p-6 md:p-8 relative">
                <img src={snwLogo} alt="" className="print-watermark" />
                <div className="mb-4">
                  <div className="font-accent text-[10px] uppercase tracking-widest mb-1" style={{ color: "#5C3A09" }}>
                    {readingDetail.tier} reading
                  </div>
                  <h3 className="font-heading text-2xl text-zinc-50">
                    {readingDetail.user_name || "Unknown"}{" "}
                    <span className="text-zinc-800 text-base font-body">({readingDetail.user_email || "deleted user"})</span>
                  </h3>
                  <div className="text-xs text-zinc-800 font-body mt-1">
                    {new Date(readingDetail.created_at).toLocaleString()}
                  </div>
                </div>

                {readingDetail.inputs && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 p-4 rounded border border-[rgba(212,175,55,0.15)] bg-[#0A0D14] text-xs font-body">
                    {Object.entries(readingDetail.inputs).map(([k, v]) => (
                      <div key={k}>
                        <div className="font-accent text-[9px] text-zinc-800 uppercase tracking-widest">{k.replace(/_/g, " ")}</div>
                        <div className="text-zinc-200 mt-0.5 break-words">{String(v || "—")}</div>
                      </div>
                    ))}
                  </div>
                )}

                {readingDetail.summary && (
                  <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                    <div>
                      <div className="font-accent text-[10px] text-zinc-800">Ascendant</div>
                      <div className="font-heading text-lg" style={{ color: "#5C3A09", fontWeight: 600 }}>
                        {readingDetail.summary.ascendant || "—"}
                      </div>
                    </div>
                    <div>
                      <div className="font-accent text-[10px] text-zinc-800">Sun</div>
                      <div className="font-heading text-lg" style={{ color: "#8B2500", fontWeight: 600 }}>
                        {readingDetail.summary.sun_sign || "—"}
                      </div>
                    </div>
                    <div>
                      <div className="font-accent text-[10px] text-zinc-800">Moon</div>
                      <div className="font-heading text-lg" style={{ color: "#6B3410", fontWeight: 600 }}>
                        {readingDetail.summary.moon_sign || "—"}
                      </div>
                    </div>
                  </div>
                )}

                {readingDetail.chart && (
                  <div className="glass-card p-5 mb-6">
                    <div className="font-accent text-xs mb-3" style={{ color: "#5C3A09" }}>Lagna Chart · D1</div>
                    <KundaliChart chart={readingDetail.chart} large />
                  </div>
                )}

                {readingDetail.chart?.planets?.length > 0 && (
                  <div className="glass-card p-5 mb-6">
                    <div className="font-accent text-xs mb-3" style={{ color: "#5C3A09" }}>Planetary Positions</div>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[rgba(212,175,55,0.2)]">
                          <TableHead className="text-zinc-700 font-accent text-[10px]">Graha</TableHead>
                          <TableHead className="text-zinc-700 font-accent text-[10px]">Rashi</TableHead>
                          <TableHead className="text-zinc-700 font-accent text-[10px]">°</TableHead>
                          <TableHead className="text-zinc-700 font-accent text-[10px]">House</TableHead>
                          <TableHead className="text-zinc-700 font-accent text-[10px]">Nakshatra</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {readingDetail.chart.planets.map((p) => (
                          <TableRow key={p.code} className="border-[rgba(212,175,55,0.1)]">
                            <TableCell className="font-body text-zinc-100">{p.name}</TableCell>
                            <TableCell className="font-body text-zinc-800">{p.rashi_english}</TableCell>
                            <TableCell className="font-body text-zinc-700">{p.degree}°</TableCell>
                            <TableCell className="font-body" style={{ color: "#5C3A09", fontWeight: 600 }}>{p.house}</TableCell>
                            <TableCell className="font-body" style={{ color: "#6B3410" }}>{p.nakshatra || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div data-testid="admin-reading-advice">
                  {readingDetail.advice
                    ? <AdviceMarkdown>{readingDetail.advice}</AdviceMarkdown>
                    : <span className="text-zinc-800 italic">No advice text recorded.</span>}
                </div>

                {readingDetail.is_shared && readingDetail.share_token && (
                  <div className="no-print mt-6 pt-4 border-t border-[rgba(212,175,55,0.15)] text-sm">
                    <span className="font-accent text-[10px] text-[#B8860B] mr-2">PUBLIC LINK</span>
                    <Link
                      to={`/r/${readingDetail.share_token}`}
                      className="text-[#FF9933] hover:text-[#FFD700] font-body break-all"
                      target="_blank"
                      rel="noopener"
                    >
                      /r/{readingDetail.share_token}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
