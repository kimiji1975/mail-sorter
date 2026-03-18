import { useState, useEffect } from "react";

const SAMPLE_EMAILS = [
  { id: 1, from: "billing@amazon.co.jp", subject: "ご注文の確認 #112-3456789", body: "ご注文いただきありがとうございます。商品の発送準備が整いました。配送予定日は明日です。合計金額: ¥12,800", date: "10:32" },
  { id: 2, from: "team@github.com", subject: "[GitHub] Pull request review requested", body: "田中さんがあなたのレビューをリクエストしました。リポジトリ: myproject/backend PR #245: Fix auth token expiration bug", date: "09:15" },
  { id: 3, from: "newsletter@techcrunch.com", subject: "今週のテックニュース: AIスタートアップ資金調達ラッシュ", body: "今週のハイライト: OpenAIが新モデルを発表、Anthropicが新たな研究を公開、日本のAIスタートアップが50億円調達...", date: "08:00" },
  { id: 4, from: "hr@mycompany.com", subject: "【重要】来月の健康診断のご案内", body: "来月15日に社内健康診断を実施します。予約フォームへの記入をお願いします。締め切りは今月末です。", date: "昨日" },
  { id: 5, from: "support@notion.so", subject: "Notionの新機能をご紹介", body: "AIアシスタント機能がアップデートされました。データベースの自動入力、ページ要約など新しい機能を試してみてください。", date: "昨日" },
  { id: 6, from: "noreply@freee.co.jp", subject: "【freee】確定申告の準備を始めましょう", body: "確定申告シーズンが近づいています。freeeで簡単に申告書類を作成できます。今すぐ始める→", date: "月曜日" },
  { id: 7, from: "alice@friend.com", subject: "今週末のハイキング、行ける？", body: "こんにちは！今週末に高尾山にハイキングに行こうと思ってるんだけど、一緒にどう？お昼ご飯持参で！", date: "月曜日" },
];

const LABEL_CONFIG = [
  { id: "shopping", name: "ショッピング", color: "#f59e0b", bg: "#fef3c7", icon: "🛍️" },
  { id: "work", name: "仕事", color: "#3b82f6", bg: "#dbeafe", icon: "💼" },
  { id: "newsletter", name: "ニュースレター", color: "#8b5cf6", bg: "#ede9fe", icon: "📰" },
  { id: "finance", name: "お金・税金", color: "#10b981", bg: "#d1fae5", icon: "💰" },
  { id: "personal", name: "プライベート", color: "#ec4899", bg: "#fce7f3", icon: "👤" },
  { id: "notification", name: "通知", color: "#6b7280", bg: "#f3f4f6", icon: "🔔" },
];

