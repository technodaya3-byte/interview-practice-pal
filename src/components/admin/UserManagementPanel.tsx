import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search, Download, Ban, CheckCircle, Edit, User as UserIcon,
} from "lucide-react";

type UserProfile = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  address: string | null;
  college: string | null;
  degree: string | null;
  domain: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  is_banned: boolean;
  created_at: string;
};

type Props = {
  sessions: { user_id: string; feedback: any }[];
};

export const UserManagementPanel = ({ sessions }: Props) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("profiles").select("*");
      setUsers((data as unknown as UserProfile[]) || []);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.display_name?.toLowerCase().includes(q) ||
        u.domain?.toLowerCase().includes(q) ||
        u.college?.toLowerCase().includes(q)
    );
  }, [users, search]);

  const getUserStats = (userId: string) => {
    const userSessions = sessions.filter((s) => s.user_id === userId);
    const withScore = userSessions.filter((s) => s.feedback?.overallScore);
    const avg = withScore.length > 0
      ? Math.round(withScore.reduce((a, s) => a + s.feedback.overallScore, 0) / withScore.length)
      : 0;
    return { count: userSessions.length, avg };
  };

  const handleBanToggle = async (user: UserProfile) => {
    const newBanned = !user.is_banned;
    const { error } = await supabase
      .from("profiles")
      .update({ is_banned: newBanned })
      .eq("user_id", user.user_id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setUsers((prev) => prev.map((u) => u.user_id === user.user_id ? { ...u, is_banned: newBanned } : u));
    toast({ title: newBanned ? "User banned" : "User activated" });
  };

  const handleEdit = (user: UserProfile) => {
    setEditUser(user);
    setEditForm({
      display_name: user.display_name || "",
      address: user.address || "",
      college: user.college || "",
      degree: user.degree || "",
      domain: user.domain || "",
      linkedin_url: user.linkedin_url || "",
      github_url: user.github_url || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update(editForm)
      .eq("user_id", editUser.user_id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setUsers((prev) =>
        prev.map((u) => u.user_id === editUser.user_id ? { ...u, ...editForm } as UserProfile : u)
      );
      toast({ title: "Profile updated" });
      setEditUser(null);
    }
    setSaving(false);
  };

  const exportCSV = () => {
    const headers = ["Name", "Domain", "College", "Degree", "Address", "Sessions", "Avg Score", "Status", "Joined"];
    const rows = users.map((u) => {
      const stats = getUserStats(u.user_id);
      return [
        u.display_name || "",
        u.domain || "",
        u.college || "",
        u.degree || "",
        u.address || "",
        stats.count,
        stats.avg,
        u.is_banned ? "Banned" : "Active",
        new Date(u.created_at).toLocaleDateString(),
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users_export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
          <Download size={14} /> Export CSV
        </Button>
      </div>

      <div className="space-y-2">
        {filtered.map((u) => {
          const stats = getUserStats(u.user_id);
          return (
            <div key={u.user_id} className="feedback-card p-4 flex items-center gap-4">
              <Avatar className="w-10 h-10">
                <AvatarImage src={u.avatar_url || undefined} />
                <AvatarFallback className="text-sm bg-primary/10 text-primary">
                  {(u.display_name || "U")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{u.display_name || "Unknown"}</p>
                  {u.is_banned && <Badge variant="destructive" className="text-[10px]">Banned</Badge>}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {[u.domain, u.college].filter(Boolean).join(" · ") || "No details"}
                </p>
              </div>
              <div className="text-right text-xs text-muted-foreground hidden sm:block">
                <p>{stats.count} sessions</p>
                <p>Avg: {stats.avg}/100</p>
              </div>
              <div className="flex gap-1.5">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(u)} className="h-8 w-8">
                  <Edit size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleBanToggle(u)}
                  className={`h-8 w-8 ${u.is_banned ? "text-green-600 hover:text-green-700" : "text-destructive hover:text-destructive"}`}
                >
                  {u.is_banned ? <CheckCircle size={14} /> : <Ban size={14} />}
                </Button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">No users found.</div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserIcon size={16} /> Edit User Profile
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            {[
              { key: "display_name", label: "Display Name" },
              { key: "domain", label: "Domain" },
              { key: "college", label: "College" },
              { key: "degree", label: "Degree" },
              { key: "address", label: "Address" },
              { key: "linkedin_url", label: "LinkedIn URL" },
              { key: "github_url", label: "GitHub URL" },
            ].map(({ key, label }) => (
              <div key={key}>
                <Label className="text-xs mb-1 block">{label}</Label>
                <Input
                  value={(editForm as any)[key] || ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
