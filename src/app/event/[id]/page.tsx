"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { 
  Check, Minus, X, Users, MessageSquare, Trophy, Copy, 
  CheckCircle2, Loader2, Trash2, Settings, AlertTriangle, 
  ArrowLeft, Calendar, Info
} from "lucide-react";

type Event = {
  id: string;
  name: string;
  description: string;
};

type Option = {
  id: string;
  option_text: string;
};

type Response = {
  id: string;
  user_name: string;
  comment: string;
  availability: Availability[];
};

type Availability = {
  option_id: string;
  status: "yes" | "maybe" | "no";
};

export default function EventPage() {
  const { id } = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [options, setOptions] = useState<Option[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [comment, setComment] = useState("");
  const [userAvailability, setUserAvailability] = useState<Record<string, "yes" | "maybe" | "no">>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchEventData();
  }, [id]);

  const fetchEventData = async () => {
    const isMock = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get("mock") === "true";
    
    try {
      if (isMock) {
        const { mockStorage } = await import("@/lib/mockStorage");
        const eventData = mockStorage.getEvent(id as string);
        if (!eventData) throw new Error("Event not found");
        setEvent(eventData);

        const optionsData = mockStorage.getOptions(id as string);
        setOptions(optionsData || []);

        const responsesData = mockStorage.getResponsesWithAvailability(id as string);
        setResponses(responsesData as any || []);

        const initial: Record<string, "yes" | "maybe" | "no"> = {};
        optionsData?.forEach(opt => initial[opt.id] = "yes");
        setUserAvailability(initial);
        return;
      }

      // --- Normal Mode (Supabase) ---
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      const { data: optionsData } = await supabase
        .from("event_options")
        .select("*")
        .eq("event_id", id)
        .order("display_order");
      
      setOptions(optionsData || []);

      const { data: responsesData } = await supabase
        .from("event_responses")
        .select(`
          id,
          user_name,
          comment,
          availability (
            option_id,
            status
          )
        `)
        .eq("event_id", id);
      
      setResponses(responsesData as any || []);

      const initial: Record<string, "yes" | "maybe" | "no"> = {};
      optionsData?.forEach(opt => initial[opt.id] = "yes");
      setUserAvailability(initial);
      
    } catch (err: any) {
      console.error("Fetch error:", err);
      if (err.message === "Failed to fetch") {
        console.warn("Network error detected. If you are using mock mode, ensure ?mock=true is in the URL.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;

    setIsSubmitting(true);
    const isMock = new URLSearchParams(window.location.search).get("mock") === "true";

    try {
      if (isMock) {
        const { mockStorage } = await import("@/lib/mockStorage");
        const availData = Object.entries(userAvailability).map(([option_id, status]) => ({
          option_id,
          status,
        }));
        
        mockStorage.saveResponse({ event_id: id, user_name: userName, comment }, availData);
        
        fetchEventData();
        setUserName("");
        setComment("");
        return;
      }

      // --- Normal Mode (Supabase) ---
      const { data: resp, error: respError } = await supabase
        .from("event_responses")
        .insert({ event_id: id, user_name: userName, comment })
        .select()
        .single();

      if (respError) throw respError;

      const availInserts = Object.entries(userAvailability).map(([option_id, status]) => ({
        response_id: resp.id,
        option_id,
        status,
      }));

      const { error: availError } = await supabase
        .from("availability")
        .insert(availInserts);

      if (availError) throw availError;

      fetchEventData();
      setUserName("");
      setComment("");
    } catch (error: any) {
      console.error("Submit error:", error);
      alert("送信に失敗しました。" + (error.message === "Failed to fetch" ? " (ネットワークエラー)" : ""));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!confirm("このイベントを完全に削除しますか？\n回答データもすべて失われます。")) return;
    
    setIsDeleting(true);
    const isMock = new URLSearchParams(window.location.search).get("mock") === "true";

    try {
      if (isMock) {
        const { mockStorage } = await import("@/lib/mockStorage");
        mockStorage.deleteEvent(id as string);
        router.push("/");
        return;
      }

      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
      router.push("/");
    } catch (error) {
      console.error(error);
      alert("削除に失敗しました。");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteResponse = async (responseId: string, name: string) => {
    if (!confirm(`${name}さんの回答を削除してもよろしいですか？`)) return;

    const isMock = new URLSearchParams(window.location.search).get("mock") === "true";
    try {
      if (isMock) {
        const { mockStorage } = await import("@/lib/mockStorage");
        mockStorage.deleteResponse(responseId);
        fetchEventData();
        return;
      }

      const { error } = await supabase.from("event_responses").delete().eq("id", responseId);
      if (error) throw error;
      fetchEventData();
    } catch (error) {
      console.error(error);
      alert("削除に失敗しました。");
    }
  };

  const stats = useMemo(() => {
    const counts: Record<string, { yes: number, maybe: number }> = {};
    options.forEach(opt => counts[opt.id] = { yes: 0, maybe: 0 });

    responses.forEach(res => {
      res.availability?.forEach(av => {
        if (av.status === 'yes') counts[av.option_id].yes += 1;
        if (av.status === 'maybe') counts[av.option_id].maybe += 1;
      });
    });

    const maxYes = Math.max(...Object.values(counts).map(c => c.yes), 1);
    const winners = Object.entries(counts)
      .filter(([_, c]) => c.yes === maxYes && c.yes > 0)
      .map(([id]) => id);

    return { counts, winners };
  }, [options, responses]);

  if (loading) return <div className="flex flex-col items-center justify-center p-40 gap-4"><Loader2 className="animate-spin text-blue-500" size={40} /><p className="text-slate-500 font-mono text-xs uppercase tracking-widest">Loading data...</p></div>;
  if (!event) return (
    <div className="flex flex-col items-center justify-center p-40 gap-6">
      <AlertTriangle className="text-yellow-500" size={48} />
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">イベントが見つかりません</h2>
        <p className="text-slate-500 text-sm">削除されたか、URLが正しくない可能性があります。</p>
      </div>
      <button onClick={() => router.push("/")} className="btn-primary px-6 py-2 flex items-center gap-2">
        <ArrowLeft size={16} /> トップページへ
      </button>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Navigation Bar */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => router.push("/")}
          className="group flex items-center gap-2 text-sm text-slate-500 hover:text-white transition-all bg-white/[0.03] px-3 py-1.5 rounded-lg border border-white/5"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span>一覧へ戻る</span>
        </button>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowAdminMenu(!showAdminMenu)}
            className={`p-2 rounded-lg transition-all border ${showAdminMenu ? 'bg-blue-500/10 border-blue-500/50 text-blue-400 shadow-lg shadow-blue-500/20' : 'bg-white/[0.03] border-white/5 text-slate-500 hover:text-white'}`}
            title="管理設定"
          >
            <Settings size={20} className={showAdminMenu ? 'animate-spin-slow' : ''} />
          </button>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              setIsCopied(true);
              setTimeout(() => setIsCopied(false), 2000);
            }}
            className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            {isCopied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
            {isCopied ? "URLをコピーしました" : "招待URLをコピー"}
          </button>
        </div>
      </div>

      {/* Admin Menu (Conditional) */}
      {showAdminMenu && (
        <section className="glass-card !border-blue-500/30 bg-blue-500/5 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400">
                <Settings size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">管理者用メニュー</h3>
                <p className="text-[10px] text-slate-500">イベントの編集や削除が行えます</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleDeleteEvent}
                disabled={isDeleting}
                className="flex items-center gap-2 text-xs bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-4 py-2 rounded-lg transition-all border border-red-500/30 font-bold"
              >
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                イベント削除
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Event Header */}
      <section className="glass-card relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:opacity-[0.05] transition-all duration-700">
          <Calendar size={120} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-8 bg-blue-500 rounded-full" />
            <h2 className="text-4xl font-black font-outfit tracking-tight text-white">{event.name}</h2>
          </div>
          <p className="text-slate-400 text-lg leading-relaxed whitespace-pre-wrap max-w-2xl border-l border-white/5 pl-6 mt-4">
            {event.description || "詳細事項はありません。"}
          </p>
        </div>
      </section>

      {/* Aggregation Table */}
      <section className="glass-card overflow-hidden">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Users className="text-blue-400" />
          回答状況
          <span className="text-sm font-normal text-slate-500 ml-2">({responses.length}名回答)</span>
        </h3>
        
        <div className="overflow-x-auto pb-4">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-4 text-left border-b border-slate-700 font-medium text-slate-400 w-40">
                  ユーザー
                </th>
                {options.map((opt) => (
                  <th key={opt.id} className={`p-4 text-center border-b border-slate-700 min-w-[140px] transition-colors ${stats.winners.includes(opt.id) ? 'bg-blue-500/10' : ''}`}>
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-bold">{opt.option_text}</span>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="flex items-center text-xs text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">
                          ◯ {stats.counts[opt.id].yes}
                        </span>
                        <span className="flex items-center text-xs text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded">
                          △ {stats.counts[opt.id].maybe}
                        </span>
                      </div>
                      {stats.winners.includes(opt.id) && (
                        <div className="mt-2 flex items-center gap-1 text-[10px] text-blue-400 font-bold uppercase tracking-wider bg-blue-400/20 px-2 py-0.5 rounded-full">
                          <Trophy size={10} /> Optimum
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {responses.map((res) => (
                <tr key={res.id} className="hover:bg-white/5 transition-colors group/row">
                  <td className="p-4 border-b border-slate-800 relative">
                    <div className="flex flex-col">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">{res.user_name}</span>
                        <button 
                          onClick={() => handleDeleteResponse(res.id, res.user_name)}
                          className="opacity-0 group-hover/row:opacity-100 p-1 text-slate-600 hover:text-red-400 transition-all rounded"
                          title="回答を消去"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {res.comment && (
                        <span className="text-xs text-slate-500 flex items-center gap-1 mt-1 truncate max-w-[140px]" title={res.comment}>
                          <MessageSquare size={10} /> {res.comment}
                        </span>
                      )}
                    </div>
                  </td>
                  {options.map((opt) => {
                    const status = res.availability?.find(a => a.option_id === opt.id)?.status;
                    return (
                      <td key={opt.id} className={`p-4 border-b border-slate-800 text-center ${stats.winners.includes(opt.id) ? 'bg-blue-500/5' : ''}`}>
                        <div className="flex justify-center transition-transform hover:scale-110">
                          {status === 'yes' && <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.1)]"><Check size={20} strokeWidth={4} /></div>}
                          {status === 'maybe' && <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400"><Minus size={20} strokeWidth={4} /></div>}
                          {status === 'no' && <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-bold"><X size={18} strokeWidth={4} /></div>}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {responses.length === 0 && (
                <tr>
                  <td colSpan={options.length + 1} className="p-12 text-center text-slate-500">
                    回答がまだありません。最初の回答者になりましょう！
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Response Form */}
      <section className="glass-card">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <MessageSquare className="text-blue-400" />
          回答を入力する
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">表示名</label>
              <input
                type="text"
                placeholder="お名前（必須）"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full input-field"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">コメント</label>
              <input
                type="text"
                placeholder="任意：一言メッセージなど"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full input-field"
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium text-slate-400">各日程の空き状況</label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {options.map((opt) => (
                <div key={opt.id} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex flex-col gap-3">
                  <span className="font-medium text-sm text-center truncate">{opt.option_text}</span>
                  <div className="flex justify-between gap-2">
                    {[
                      { val: 'yes', icon: <Check size={18} />, label: '◯', color: 'peer-checked:bg-green-500 peer-checked:text-white' },
                      { val: 'maybe', icon: <Minus size={18} />, label: '△', color: 'peer-checked:bg-yellow-500 peer-checked:text-white' },
                      { val: 'no', icon: <X size={18} />, label: '✕', color: 'peer-checked:bg-red-500 peer-checked:text-white' },
                    ].map((btn) => (
                      <label key={btn.val} className="flex-1 cursor-pointer">
                        <input
                          type="radio"
                          name={`opt-${opt.id}`}
                          value={btn.val}
                          checked={userAvailability[opt.id] === btn.val}
                          onChange={() => setUserAvailability({...userAvailability, [opt.id]: btn.val as any})}
                          className="sr-only peer"
                        />
                        <div className={`h-10 flex items-center justify-center rounded-lg bg-slate-700 text-slate-400 transition-all ${btn.color} hover:bg-slate-600`}>
                          {btn.icon}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <button
              type="submit"
              disabled={isSubmitting || !userName.trim()}
              className="w-full btn-primary flex items-center justify-center gap-2 py-3 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : "回答を送信する"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
