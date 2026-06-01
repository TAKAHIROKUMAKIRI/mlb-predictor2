"use client";

import { useEffect, useMemo, useState } from "react";

function strength(teamMetrics: any, pitcherMetrics?: any) {
  if (
    !teamMetrics ||
    teamMetrics.ops === null ||
    teamMetrics.ops === undefined
  ) {
    return 0;
  }

  const offense =
    ((teamMetrics.ops - 0.7) * 170) +
    ((teamMetrics.woba - 0.315) * 260) +
    teamMetrics.wraa * 0.18 +
    teamMetrics.wrc * 0.015;

  const teamPitching = (4.2 - teamMetrics.fip) * 12;

  const defense = teamMetrics.uzr * 0.45;

  // 先発投手補正は強すぎると勝率が極端になるため、控えめに反映
  const starterPitching =
    pitcherMetrics &&
    pitcherMetrics.era !== null &&
    pitcherMetrics.fip !== null &&
    pitcherMetrics.whip !== null &&
    pitcherMetrics.k9 !== null
      ? ((4.2 - pitcherMetrics.era) * 4) +
        ((4.2 - pitcherMetrics.fip) * 3) +
        ((1.3 - pitcherMetrics.whip) * 8) +
        ((pitcherMetrics.k9 - 8.5) * 1)
      : 0;

  return offense + teamPitching + defense + starterPitching;
}

function winProbability(game: any) {
  if (game.status === "FINAL") {
    if (game.awayScore === game.homeScore) return { away: 50, home: 50 };

    return game.awayScore > game.homeScore
      ? { away: 100, home: 0 }
      : { away: 0, home: 100 };
  }

  let away =
  50 +
  strength(
    game.awayMetrics,
    game.awayPitcherMetrics
  ) -
  (
    strength(
      game.homeMetrics,
      game.homePitcherMetrics
    ) + 2.5
  );

  if (game.status === "LIVE") {
    away += ((game.awayScore || 0) - (game.homeScore || 0)) * 16;
  }

  away = Math.round(Math.max(8, Math.min(92, away)));

  return {
    away,
    home: 100 - away,
  };
}

function fmt(v: any) {
  if (v === null || v === undefined || v === "") return "未登録";

  if (typeof v === "number" && v > 0 && v < 1) {
    return v.toFixed(3).replace(/^0/, "");
  }

  if (typeof v === "number") {
    return Number.isInteger(v) ? v : v.toFixed(1);
  }

  return v;
}

function isGood(type: string, v: any) {
  if (v === null || v === undefined) return false;

  if (type === "fip") return v <= 3.8;
  if (type === "uzr") return v >= 0;
  if (type === "ops") return v >= 0.74;
  if (type === "woba") return v >= 0.325;

  return v >= 0;
}

function statusLabel(status: string) {
  if (status === "LIVE") return "速報";
  if (status === "FINAL") return "終了";
  if (status === "SCHEDULED") return "予定";
  return status;
}

function Metric({
  label,
  value,
  type,
}: {
  label: string;
  value: any;
  type: string;
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        color: "#0f172a",
        borderRadius: 14,
        padding: 10,
        border: "1px solid #e2e8f0",
      }}
    >
      <div style={{ color: "#64748b", fontSize: 12 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 800,
          color: isGood(type, value) ? "#047857" : "#0f172a",
        }}
      >
        {fmt(value)}
      </div>
    </div>
  );
}

