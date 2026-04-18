import { useEffect, useState } from "react";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Trash2, Mail, Users as UsersIcon } from "lucide-react";

export default function Admin() {
  const { user, loading } = useAuth();
  const [users, setUsers] = useState([]);
  const [emails, setEmails] = useState([]);
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

  useEffect(() => {
    if (user?.role === "admin") { loadUsers(); loadEmails(); }
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
          <p className="font-accent text-xs text-[#D4AF37] mb-3">Admin</p>
          <h1 className="font-heading text-5xl md:text-6xl text-zinc-50">
            Control <span className="text-gold-gradient italic">panel.</span>
          </h1>
        </div>

        {err && <div className="text-red-400 text-sm mb-4" data-testid="admin-error">{err}</div>}

        <Tabs defaultValue="users" className="w-full" data-testid="admin-tabs">
          <TabsList className="bg-[#121824] border border-[rgba(212,175,55,0.2)]">
            <TabsTrigger value="users" className="data-[state=active]:bg-[rgba(255,153,51,0.15)] data-[state=active]:text-[#FFD700]" data-testid="admin-tab-users">
              <UsersIcon className="h-4 w-4 mr-2" /> Users ({users.length})
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
                    <TableHead className="text-zinc-400 font-accent text-[10px]">Email</TableHead>
                    <TableHead className="text-zinc-400 font-accent text-[10px]">Name</TableHead>
                    <TableHead className="text-zinc-400 font-accent text-[10px]">Tier</TableHead>
                    <TableHead className="text-zinc-400 font-accent text-[10px]">Role</TableHead>
                    <TableHead className="text-zinc-400 font-accent text-[10px]">Provider</TableHead>
                    <TableHead className="text-zinc-400 font-accent text-[10px]">Verified</TableHead>
                    <TableHead className="text-zinc-400 font-accent text-[10px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} className="border-[rgba(212,175,55,0.1)]" data-testid={`admin-user-row-${u.email}`}>
                      <TableCell className="text-zinc-100 font-body">{u.email}</TableCell>
                      <TableCell className="text-zinc-300 font-body">{u.name}</TableCell>
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
                        <span className={u.role === "admin" ? "text-[#FFD700]" : "text-zinc-400"}>{u.role}</span>
                      </TableCell>
                      <TableCell className="text-zinc-400 font-body text-xs">{u.auth_provider}</TableCell>
                      <TableCell className="text-xs">
                        {u.email_verified ? <span className="text-green-400">✓</span> : <span className="text-zinc-500">—</span>}
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

          <TabsContent value="emails" className="mt-6">
            <div className="space-y-3" data-testid="admin-emails-list">
              {emails.length === 0 && (
                <p className="text-zinc-500 font-body italic text-center py-10">No emails yet.</p>
              )}
              {emails.map((e) => (
                <div key={e.id} className="glass-card p-5" data-testid={`admin-email-${e.kind}`}>
                  <div className="flex items-start justify-between mb-2 gap-3">
                    <div>
                      <div className="font-accent text-[10px] text-[#D4AF37] mb-1">{e.kind}</div>
                      <div className="font-heading text-lg text-zinc-50">{e.subject}</div>
                      <div className="text-xs text-zinc-500 font-body">→ {e.to}</div>
                    </div>
                    <div className="text-xs text-zinc-600 font-body whitespace-nowrap">
                      {new Date(e.sent_at).toLocaleString()}
                    </div>
                  </div>
                  <pre className="mt-3 text-xs text-zinc-300 font-body whitespace-pre-wrap bg-[#0A0D14] p-3 rounded border border-[rgba(212,175,55,0.15)]">
                    {e.body}
                  </pre>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
