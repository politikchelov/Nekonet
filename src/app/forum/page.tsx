"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth-store";
import Container from "@/components/container";
import { toast } from "sonner";
import { MessageCircle, Send, Pin, Shield, Crown, Users, Sparkles, Trash2, Flag, RefreshCw } from "lucide-react";

type ForumMessage = {
  id: string;
  user_id: string;
  content: string;
  kind: "message" | "announcement";
  pinned: boolean;
  deleted: boolean;
  created_at: string;
  username?: string;
  avatar_url?: string | null;
  role?: string;
};

const roleNames: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  moderator: "Moderator",
  member: "Участник",
};

const roleColors: Record<string, string> = {
  owner: "text-amber-300 border-amber-400/30 bg-amber-400/10",
  admin: "text-fuchsia-300 border-fuchsia-400/30 bg-fuchsia-400/10",
  moderator: "text-cyan-300 border-cyan-400/30 bg-cyan-400/10",
  member: "text-slate-300 border-white/10 bg-white/5",
};

const HELP = [
  "ОБЫЧНЫЕ КОМАНДЫ",
  "/help — список команд",
  "/me текст — действие от своего имени",
  "/roll — бросить кубик",
  "/coinflip — орёл или решка",
  "/choose вариант 1 | вариант 2 — случайный выбор",
  "/8ball вопрос — магический шар",
  "/shrug — ¯\\_(ツ)_/¯",
  "/tableflip — (╯°□°)╯︵ ┻━┻",
  "/profile ник — открыть профиль",
  "/rules — правила Форума",
  "/report ник причина — пожаловаться на пользователя",
  "",
  "ADMIN / MODERATOR",
  "/ban ник [минуты] причина — заблокировать",
  "/unban ник — снять бан",
  "/mute ник [минуты] причина — ограничить отправку сообщений",
  "/unmute ник — снять мут",
  "/delete id — удалить сообщение",
  "Admin и Owner: /pin id, /unpin id, /announce текст",
  "",
  "OWNER",
  "/role ник admin|moderator|member — выдать роль",
].join("\n");

