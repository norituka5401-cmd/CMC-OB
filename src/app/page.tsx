"use client";
// Last Sync: 2026-02-04 11:32

import { useState, useEffect } from "react";
import { Plus, Trash2, Calendar as CalendarIcon, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  isSameMonth, 
  isSameDay, 
  isToday,
} from "date-fns";
import { ja } from "date-fns/locale";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  // 選択日の型: { date: Date, rawTime: string }
  type SelectedOption = { date: Date; rawTime: string };
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [recentEvents, setRecentEvents] = useState<{id: string, name: string, lastVisit: number}[]>([]);

  useEffect(() => {
    const recent = JSON.parse(localStorage.getItem("recent_events") || "[]");
    setRecentEvents(recent);
  }, []);

  const addLog = (msg: string) => {
    console.log(msg);
    setDebugLogs(prev => [...prev.slice(-10), `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  // 候補日の切り替え
  const toggleDate = (date: Date) => {
    const exists = selectedOptions.some(so => isSameDay(so.date, date));
    if (exists) {
      addLog(`解除: ${format(date, "M/d")}`);
      setSelectedOptions(selectedOptions.filter(so => !isSameDay(so.date, date)));
    } else {
      addLog(`選択: ${format(date, "M/d")}`);
      setSelectedOptions([...selectedOptions, { date, rawTime: "19:00" }].sort((a, b) => a.date.getTime() - b.date.getTime()));
    }
  };

  const updateTime = (index: number, time: string) => {
    const newOptions = [...selectedOptions];
    newOptions[index].rawTime = time;
    setSelectedOptions(newOptions);
  };

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-lg font-bold font-outfit text-slate-200">
          {format(currentMonth, "yyyy年 M月", { locale: ja })}
        </h3>
        <div className="flex gap-1">
          <button type="button" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-400">
            <ChevronLeft size={20} />
          </button>
          <button type="button" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-400">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ["日", "月", "火", "水", "木", "金", "土"];
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map((day, i) => (
          <div key={i} className={`text-center text-[10px] font-bold uppercase ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-slate-500'}`}>
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const d = day;
        const isSelected = selectedOptions.some(so => isSameDay(so.date, d));
        const isCurrentMonth = isSameMonth(d, monthStart);

        days.push(
          <div
            key={d.toString()}
            onClick={() => isCurrentMonth && toggleDate(d)}
            className={`
              relative h-10 flex items-center justify-center text-sm font-medium transition-all rounded-lg m-0.5
              ${!isCurrentMonth ? "text-slate-800 pointer-events-none" : "cursor-pointer hover:bg-white/5 text-slate-300"}
              ${isSelected ? "bg-blue-600 !text-white shadow-lg shadow-blue-500/20 scale-105" : ""}
              ${isToday(d) && !isSelected ? "border border-blue-500/30 text-blue-400" : ""}
            `}
          >
            {format(d, "d")}
            {isSelected && <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-300 rounded-full border border-slate-900" />}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(<div className="grid grid-cols-7" key={day.toString()}>{days}</div>);
      days = [];
    }
    return <div className="p-1">{rows}</div>;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    addLog("--- 送信プロセス開始 ---");
    
    if (!name.trim()) {
      addLog("バリデーション失敗: イベント名が未入力");
      alert("イベント名を入力してください。");
      return;
    }
    if (selectedOptions.length === 0) {
      addLog("バリデーション失敗: 日程が選択されていない");
      alert("カレンダーから候補日を選択してください。");
      return;
    }

    setIsSubmitting(true);
    try {
      addLog(`送信データ確認: 名前="${name}", 候補数=${selectedOptions.length}`);
      
      // Supabase設定の厳格なチェック
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      
      const isConfigured = 
        supabaseUrl.startsWith('https://') && 
        !supabaseUrl.includes('your-project') && 
        !supabaseUrl.includes('placeholder') &&
        supabaseKey.length > 20;

      addLog(`環境判定: ${isConfigured ? "Supabase (DB)" : "LocalStorage (Mock)"}`);

      if (!isConfigured) {
        addLog("【モック】LocalStorageへの保存を開始");
        const { mockStorage } = await import("@/lib/mockStorage");
        
        const event = mockStorage.saveEvent({ name, description });
        addLog(`【モック】イベント作成成功 ID=${event.id}`);
        
        const optionInserts = selectedOptions.map((opt, i) => ({
          event_id: event.id,
          option_text: `${format(opt.date, "M/d(E)", { locale: ja })} ${opt.rawTime}`,
          display_order: i,
        }));
        mockStorage.saveOptions(optionInserts);
        
        addLog("詳細ページへ遷移中...");
        setTimeout(() => {
          router.push(`/event/${event.id}?mock=true`);
        }, 800);
        return;
      }

      // --- Supabase モード ---
      addLog("【DB】Supabase接続中...");
      const { data: event, error: eventError } = await supabase
        .from("events")
        .insert({ name, description })
        .select()
        .single();

      if (eventError) {
        addLog(`【DB】イベント追加エラー: ${eventError.message}`);
        throw eventError;
      }
      addLog(`【DB】イベントDB作成成功 ID=${event.id}`);

      const { error: optionsError } = await supabase
        .from("event_options")
        .insert(selectedOptions.map((opt, i) => ({
          event_id: event.id,
          option_text: `${format(opt.date, "M/d(E)", { locale: ja })} ${opt.rawTime}`,
          display_order: i,
        })));

      if (optionsError) {
        addLog(`【DB】オプション追加エラー: ${optionsError.message}`);
        throw optionsError;
      }
      addLog("【DB】全データ保存完了。遷移します。");

      router.push(`/event/${event.id}`);
    } catch (err: any) {
      addLog(`致命的エラー発生: ${err.message}`);
      console.error("Critical Failure:", err);
      alert("エラーが発生しました: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-32">
      <section className="glass-card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
              <CalendarIcon size={24} />
            </div>
            イベント新規作成
          </h2>
          <button onClick={() => setShowDebug(!showDebug)} className="text-[10px] text-slate-600 hover:text-slate-400 border border-slate-800 px-2 py-1 rounded">
            Monitor {showDebug ? 'ON' : 'OFF'}
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-400">イベント名 *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full input-field py-3 text-lg" placeholder="例: オフィス忘年会" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-400">詳細情報</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full input-field min-h-[100px] py-3 text-sm" placeholder="場所や会費など" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-white/5">
            <div className="space-y-4">
              <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">1. 日程選択</label>
              <div className="bg-[#0f172a]/80 rounded-2xl p-4 border border-white/5 shadow-inner">
                {renderHeader()}
                {renderDays()}
                {renderCells()}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-semibold text-slate-300">2. 時間調整 ({selectedOptions.length})</label>
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar min-h-[100px]">
                {selectedOptions.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.02] p-8 text-center min-h-[250px]">
                    <p className="text-sm text-slate-500">左のカレンダーから<br/>候補を選んでください</p>
                  </div>
                ) : (
                  selectedOptions.map((opt, index) => (
                    <div key={index} className="flex items-center gap-3 bg-white/[0.03] p-3 rounded-xl border border-white/5 group animate-in slide-in-from-right-2 duration-300">
                      <div className="flex-1 text-sm font-bold text-slate-200">
                        {format(opt.date, "M/d(E)", { locale: ja })}
                      </div>
                      <input type="text" value={opt.rawTime} onChange={(e) => updateTime(index, e.target.value)} className="w-20 bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-center font-bold text-blue-400 outline-none focus:border-blue-500 transition-all" />
                      <button type="button" onClick={() => toggleDate(opt.date)} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button type="submit" disabled={isSubmitting || selectedOptions.length === 0} className="w-full btn-primary flex items-center justify-center gap-3 py-4 text-lg font-bold disabled:opacity-30 group relative overflow-hidden">
              {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : "イベントを作成して公開"}
            </button>
          </div>
        </form>
      </section>

      {/* Recent Events Section */}
      {recentEvents.length > 0 && (
        <section className="animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/5" />
            最近表示したイベント
            <div className="h-px flex-1 bg-white/5" />
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentEvents.map((ev) => (
              <button
                key={ev.id}
                onClick={() => router.push(`/event/${ev.id}`)}
                className="glass-card !p-4 flex items-center justify-between group hover:!border-blue-500/50 transition-all text-left"
              >
                <div className="flex flex-col gap-1 overflow-hidden">
                  <span className="font-bold text-slate-200 truncate">{ev.name}</span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(ev.lastVisit).toLocaleDateString()} に表示
                  </span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-500 group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-all">
                  <ChevronRight size={16} />
                </div>
              </button>
            ))}
            {/* Clear Button */}
            <button 
              onClick={() => {
                localStorage.removeItem("recent_events");
                setRecentEvents([]);
              }}
              className="col-span-full mt-2 text-center text-[10px] text-slate-700 hover:text-red-400 transition-colors uppercase font-bold tracking-widest"
            >
              表示履歴をクリア
            </button>
          </div>
        </section>
      )}

      {showDebug && (
        <div className="fixed bottom-6 right-6 w-80 bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-2xl z-50">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2"><div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />System Monitor</h3>
            <button onClick={() => setDebugLogs([])} className="text-[9px] text-slate-600">Clear</button>
          </div>
          <div className="space-y-1 max-h-[150px] overflow-y-auto custom-scrollbar">
            {debugLogs.length === 0 ? <p className="text-[10px] text-slate-600 italic">No events logged.</p> : debugLogs.map((log, i) => (
              <div key={i} className="text-[10px] font-mono text-slate-300 border-b border-white/5 pb-1 last:border-0">
                <span className="text-slate-600 mr-2">{log.split(': ')[0]}</span>
                <span className="text-blue-400">{log.split(': ').slice(1).join(': ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