function TeamBlock({
  side,
  name,
  score,
  probable,
  metrics,
  pitcherMetrics,
  probability,
}: any) {
  return (
    <div
      style={{
        background: "#f8fafc",
        color: "#0f172a",
        border: "1px solid #e2e8f0",
        borderRadius: 22,
        padding: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        <div>
          <div style={{ color: "#64748b", fontSize: 12 }}>
            {side}
          </div>

          <h2
            style={{
              margin: "4px 0 8px",
              fontSize: 22,
              lineHeight: 1.2,
            }}
          >
            {name}
          </h2>

          <div style={{ color: "#475569", fontSize: 14 }}>
            予想先発：<b>{probable || "未発表"}</b>
          </div>

          <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
            指標ソース：2026実データ
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 32, fontWeight: 900 }}>
            {score ?? 0}
          </div>

          <div
            style={{
              display: "inline-block",
              background: "#020617",
              color: "#ffffff",
              borderRadius: 999,
              padding: "5px 10px",
              fontSize: 12,
              fontWeight: 800,
              marginTop: 4,
            }}
          >
            勝率 {probability}%
          </div>
        </div>
      </div>

      <div
        style={{
          height: 10,
          background: "#e2e8f0",
          borderRadius: 999,
          overflow: "hidden",
          margin: "14px 0",
        }}
      >
        <div
          style={{
            width: `${probability}%`,
            background: "#020617",
            height: "100%",
          }}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
        }}
      >
        <Metric label="OPS" value={metrics?.ops} type="ops" />
        <Metric label="wOBA" value={metrics?.woba} type="woba" />
        <Metric label="wRAA" value={metrics?.wraa} type="wraa" />
        <Metric label="wRC" value={metrics?.wrc} type="wrc" />
        <Metric label="FIP" value={metrics?.fip} type="fip" />
        <Metric label="UZR" value={metrics?.uzr} type="uzr" />
      </div>
      <div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 8,
    marginTop: 10,
  }}
>
  <Metric label="SP ERA" value={pitcherMetrics?.era} type="fip" />
  <Metric label="SP FIP" value={pitcherMetrics?.fip} type="fip" />
  <Metric label="WHIP" value={pitcherMetrics?.whip} type="fip" />
  <Metric label="K/9" value={pitcherMetrics?.k9} type="wrc" />
</div>
    </div>
  );
}