export default function ForumPage() {
  const { auth } = useAuthStore();
  const router = useRouter();
  const [messages, setMessages] = useState<ForumMessage[]>([]);
  const [role, setRole] = useState("member");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [restriction, setRestriction] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const loadMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from("forum_messages")
      .select("id,user_id,content,kind,pinned,deleted,created_at")
      .eq("deleted", false)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(150);
    if (error) {
      toast.error("Не удалось загрузить Форум: " + error.message);
      setLoading(false);
      return;
    }
    const rows = data || [];
    const ids = [...new Set(rows.map((m) => m.user_id))];
    const [profilesResult, rolesResult] = ids.length
      ? await Promise.all([
          supabase.from("profiles").select("id,username,avatar_url").in("id", ids),
          supabase.from("forum_roles").select("user_id,role").in("user_id", ids),
        ])
      : [{ data: [] as any[] }, { data: [] as any[] }];
    const profiles = new Map((profilesResult.data || []).map((p: any) => [p.id, p]));
    const roles = new Map((rolesResult.data || []).map((r: any) => [r.user_id, r.role]));
    setMessages(rows.map((m) => ({
      ...m,
      username: profiles.get(m.user_id)?.username || "Участник",
      avatar_url: profiles.get(m.user_id)?.avatar_url || null,
      role: roles.get(m.user_id) || "member",
    })));
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (!auth?.id) {
      setLoading(false);
      return;
    }
    let alive = true;
    const init = async () => {
      const [{ data: roleData }, { data: restrictions }] = await Promise.all([
        supabase.from("forum_roles").select("role").eq("user_id", auth.id).maybeSingle(),
        supabase.from("forum_user_restrictions").select("restriction,expires_at")
          .eq("user_id", auth.id).in("restriction", ["ban", "mute"]),
      ]);
      if (!alive) return;
      setRole(roleData?.role || "member");
      const active = (restrictions || []).find((r: any) => !r.expires_at || new Date(r.expires_at).getTime() > Date.now());
      setRestriction(active?.restriction || null);
      await loadMessages();
    };
    init();
    const channel = supabase.channel("miraku-forum-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "forum_messages" }, () => loadMessages())
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [auth?.id, loadMessages, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const runAction = async (args: {
    action: string; target?: string; duration?: number | null; reason?: string; role?: string; messageId?: string; content?: string;
  }) => {
    const { error } = await supabase.rpc("forum_execute_action", {
      p_action: args.action,
      p_target_username: args.target || null,
      p_duration_minutes: args.duration ?? null,
      p_reason: args.reason || null,
      p_role: args.role || null,
      p_message_id: args.messageId || null,
      p_content: args.content || null,
    });
    if (error) throw error;
    await loadMessages();
  };

  const send = async () => {
    const value = draft.trim();
    if (!value || sending) return;
    if (!auth) {
      toast.error("Войди в аккаунт, чтобы писать в Форуме.");
      return;
    }
    if (restriction) {
      toast.error(restriction === "ban" ? "У тебя активна блокировка Форума." : "У тебя активен мут.");
      return;
    }
    setSending(true);
    try {
      if (value.startsWith("/")) {
        const [commandRaw, ...parts] = value.slice(1).split(" ");
        const command = commandRaw.toLowerCase();
        const rest = parts.join(" ").trim();
        const target = parts[0]?.replace(/^@/, "");
        const duration = /^\d+$/.test(parts[1] || "") ? Number(parts[1]) : null;
        const reason = duration === null ? parts.slice(1).join(" ") : parts.slice(2).join(" ");
        const postMessage = async (content: string) => {
          const { error } = await supabase.from("forum_messages").insert({ user_id: auth.id, content });
          if (error) throw error;
        };

        if (command === "help") { setShowHelp(true); setDraft(""); return; }
        if (command === "rules") { toast.info("Уважай участников. Без спама, оскорблений, рекламы и публикации личных данных. Следуй указаниям модерации."); setDraft(""); return; }
        if (command === "profile") {
          if (!target) throw new Error("Укажи ник: /profile ник");
          router.push("/profile/" + encodeURIComponent(target));
          setDraft("");
          return;
        }
        if (command === "me") {
          if (!rest) throw new Error("Напиши действие после /me");
          await postMessage("＊ " + auth.username + " " + rest);
        } else if (command === "roll") {
          await postMessage("🎲 Выпало: " + (Math.floor(Math.random() * 6) + 1));
        } else if (command === "coinflip") {
          await postMessage("🪙 " + (Math.random() < 0.5 ? "Орёл" : "Решка") + "!");
        } else if (command === "choose") {
          const choices = rest.split("|").map((x) => x.trim()).filter(Boolean);
          if (choices.length < 2) throw new Error("Пример: /choose чай | кофе");
          await postMessage("🎯 Мой выбор: " + choices[Math.floor(Math.random() * choices.length)]);
        } else if (command === "8ball") {
          if (!rest) throw new Error("Задай вопрос после /8ball");
          const answers = ["Определённо да ✨", "Похоже на то", "Пока неясно", "Спроси позже", "Скорее нет", "Звёзды говорят: да"];
          await postMessage("🔮 " + answers[Math.floor(Math.random() * answers.length)]);
        } else if (command === "shrug" || command === "tableflip") {
          await postMessage(command === "shrug" ? "¯\\_(ツ)_/¯" : "(╯°□°)╯︵ ┻━┻");
        } else if (command === "report") {
          const reported = parts[0]?.replace(/^@/, "");
          const reportReason = parts.slice(1).join(" ").trim();
          if (!reported || !reportReason) throw new Error("Пример: /report ник причина");
          const { data: profile } = await supabase.from("profiles").select("id").ilike("username", reported).maybeSingle();
          if (!profile) throw new Error("Пользователь не найден");
          const { error } = await supabase.from("forum_reports").insert({ reporter_id: auth.id, reported_user_id: profile.id, reason: reportReason });
          if (error) throw error;
          toast.success("Жалоба отправлена модерации.");
        } else if (["ban", "mute", "unban", "unmute"].includes(command)) {
          if (!target) throw new Error("Укажи ник пользователя.");
          await runAction({ action: command, target, duration, reason });
          toast.success("Команда выполнена.");
        } else if (command === "role") {
          const assignedRole = parts[1];
          if (!target || !["admin", "moderator", "member"].includes(assignedRole)) throw new Error("Пример: /role ник admin|moderator|member");
          await runAction({ action: "role", target, role: assignedRole });
          toast.success("Роль обновлена.");
        } else if (command === "announce") {
          if (!rest) throw new Error("Напиши текст объявления.");
          await runAction({ action: "announce", content: rest });
          toast.success("Объявление опубликовано.");
        } else if (["pin", "unpin", "delete"].includes(command)) {
          const id = parts[0];
          if (!id) throw new Error("Укажи ID сообщения.");
          await runAction({ action: command, messageId: id });
          toast.success("Сообщение обновлено.");
        } else {
          throw new Error("Неизвестная команда. Напиши /help");
        }
        await loadMessages();
        setDraft("");
        return;
      }
      const { error } = await postMessage(value);
      if (error) throw error;
      setDraft("");
      await loadMessages();
    } catch (error: any) {
      toast.error(error?.message || "Не удалось выполнить команду.");
    } finally {
      setSending(false);
    }
  };

  const canModerate = ["owner", "admin", "moderator"].includes(role);
  const canAdmin = ["owner", "admin"].includes(role);

  const messageAction = async (action: "pin" | "unpin" | "delete", id: string) => {
    try {
      await runAction({ action, messageId: id });
      toast.success("Готово.");
    } catch (e: any) {
      toast.error(e?.message || "Не удалось выполнить действие.");
    }
  };

  if (!auth) {
    return (
      <main className="min-h-[75vh] pt-28 pb-16">
        <Container className="max-w-3xl">
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-center shadow-2xl">
            <MessageCircle className="mx-auto mb-4 h-12 w-12 text-cyan-300" />
            <h1 className="text-3xl font-black text-white">Форум Miraku</h1>
            <p className="mt-3 text-slate-400">Общий чат сообщества. Войди в аккаунт, чтобы присоединиться.</p>
            <Link href="/" className="mt-6 inline-flex rounded-xl bg-cyan-500 px-5 py-3 font-bold text-slate-950">На главную</Link>
          </div>
        </Container>
      </main>
    );
  }

  return (
    <main className="min-h-[80vh] pt-24 pb-10">
      <Container className="max-w-5xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3"><MessageCircle className="h-7 w-7 text-cyan-300" /></div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white">Форум</h1>
                <p className="text-sm text-slate-400">Общий чат сообщества Miraku</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-slate-300">
            {role === "owner" ? <Crown className="h-4 w-4 text-amber-300" /> : <Shield className="h-4 w-4 text-cyan-300" />}
            <span>{roleNames[role] || roleNames.member}</span>
            <span className="mx-1 text-slate-600">·</span><Users className="h-4 w-4" />
            <span>{messages.length}</span>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/90 shadow-2xl shadow-black/30">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-indigo-950/70 via-slate-900 to-cyan-950/40 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-bold text-white"><span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" /> Онлайн-обсуждение</div>
            <div className="flex gap-2">
              <button onClick={() => setShowHelp((v) => !v)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10"><Sparkles className="mr-1 inline h-3.5 w-3.5" />Команды</button>
              <button onClick={loadMessages} className="rounded-lg border border-white/10 p-1.5 text-slate-300 hover:bg-white/10" aria-label="Обновить"><RefreshCw className="h-4 w-4" /></button>
            </div>
          </div>

          {showHelp && <pre className="whitespace-pre-wrap border-b border-white/10 bg-slate-900/80 p-4 text-xs leading-6 text-cyan-100">{HELP}</pre>}

          <div className="h-[58vh] min-h-[360px] space-y-3 overflow-y-auto bg-[radial-gradient(ellipse_at_top,rgba(8,145,178,0.08),transparent_55%)] p-4">
            {loading ? <div className="py-20 text-center text-slate-500">Загружаем сообщения…</div> : messages.length === 0 ? (
              <div className="py-20 text-center"><MessageCircle className="mx-auto mb-3 h-9 w-9 text-slate-700" /><p className="text-slate-400">Пока тихо. Начни разговор первым!</p></div>
            ) : messages.map((m) => (
              <article key={m.id} className={`group rounded-2xl border p-3 ${m.kind === "announcement" ? "border-amber-400/30 bg-amber-400/[0.07]" : m.pinned ? "border-cyan-400/30 bg-cyan-400/[0.05]" : "border-white/[0.07] bg-white/[0.025]"}`}>
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-slate-800 text-sm font-black text-cyan-200">
                    {m.avatar_url ? <img src={m.avatar_url} alt="" className="h-full w-full object-cover" /> : (m.username || "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/profile/${encodeURIComponent(m.username || "")}`} className="text-sm font-bold text-white hover:text-cyan-300">{m.username}</Link>
                      <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${roleColors[m.role || "member"]}`}>{roleNames[m.role || "member"]}</span>
                      {m.kind === "announcement" && <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Объявление</span>}
                      {m.pinned && <Pin className="h-3 w-3 text-cyan-300" />}
                      <time className="ml-auto text-[10px] text-slate-500">{new Date(m.created_at).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</time>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-200">{m.content}</p>
                    <div className="mt-2 flex items-center gap-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                      <button onClick={async () => { const reason = window.prompt("Причина жалобы?"); if (!reason?.trim()) return; const { error } = await supabase.from("forum_reports").insert({ reporter_id: auth.id, message_id: m.id, reported_user_id: m.user_id, reason: reason.trim() }); if (error) toast.error(error.message); else toast.success("Жалоба отправлена."); }} className="text-[10px] text-slate-500 hover:text-amber-300"><Flag className="mr-1 inline h-3 w-3" />Пожаловаться</button>
                      {canModerate && <span className="text-[10px] text-slate-700">ID: {m.id}</span>}
                      {canAdmin && <button onClick={() => messageAction(m.pinned ? "unpin" : "pin", m.id)} className="text-[10px] text-cyan-400 hover:text-cyan-200">{m.pinned ? "Открепить" : "Закрепить"}</button>}
                      {canModerate && <button onClick={() => messageAction("delete", m.id)} className="text-[10px] text-rose-400 hover:text-rose-300"><Trash2 className="mr-1 inline h-3 w-3" />Удалить</button>}
                    </div>
                  </div>
                </div>
              </article>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-white/10 bg-slate-900/80 p-3">
            {restriction ? (
              <div className="rounded-xl border border-rose-400/20 bg-rose-400/5 p-3 text-center text-sm text-rose-200">{restriction === "ban" ? "Доступ к Форуму ограничен." : "Отправка сообщений временно ограничена (мут)."}</div>
            ) : (
              <div className="flex items-end gap-2">
                <textarea value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} maxLength={2000} rows={2} placeholder="Напиши сообщение… или /help для команд" className="max-h-36 min-h-[48px] flex-1 resize-y rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/50" />
                <button onClick={send} disabled={sending || !draft.trim()} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-950 shadow-lg shadow-cyan-950/40 transition hover:brightness-110 disabled:opacity-40" aria-label="Отправить"><Send className="h-5 w-5" /></button>
              </div>
            )}
            <p className="mt-2 text-[10px] text-slate-600">Enter — отправить · Shift + Enter — новая строка · до 2000 символов</p>
          </div>
        </div>
      </Container>
    </main>
  );
}