export default function GmailSorter() {
  const [emails, setEmails] = useState(SAMPLE_EMAILS.map(e => ({ ...e, label: null, sorting: false, sorted: false })));
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [isAutoSorting, setIsAutoSorting] = useState(false);
  const [sortedCount, setSortedCount] = useState(0);
  const [activeLabel, setActiveLabel] = useState("all");
  const [log, setLog] = useState([]);
  const [apiKey, setApiKey] = useState("");
  const [showApiInput, setShowApiInput] = useState(false);

  const getLabelById = (id) => LABEL_CONFIG.find(l => l.id === id);

  const addLog = (msg) => setLog(prev => [{ msg, time: new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) }, ...prev].slice(0, 20));

  const classifyEmail = async (email) => {
    const prompt = `以下のメールを分析して、最も適切なラベルを1つだけ返してください。

ラベルの選択肢:
- shopping: ショッピング・注文・配送関連
- work: 仕事・業務・プロジェクト関連
- newsletter: ニュースレター・メルマガ・お知らせ
- finance: お金・税金・経理・請求関連
- personal: 友人・家族などプライベートのやりとり
- notification: サービスからの通知・アカウント関連

メール情報:
送信者: ${email.from}
件名: ${email.subject}
本文: ${email.body}

ラベルIDのみを返してください（例: shopping）。説明不要。`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 50,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    const text = data.content?.[0]?.text?.trim().toLowerCase() || "notification";
    const valid = LABEL_CONFIG.map(l => l.id);
    return valid.includes(text) ? text : "notification";
  };

  const sortAll = async () => {
    setIsAutoSorting(true);
    setLog([]);
    const unsorted = emails.filter(e => !e.sorted);
    addLog(`🚀 ${unsorted.length}件のメールを分類開始...`);

    for (const email of unsorted) {
      setEmails(prev => prev.map(e => e.id === email.id ? { ...e, sorting: true } : e));
      addLog(`📧 "${email.subject.slice(0, 20)}..." を分析中`);

      try {
        const label = await classifyEmail(email);
        const lbl = getLabelById(label);
        setEmails(prev => prev.map(e => e.id === email.id ? { ...e, label, sorting: false, sorted: true } : e));
        setSortedCount(c => c + 1);
        addLog(`✅ → ${lbl?.icon} ${lbl?.name}`);
      } catch {
        setEmails(prev => prev.map(e => e.id === email.id ? { ...e, label: "notification", sorting: false, sorted: true } : e));
        addLog(`⚠️ 分類失敗 → デフォルトラベル適用`);
      }
      await new Promise(r => setTimeout(r, 400));
    }
    addLog("🎉 すべて完了！");
    setIsAutoSorting(false);
  };

  const reset = () => {
    setEmails(SAMPLE_EMAILS.map(e => ({ ...e, label: null, sorting: false, sorted: false })));
    setSortedCount(0);
    setLog([]);
    setSelectedEmail(null);
  };

  const filteredEmails = activeLabel === "all" ? emails : emails.filter(e => e.label === activeLabel);
  const labelCounts = LABEL_CONFIG.reduce((acc, l) => {
    acc[l.id] = emails.filter(e => e.label === l.id).length;
    return acc;
  }, {});

  return (
    <div style={{ fontFamily: "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', sans-serif", background: "#0f0f13", minHeight: "100vh", color: "#e8e8f0", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&family=Space+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #1a1a24; }
        ::-webkit-scrollbar-thumb { background: #3a3a52; border-radius: 2px; }
        .email-row { transition: background 0.15s; cursor: pointer; }
        .email-row:hover { background: #1e1e2e !important; }
        .label-chip { transition: all 0.2s; cursor: pointer; }
        .label-chip:hover { opacity: 0.85; transform: translateY(-1px); }
        .sort-btn { transition: all 0.2s; }
        .sort-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(99,102,241,0.4); }
        @keyframes pulse-ring { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes slide-in { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
        .log-item { animation: slide-in 0.3s ease; }
        @keyframes spin { to{transform:rotate(360deg)} }
        .spinner { animation: spin 1s linear infinite; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .shimmer { background: linear-gradient(90deg, #1e1e2e 25%, #2a2a3e 50%, #1e1e2e 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
      `}</style>

      {/* Header */}
      <header style={{ background: "#13131a", borderBottom: "1px solid #2a2a3a", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>✉️</div>
          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px" }}>MailSorter AI</div>
            <div style={{ fontSize: 11, color: "#6b6b8a", marginTop: 1 }}>Claude が自動でメールを振り分け</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ fontSize: 12, color: "#6b6b8a", fontFamily: "'Space Mono', monospace" }}>
            {sortedCount}/{emails.length} 件完了
          </div>
          <button onClick={reset} style={{ background: "transparent", border: "1px solid #2a2a3a", color: "#9090b0", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 12 }}>リセット</button>
          <button
            className="sort-btn"
            onClick={sortAll}
            disabled={isAutoSorting || emails.every(e => e.sorted)}
            style={{
              background: isAutoSorting ? "#2a2a3a" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
              border: "none", color: "#fff", borderRadius: 10, padding: "8px 20px",
              cursor: isAutoSorting ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 7, opacity: emails.every(e => e.sorted) ? 0.5 : 1,
            }}
          >
            {isAutoSorting ? (
              <><div className="spinner" style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }} />分類中...</>
            ) : "🤖 AI で自動振り分け"}
          </button>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden", height: "calc(100vh - 65px)" }}>
        {/* Sidebar */}
        <aside style={{ width: 200, background: "#13131a", borderRight: "1px solid #2a2a3a", padding: "16px 12px", overflowY: "auto", flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: "#6b6b8a", fontFamily: "'Space Mono', monospace", marginBottom: 10, paddingLeft: 8, letterSpacing: 1 }}>LABELS</div>
          {[{ id: "all", name: "すべて", icon: "📬", color: "#6366f1", bg: "#1e1e3a" }, ...LABEL_CONFIG].map(label => (
            <div
              key={label.id}
              className="label-chip"
              onClick={() => setActiveLabel(label.id)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 10px", borderRadius: 8, marginBottom: 4, fontSize: 13,
                background: activeLabel === label.id ? "#1e1e3a" : "transparent",
                border: activeLabel === label.id ? "1px solid #6366f1" : "1px solid transparent",
                color: activeLabel === label.id ? "#a5a8ff" : "#8080a0",
              }}
            >
              <span>{label.icon} {label.name}</span>
              <span style={{ fontSize: 11, background: "#2a2a3a", padding: "1px 7px", borderRadius: 10, color: "#6b6b8a", fontFamily: "'Space Mono',monospace" }}>
                {label.id === "all" ? emails.length : (labelCounts[label.id] || 0)}
              </span>
            </div>
          ))}
        </aside>

        {/* Email List */}
        <main style={{ flex: 1, overflowY: "auto", background: "#0f0f13" }}>
          {filteredEmails.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "#4a4a6a", fontSize: 14 }}>
              このラベルにメールはありません
            </div>
          ) : filteredEmails.map((email, i) => {
            const lbl = email.label ? getLabelById(email.label) : null;
            return (
              <div
                key={email.id}
                className="email-row"
                onClick={() => setSelectedEmail(email.id === selectedEmail ? null : email.id)}
                style={{
                  padding: "14px 20px", borderBottom: "1px solid #1a1a24",
                  background: selectedEmail === email.id ? "#1a1a28" : "transparent",
                  borderLeft: selectedEmail === email.id ? "3px solid #6366f1" : "3px solid transparent",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: `hsl(${email.id * 47}, 50%, 30%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, border: "1px solid rgba(255,255,255,0.05)" }}>
                    {email.from[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#d0d0e8" }}>{email.from}</span>
                      <span style={{ fontSize: 11, color: "#4a4a6a", fontFamily: "'Space Mono',monospace", flexShrink: 0, marginLeft: 10 }}>{email.date}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "#b0b0cc", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{email.subject}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {email.sorting ? (
                        <span className="shimmer" style={{ display: "inline-block", width: 80, height: 20, borderRadius: 6 }} />
                      ) : lbl ? (
                        <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 20, background: lbl.bg, color: lbl.color, fontWeight: 500, border: `1px solid ${lbl.color}30` }}>
                          {lbl.icon} {lbl.name}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: "#3a3a5a" }}>未分類</span>
                      )}
                    </div>
                    {selectedEmail === email.id && (
                      <div style={{ marginTop: 10, fontSize: 13, color: "#8080a0", lineHeight: 1.7, padding: "10px 0", borderTop: "1px solid #2a2a3a", animation: "slide-in 0.2s ease" }}>
                        {email.body}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </main>

        {/* Log Panel */}
        <aside style={{ width: 240, background: "#13131a", borderLeft: "1px solid #2a2a3a", padding: 14, overflowY: "auto", flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: "#6b6b8a", fontFamily: "'Space Mono', monospace", marginBottom: 12, letterSpacing: 1 }}>ACTIVITY LOG</div>
          {log.length === 0 ? (
            <div style={{ fontSize: 12, color: "#3a3a5a", textAlign: "center", marginTop: 30 }}>
              AI振り分けを実行すると<br />ここにログが表示されます
            </div>
          ) : log.map((l, i) => (
            <div key={i} className="log-item" style={{ marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid #1e1e2a" }}>
              <div style={{ fontSize: 12, color: "#c0c0d8", lineHeight: 1.5 }}>{l.msg}</div>
              <div style={{ fontSize: 10, color: "#4a4a6a", fontFamily: "'Space Mono',monospace", marginTop: 3 }}>{l.time}</div>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