export default function Page() {
  const [games, setGames] = useState<any[]>([]);
  const [tab, setTab] = useState("ALL");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");
  const [error, setError] = useState("");

  async function loadGames() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/mlb", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!data.ok && data.error) {
        setError(data.error);
      }

      setGames(data.games || []);
      setLastUpdated(new Date().toLocaleString());
    } catch (e) {
      setError("Vercel APIへの接続に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGames();

    const id = setInterval(loadGames, 60000);

    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return games.filter((g) => {
      const matchTab = tab === "ALL" || g.status === tab;

      const matchQuery =
        !q ||
        `${g.away} ${g.home} ${g.awayProbable} ${g.homeProbable}`
          .toLowerCase()
          .includes(q);

      return matchTab && matchQuery;
    });
  }, [games, tab, query]);

  const liveCount = games.filter((g) => g.status === "LIVE").length;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg,#f1f5f9,#ffffff,#e2e8f0)",
        color: "#0f172a",
        padding: 16,
        fontFamily:
          'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <section
          style={{
            background: "#020617",
            color: "#ffffff",
            borderRadius: 28,
            padding: 24,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 16,
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-block",
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: 999,
                  padding: "7px 12px",
                  fontSize: 14,
                  marginBottom: 12,
                }}
              >
                🏆 MLB Live Predictor
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: "clamp(28px,5vw,52px)",
                  lineHeight: 1.1,
                  letterSpacing: "-0.04em",
                }}
              >
                MLB速報・勝敗確率ダッシュボード
              </h1>

              <p
                style={{
                  color: "#cbd5e1",
                  lineHeight: 1.8,
                  maxWidth: 820,
                }}
              >
                MLB Stats APIから試合速報・予定・予想先発を取得し、
                OPS・wOBA・wRAA・wRC・FIP・UZRを反映した勝敗確率を表示します。
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 8,
              }}
            >
              {[
                ["Games", loading ? "..." : games.length],
                ["Live", liveCount],
                ["Metrics", "DATA"],
                ["Refresh", "60s"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    borderRadius: 16,
                    padding: 12,
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 22, fontWeight: 900 }}>
                    {value}
                  </div>
                  <div style={{ color: "#cbd5e1", fontSize: 12 }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {error && (
          <div
            style={{
              background: "#fff7ed",
              color: "#9a3412",
              borderRadius: 18,
              padding: 14,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <section
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 24,
            padding: 14,
            marginBottom: 16,
            display: "grid",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 8,
            }}
          >
            {[
              ["ALL", "すべて"],
              ["LIVE", "速報"],
              ["SCHEDULED", "予定"],
              ["FINAL", "終了"],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setTab(value)}
                style={{
                  border: "1px solid #e2e8f0",
                  background: tab === value ? "#020617" : "#ffffff",
                  color: tab === value ? "#ffffff" : "#0f172a",
                  borderRadius: 14,
                  padding: "10px 8px",
                  fontWeight: 800,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="チーム名・投手名で検索"
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 14,
              padding: 12,
              fontSize: 16,
              width: "100%",
            }}
          />
        </section>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr)",
            gap: 16,
          }}
        >
          {filtered.length === 0 && (
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 24,
                padding: 20,
              }}
            >
              試合データ取得中、または対象試合がありません。
            </div>
          )}

          {filtered.map((game) => {
            const prob = winProbability(game);

            return (
              <div
                key={game.id}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 28,
                  padding: 18,
                  boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    flexWrap: "wrap",
                    marginBottom: 14,
                  }}
                >
                  <span
                    style={{
                      background: "#020617",
                      color: "#ffffff",
                      borderRadius: 999,
                      padding: "5px 10px",
                      fontSize: 12,
                      fontWeight: 900,
                    }}
                  >
                    {statusLabel(game.status)}
                  </span>

                  <span style={{ color: "#64748b", fontSize: 14 }}>
                    {game.inning || game.detailedStatus || "試合前"}・{game.venue}
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
                    gap: 14,
                  }}
                >
                  <TeamBlock
  side="Away"
  name={game.away}
  score={game.awayScore}
  probable={game.awayProbable}
  metrics={game.awayMetrics}
  pitcherMetrics={game.awayPitcherMetrics}
  probability={prob.away}
/>

                  <TeamBlock
  side="Home"
  name={game.home}
  score={game.homeScore}
  probable={game.homeProbable}
  metrics={game.homeMetrics}
  pitcherMetrics={game.homePitcherMetrics}
  probability={prob.home}
/>
                </div>

                <div
                  style={{
                    background: "#020617",
                    color: "#ffffff",
                    borderRadius: 20,
                    padding: 16,
                    marginTop: 14,
                  }}
                >
                  <div style={{ fontWeight: 800, marginBottom: 8 }}>
                    速報・注目ポイント
                  </div>

                  <ul style={{ color: "#cbd5e1", lineHeight: 1.8, margin: 0 }}>
                    <li>試合状況：{game.detailedStatus}</li>
                    <li>球場：{game.venue}</li>
                    <li>
                      スコア：{game.awayScore} - {game.homeScore}
                    </li>
                  </ul>
                </div>
              </div>
            );
          })}

          <aside
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
              gap: 14,
            }}
          >
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 24,
                padding: 18,
              }}
            >
              <h3>データ状態</h3>
              <p style={{ color: "#64748b", lineHeight: 1.7 }}>
                試合データ：Vercel API → MLB Stats API
                <br />
                詳細指標：2026実データ
                <br />
                最終更新：{lastUpdated || "--"}
              </p>
            </div>

            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 24,
                padding: 18,
              }}
            >
              <h3>指標の見方</h3>
              <p style={{ color: "#64748b", lineHeight: 1.7 }}>
                OPS / wOBA / wRAA / wRC は高いほど良く、
                FIPは低いほど良く、UZRは高いほど守備貢献が高いです。
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
