import { useState, useEffect } from "react";

const STORAGE_KEY = "trading-journal-trades";

const initialForm = {
  date: new Date().toISOString().split("T")[0],
  pair: "",
  direction: "Long",
  session: "New York",
  setup: "Order Block",
  entry: "",
  exit: "",
  size: "",
  pnl: "",
  emotions: "Calm",
  notes: "",
};

const SETUPS = ["Order Block", "Fair Value Gap", "Silver Bullet", "Breaker Block", "Liquidity Sweep", "AMD Model", "Other"];
const SESSIONS = ["London", "New York", "Asian", "London Close", "Other"];
const EMOTIONS = ["Calm", "Confident", "Anxious", "FOMO", "Revenge Trading", "Uncertain"];

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 8,
      padding: "20px 24px",
      flex: 1,
      minWidth: 140,
    }}>
      <div style={{ fontSize: 11, color: "#666", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, fontFamily: "'Space Mono', monospace" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || "#e8e8e8", fontFamily: "'Space Mono', monospace", letterSpacing: -1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#555", marginTop: 4, fontFamily: "'Space Mono', monospace" }}>{sub}</div>}
    </div>
  );
}

function TradeRow({ trade, onSelect }) {
  const pnl = parseFloat(trade.pnl);
  const isWin = pnl > 0;
  return (
    <div
      onClick={() => onSelect(trade)}
      style={{
        display: "grid",
        gridTemplateColumns: "90px 80px 70px 110px 120px 90px 1fr",
        gap: 12,
        padding: "14px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        cursor: "pointer",
        transition: "background 0.15s",
        alignItems: "center",
        fontSize: 13,
        fontFamily: "'Space Mono', monospace",
      }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      <span style={{ color: "#666" }}>{trade.date}</span>
      <span style={{ color: "#e8e8e8", fontWeight: 600 }}>{trade.pair}</span>
      <span style={{
        color: trade.direction === "Long" ? "#00d4a0" : "#ff4d6d",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 1,
      }}>{trade.direction.toUpperCase()}</span>
      <span style={{ color: "#888" }}>{trade.setup}</span>
      <span style={{ color: "#888" }}>{trade.session}</span>
      <span style={{
        color: isWin ? "#00d4a0" : "#ff4d6d",
        fontWeight: 700,
      }}>{isWin ? "+" : ""}{pnl.toFixed(2)}</span>
      <span style={{
        fontSize: 11,
        color: "#555",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>{trade.notes || "—"}</span>
    </div>
  );
}

export default function TradingJournal() {
  const [tab, setTab] = useState("journal");
  const [trades, setTrades] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [weeklyInsight, setWeeklyInsight] = useState("");
  const [weeklyLoading, setWeeklyLoading] = useState(false);

  useEffect(() => {
    const loadTrades = async () => {
      try {
        const result = await window.storage.get(STORAGE_KEY);
        if (result) setTrades(JSON.parse(result.value));
      } catch {}
    };
    loadTrades();
  }, []);

  const saveTrades = async (updated) => {
    try {
      await window.storage.set(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    setTrades(updated);
  };

  const stats = (() => {
    if (!trades.length) return { total: 0, wins: 0, losses: 0, winRate: 0, totalPnl: 0, avgWin: 0, avgLoss: 0 };
    const wins = trades.filter(t => parseFloat(t.pnl) > 0);
    const losses = trades.filter(t => parseFloat(t.pnl) < 0);
    const totalPnl = trades.reduce((s, t) => s + parseFloat(t.pnl || 0), 0);
    const avgWin = wins.length ? wins.reduce((s, t) => s + parseFloat(t.pnl), 0) / wins.length : 0;
    const avgLoss = losses.length ? losses.reduce((s, t) => s + parseFloat(t.pnl), 0) / losses.length : 0;
    return {
      total: trades.length,
      wins: wins.length,
      losses: losses.length,
      winRate: Math.round((wins.length / trades.length) * 100),
      totalPnl,
      avgWin,
      avgLoss,
    };
  })();

  const analyzeWithAI = async (trade) => {
    setLoading(true);
    setAiAnalysis("");
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are an elite ICT (Inner Circle Trader) trading coach. Analyze this trade and give brutally honest, specific feedback.

Trade Details:
- Date: ${trade.date}
- Pair/Instrument: ${trade.pair}
- Direction: ${trade.direction}
- Session: ${trade.session}
- Setup Type: ${trade.setup}
- Entry Price: ${trade.entry}
- Exit Price: ${trade.exit}
- Position Size: ${trade.size}
- P&L: ${trade.pnl}
- Emotional State: ${trade.emotions}
- Notes: ${trade.notes || "None provided"}

Give feedback in this exact format:

⚡ VERDICT
[One sentence: was this a good trade or not, and why]

✅ WHAT YOU DID RIGHT
[2-3 bullet points, be specific]

❌ WHAT WENT WRONG
[2-3 bullet points, be specific — if it was a winning trade, focus on execution flaws or risks taken]

🧠 PSYCHOLOGY CHECK
[1-2 sentences on their emotional state and how it may have affected the trade]

📈 NEXT TIME
[2-3 specific, actionable improvements for the next similar setup]

Be direct. No generic advice. Reference ICT concepts specifically where relevant.`
          }]
        })
      });
      const data = await response.json();
      if (data.error) {
        setAiAnalysis(`Error: ${data.error.message}`);
      } else {
        const text = data.content.map(b => b.text || "").join("\n");
        setAiAnalysis(text);
      }
    } catch (e) {
      setAiAnalysis(`Analysis failed: ${e.message}`);
    }
    setLoading(false);
  };

  const getWeeklyAnalysis = async () => {
    if (trades.length < 2) return;
    setWeeklyLoading(true);
    setWeeklyInsight("");
    try {
      const summary = trades.slice(-20).map(t =>
        `${t.date} | ${t.pair} | ${t.direction} | ${t.setup} | ${t.session} | PnL: ${t.pnl} | Emotion: ${t.emotions}`
      ).join("\n");

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are an elite ICT trading coach. Analyze this trader's recent trade history and give a comprehensive performance review.

Recent Trades:
${summary}

Give your analysis in this format:

📊 PERFORMANCE SUMMARY
[3-4 sentences on overall performance, win rate, and consistency]

🔁 PATTERNS I SEE
[3-4 bullet points on recurring habits — both good and bad. Be specific about setups, sessions, emotions]

⚠️ BIGGEST WEAKNESS
[1-2 sentences on the single most damaging pattern you see]

💪 BIGGEST STRENGTH
[1-2 sentences on what they're doing well]

🎯 THIS WEEK'S FOCUS
[3 specific things to work on — actionable, not generic]

Be direct. Reference ICT concepts. Call out bad habits without sugarcoating.`
          }]
        })
      });
      const data = await response.json();
      if (data.error) {
        setWeeklyInsight(`Error: ${data.error.message}`);
      } else {
        setWeeklyInsight(data.content.map(b => b.text || "").join("\n"));
      }
    } catch (e) {
      setWeeklyInsight(`Analysis failed: ${e.message}`);
    }
    setWeeklyLoading(false);
  };

  const handleSubmit = async () => {
    if (!form.pair || !form.entry || !form.exit || !form.pnl) return;
    const newTrade = { ...form, id: Date.now() };
    const updated = [newTrade, ...trades];
    await saveTrades(updated);
    setSelectedTrade(newTrade);
    setTab("analyze");
    analyzeWithAI(newTrade);
    setForm(initialForm);
  };

  const inputStyle = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 6,
    padding: "10px 14px",
    color: "#e8e8e8",
    fontFamily: "'Space Mono', monospace",
    fontSize: 13,
    width: "100%",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle = {
    fontSize: 10,
    color: "#555",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 6,
    fontFamily: "'Space Mono', monospace",
    display: "block",
  };

  const tabs = ["journal", "log", "analyze", "insights"];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      color: "#e8e8e8",
      fontFamily: "'Space Mono', monospace",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@700;800&display=swap" rel="stylesheet" />

      <div style={{
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "0 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 64,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 32, height: 32,
            background: "linear-gradient(135deg, #00d4a0, #00a0ff)",
            borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16,
          }}>📈</div>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: -0.5 }}>EDGE JOURNAL</div>
            <div style={{ fontSize: 9, color: "#444", letterSpacing: 2 }}>ICT TRADING JOURNAL</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 4 }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: tab === t ? "rgba(0,212,160,0.1)" : "transparent",
              border: tab === t ? "1px solid rgba(0,212,160,0.3)" : "1px solid transparent",
              color: tab === t ? "#00d4a0" : "#555",
              padding: "6px 16px",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 11,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              fontFamily: "'Space Mono', monospace",
              transition: "all 0.15s",
            }}>
              {t === "journal" ? "New Trade" : t === "log" ? "Trade Log" : t === "analyze" ? "AI Analysis" : "Insights"}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        display: "flex", gap: 12, padding: "16px 32px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        overflowX: "auto",
      }}>
        <StatCard label="Total Trades" value={stats.total} />
        <StatCard label="Win Rate" value={`${stats.winRate}%`} color={stats.winRate >= 50 ? "#00d4a0" : "#ff4d6d"} />
        <StatCard label="Total P&L" value={`${stats.totalPnl >= 0 ? "+" : ""}${stats.totalPnl.toFixed(2)}`} color={stats.totalPnl >= 0 ? "#00d4a0" : "#ff4d6d"} />
        <StatCard label="Avg Win" value={`+${stats.avgWin.toFixed(2)}`} color="#00d4a0" />
        <StatCard label="Avg Loss" value={stats.avgLoss.toFixed(2)} color="#ff4d6d" />
      </div>

      <div style={{ padding: "32px", maxWidth: 1100, margin: "0 auto" }}>

        {tab === "journal" && (
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, marginBottom: 6 }}>Log a Trade</div>
            <div style={{ color: "#555", fontSize: 12, marginBottom: 28, letterSpacing: 1 }}>Fill in your trade details — AI will analyze it automatically</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              {[
                { key: "date", label: "Date", type: "date" },
                { key: "pair", label: "Instrument / Pair", type: "text", placeholder: "NQ, ES, EUR/USD..." },
                { key: "entry", label: "Entry Price", type: "number", placeholder: "0.00" },
                { key: "exit", label: "Exit Price", type: "number", placeholder: "0.00" },
                { key: "size", label: "Position Size", type: "number", placeholder: "1" },
                { key: "pnl", label: "P&L ($)", type: "number", placeholder: "+250 or -100" },
              ].map(field => (
                <div key={field.key}>
                  <label style={labelStyle}>{field.label}</label>
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    value={form[field.key]}
                    onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              ))}

              {[
                { key: "direction", label: "Direction", options: ["Long", "Short"] },
                { key: "session", label: "Session", options: SESSIONS },
                { key: "setup", label: "Setup Type", options: SETUPS },
                { key: "emotions", label: "Emotional State", options: EMOTIONS },
              ].map(field => (
                <div key={field.key}>
                  <label style={labelStyle}>{field.label}</label>
                  <select
                    value={form[field.key]}
                    onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                    style={{ ...inputStyle, cursor: "pointer" }}
                  >
                    {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16 }}>
              <label style={labelStyle}>Trade Notes</label>
              <textarea
                placeholder="What was your reasoning? What did you see? Be honest..."
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={4}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>

            <button
              onClick={handleSubmit}
              style={{
                marginTop: 20,
                background: "linear-gradient(135deg, #00d4a0, #00a0ff)",
                border: "none",
                borderRadius: 8,
                padding: "14px 32px",
                color: "#0a0a0a",
                fontFamily: "'Space Mono', monospace",
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: 1.5,
                cursor: "pointer",
                textTransform: "uppercase",
              }}
            >
              Log Trade + Get AI Feedback →
            </button>
          </div>
        )}

        {tab === "log" && (
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, marginBottom: 6 }}>Trade Log</div>
            <div style={{ color: "#555", fontSize: 12, marginBottom: 24, letterSpacing: 1 }}>Click any trade to view AI analysis</div>

            {trades.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#444", fontSize: 13 }}>
                No trades logged yet. Add your first trade.
              </div>
            ) : (
              <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, overflow: "hidden" }}>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "90px 80px 70px 110px 120px 90px 1fr",
                  gap: 12,
                  padding: "10px 20px",
                  background: "rgba(255,255,255,0.03)",
                  fontSize: 10,
                  color: "#444",
                  letterSpacing: 2,
                  textTransform: "uppercase",
                }}>
                  <span>Date</span><span>Pair</span><span>Side</span><span>Setup</span><span>Session</span><span>P&L</span><span>Notes</span>
                </div>
                {trades.map(t => (
                  <TradeRow key={t.id} trade={t} onSelect={(trade) => {
                    setSelectedTrade(trade);
                    setTab("analyze");
                    analyzeWithAI(trade);
                  }} />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "analyze" && (
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, marginBottom: 6 }}>AI Trade Analysis</div>
            <div style={{ color: "#555", fontSize: 12, marginBottom: 24, letterSpacing: 1 }}>Powered by Claude — your personal ICT trading coach</div>

            {!selectedTrade ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#444", fontSize: 13 }}>
                Log a trade or select one from the Trade Log to get analysis.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>
                <div style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 10,
                  padding: 20,
                  height: "fit-content",
                }}>
                  <div style={{ fontSize: 10, color: "#444", letterSpacing: 2, marginBottom: 16, textTransform: "uppercase" }}>Trade Details</div>
                  {[
                    ["Instrument", selectedTrade.pair],
                    ["Direction", selectedTrade.direction],
                    ["Session", selectedTrade.session],
                    ["Setup", selectedTrade.setup],
                    ["Entry", selectedTrade.entry],
                    ["Exit", selectedTrade.exit],
                    ["P&L", `${parseFloat(selectedTrade.pnl) >= 0 ? "+" : ""}${selectedTrade.pnl}`],
                    ["Emotion", selectedTrade.emotions],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 12 }}>
                      <span style={{ color: "#555" }}>{k}</span>
                      <span style={{ color: k === "P&L" ? (parseFloat(selectedTrade.pnl) >= 0 ? "#00d4a0" : "#ff4d6d") : "#e8e8e8", fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>

                <div style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 10,
                  padding: 24,
                  minHeight: 300,
                }}>
                  {loading ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#555", fontSize: 13 }}>
                      <div style={{
                        width: 18, height: 18,
                        border: "2px solid #333",
                        borderTopColor: "#00d4a0",
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                      }} />
                      Analyzing your trade...
                      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                  ) : aiAnalysis ? (
                    <pre style={{
                      whiteSpace: "pre-wrap",
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 13,
                      lineHeight: 1.8,
                      color: "#ccc",
                      margin: 0,
                    }}>{aiAnalysis}</pre>
                  ) : (
                    <div style={{ color: "#444", fontSize: 13 }}>Select a trade to see analysis.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "insights" && (
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, marginBottom: 6 }}>Performance Insights</div>
            <div style={{ color: "#555", fontSize: 12, marginBottom: 24, letterSpacing: 1 }}>AI analysis of your trading patterns over time</div>

            <button
              onClick={getWeeklyAnalysis}
              disabled={trades.length < 2 || weeklyLoading}
              style={{
                background: trades.length < 2 ? "#1a1a1a" : "linear-gradient(135deg, #00d4a0, #00a0ff)",
                border: "none",
                borderRadius: 8,
                padding: "12px 28px",
                color: trades.length < 2 ? "#444" : "#0a0a0a",
                fontFamily: "'Space Mono', monospace",
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: 1.5,
                cursor: trades.length < 2 ? "not-allowed" : "pointer",
                textTransform: "uppercase",
                marginBottom: 24,
              }}
            >
              {weeklyLoading ? "Analyzing..." : trades.length < 2 ? "Need 2+ trades for insights" : "Run Performance Analysis →"}
            </button>

            {weeklyInsight && (
              <div style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                padding: 28,
              }}>
                <pre style={{
                  whiteSpace: "pre-wrap",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 13,
                  lineHeight: 1.9,
                  color: "#ccc",
                  margin: 0,
                }}>{weeklyInsight}</pre>
              </div>
            )}

            {trades.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <div style={{ fontSize: 10, color: "#444", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>Breakdown by Setup</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                  {SETUPS.map(setup => {
                    const setupTrades = trades.filter(t => t.setup === setup);
                    if (!setupTrades.length) return null;
                    const wins = setupTrades.filter(t => parseFloat(t.pnl) > 0).length;
                    const wr = Math.round((wins / setupTrades.length) * 100);
                    return (
                      <div key={setup} style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        borderRadius: 8,
                        padding: "14px 18px",
                        minWidth: 140,
                      }}>
                        <div style={{ fontSize: 11, color: "#e8e8e8", fontWeight: 700, marginBottom: 4 }}>{setup}</div>
                        <div style={{ fontSize: 12, color: wr >= 50 ? "#00d4a0" : "#ff4d6d" }}>{wr}% win rate</div>
                        <div style={{ fontSize: 10, color: "#444" }}>{setupTrades.length} trades</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

    
         
         
         
         
   
           
