"use client";

import { useEffect, useMemo, useState } from "react";

const PARK_FACTOR: Record<string, number> = {
  "Coors Field": 8,
  "Great American Ball Park": 4,
  "Yankee Stadium": 3,
  "Fenway Park": 2,

  "Dodger Stadium": -2,
  "T-Mobile Park": -2,
  "Petco Park": -3,
  "Oracle Park": -3,
  "Citi Field": -1,

  "Tropicana Field": -1,
};

const HOME_ADVANTAGE: Record<string, number> = {
  "Coors Field": 3.5,
  "Fenway Park": 3.0,
  "Yankee Stadium": 3.0,
  "Dodger Stadium": 3.0,
  "T-Mobile Park": 3.0,
  "Petco Park": 3.0,

  "Tropicana Field": 2.0,
  "Oakland Coliseum": 2.0,
  "loanDepot park": 2.0,
};

function homeAdvantageFor(venue: string) {
  return HOME_ADVANTAGE[venue] ?? 2.5;
}

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

function recentFormBonus(recentForm: any) {
  if (!recentForm) return 0;

  const score =
    recentForm.wins * 1.5 +
    recentForm.runDiff * 0.05 +
    recentForm.wraa * 0.08;

  return Math.max(-3, Math.min(3, score));
}

function homeAwayBonus(record?: any) {
  if (!record) return 0;
  return record.bonus || 0;
}

function bullpenBonus(
  teamMetrics: any,
  bullpen?: any
) {
  if (!bullpen) return 0;

  let score = 0;

  // 疲労
  score -= bullpen.fatigueScore * 0.6;

  // ERA
  if (bullpen.era <= 3.50) score += 3;
  else if (bullpen.era <= 4.20) score += 1;
  else if (bullpen.era >= 5.50) score -= 3;

  // WHIP
  if (bullpen.whip <= 1.20) score += 2;
  else if (bullpen.whip >= 1.40) score -= 2;

  return Math.max(-8, Math.min(8, score));
}

function matchupBonus(game: any) {
  const a = game.awayMetrics;
  const h = game.homeMetrics;

  if (!a || !h) return 0;
  if (a.ops == null || a.wrc == null || a.wraa == null) return 0;
  if (h.ops == null || h.wrc == null || h.wraa == null) return 0;

  const awayScore =
    a.wrc * 0.03 +
    a.wraa * 0.04 +
    a.ops * 20;

  const homeScore =
    h.wrc * 0.03 +
    h.wraa * 0.04 +
    h.ops * 20;

  const diff = awayScore - homeScore;

  return Math.max(-3, Math.min(3, diff * 0.25));
}

function predictionReasons(game: any) {
  const reasons: string[] = [];

  const awaySP = game.awayPitcherMetrics;
  const homeSP = game.homePitcherMetrics;

  if (awaySP?.era != null && homeSP?.era != null) {
    if (awaySP.era + 0.5 < homeSP.era) {
      reasons.push(`${game.away}：先発ERAで優位`);
    } else if (homeSP.era + 0.5 < awaySP.era) {
      reasons.push(`${game.home}：先発ERAで優位`);
    }
  }

  if (awaySP?.fip != null && homeSP?.fip != null) {
    if (awaySP.fip + 0.4 < homeSP.fip) {
      reasons.push(`${game.away}：先発FIPで優位`);
    } else if (homeSP.fip + 0.4 < awaySP.fip) {
      reasons.push(`${game.home}：先発FIPで優位`);
    }
  }

  if (game.awayRecentForm?.wins > game.homeRecentForm?.wins) {
    reasons.push(`${game.away}：直近5試合の勝数で優位`);
  } else if (game.homeRecentForm?.wins > game.awayRecentForm?.wins) {
    reasons.push(`${game.home}：直近5試合の勝数で優位`);
  }

  if (game.awayMetrics?.wrc > game.homeMetrics?.wrc + 8) {
    reasons.push(`${game.away}：打線指標wRCで優位`);
  } else if (game.homeMetrics?.wrc > game.awayMetrics?.wrc + 8) {
    reasons.push(`${game.home}：打線指標wRCで優位`);
  }

  if (game.awayMetrics?.uzr > game.homeMetrics?.uzr + 3) {
    reasons.push(`${game.away}：守備UZRで優位`);
  } else if (game.homeMetrics?.uzr > game.awayMetrics?.uzr + 3) {
    reasons.push(`${game.home}：守備UZRで優位`);
  }

  if (game.headToHead?.awayWins > game.headToHead?.homeWins) {
    reasons.push(`${game.away}：今季対戦成績で優位`);
  } else if (game.headToHead?.homeWins > game.headToHead?.awayWins) {
    reasons.push(`${game.home}：今季対戦成績で優位`);
  }

  if (reasons.length === 0) {
    reasons.push("両チームの指標差が小さく、接戦寄り");
  }

  return reasons.slice(0, 5);
}

function confidenceLabel(prob: { away: number; home: number }) {
  const maxProb = Math.max(prob.away, prob.home);

  if (maxProb >= 75) {
    return "★★★★★ 本命";
  }

  if (maxProb >= 65) {
    return "★★★★☆ やや有力";
  }

  if (maxProb >= 57) {
    return "★★★☆☆ 優勢";
  }

  if (maxProb >= 52) {
    return "★★☆☆☆ 接戦";
  }

  return "★☆☆☆☆ 荒れやすい";
}

function winProbability(game: any) {
  if (game.status === "FINAL") {
    if (game.awayScore === game.homeScore) return { away: 50, home: 50 };

    return game.awayScore > game.homeScore
      ? { away: 100, home: 0 }
      : { away: 0, home: 100 };
  }

  const parkAdjustment = PARK_FACTOR[game.venue] || 0;
  const homeAdv = homeAdvantageFor(game.venue) || 2.5;

  let away =
  50 +
  (strength(game.awayMetrics, game.awayPitcherMetrics) || 0) +
  (recentFormBonus(game.awayRecentForm) || 0) +
  (homeAwayBonus(game.awayRoadRecord) || 0) +
  (bullpenBonus(game.awayMetrics, game.awayBullpen) || 0) +
  (matchupBonus(game) || 0) +
  (game.headToHead?.bonus || 0) -
    (game.awayRecentPitcherForm?.bonus ?? 0)+
  (
    (strength(game.homeMetrics, game.homePitcherMetrics) || 0) +
    (recentFormBonus(game.homeRecentForm) || 0) +
    (homeAwayBonus(game.homeHomeRecord) || 0) +
    (bullpenBonus(game.homeMetrics, game.homeBullpen) || 0) +
(game.homeRecentPitcherForm?.bonus ?? 0)+
    homeAdv
  );

  away -= parkAdjustment;

  if (game.status === "LIVE") {
    const awayScore = game.awayScore || 0;
    const homeScore = game.homeScore || 0;
    const scoreDiff = awayScore - homeScore;

    const inningText = String(game.inning || "");
    const inningNumber = Number(inningText.replace(/[^0-9]/g, "")) || 1;

    const lateGameMultiplier =
      inningNumber >= 8 ? 28 :
      inningNumber >= 6 ? 22 :
      inningNumber >= 4 ? 18 :
      14;

    away += scoreDiff * lateGameMultiplier;

    if (inningNumber >= 7 && scoreDiff > 0) away += 4;
    if (inningNumber >= 7 && scoreDiff < 0) away -= 4;
    if (inningNumber >= 9 && scoreDiff > 0) away += 8;
    if (inningNumber >= 9 && scoreDiff < 0) away -= 8;
  }

  if (!Number.isFinite(away)) {
    away = 50;
  }

  away = Math.round(Math.max(3, Math.min(97, away)));

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

const TEAM_LOGOS: Record<string, string> = {
  "Arizona Diamondbacks": "https://www.mlbstatic.com/team-logos/109.svg",
  "Athletics": "https://www.mlbstatic.com/team-logos/133.svg",
  "Atlanta Braves": "https://www.mlbstatic.com/team-logos/144.svg",
  "Baltimore Orioles": "https://www.mlbstatic.com/team-logos/110.svg",
  "Boston Red Sox": "https://www.mlbstatic.com/team-logos/111.svg",
  "Chicago Cubs": "https://www.mlbstatic.com/team-logos/112.svg",
  "Chicago White Sox": "https://www.mlbstatic.com/team-logos/145.svg",
  "Cincinnati Reds": "https://www.mlbstatic.com/team-logos/113.svg",
  "Cleveland Guardians": "https://www.mlbstatic.com/team-logos/114.svg",
  "Colorado Rockies": "https://www.mlbstatic.com/team-logos/115.svg",
  "Detroit Tigers": "https://www.mlbstatic.com/team-logos/116.svg",
  "Houston Astros": "https://www.mlbstatic.com/team-logos/117.svg",
  "Kansas City Royals": "https://www.mlbstatic.com/team-logos/118.svg",
  "Los Angeles Angels": "https://www.mlbstatic.com/team-logos/108.svg",
  "Los Angeles Dodgers": "https://www.mlbstatic.com/team-logos/119.svg",
  "Miami Marlins": "https://www.mlbstatic.com/team-logos/146.svg",
  "Milwaukee Brewers": "https://www.mlbstatic.com/team-logos/158.svg",
  "Minnesota Twins": "https://www.mlbstatic.com/team-logos/142.svg",
  "New York Mets": "https://www.mlbstatic.com/team-logos/121.svg",
  "New York Yankees": "https://www.mlbstatic.com/team-logos/147.svg",
  "Philadelphia Phillies": "https://www.mlbstatic.com/team-logos/143.svg",
  "Pittsburgh Pirates": "https://www.mlbstatic.com/team-logos/134.svg",
  "San Diego Padres": "https://www.mlbstatic.com/team-logos/135.svg",
  "San Francisco Giants": "https://www.mlbstatic.com/team-logos/137.svg",
  "Seattle Mariners": "https://www.mlbstatic.com/team-logos/136.svg",
  "St. Louis Cardinals": "https://www.mlbstatic.com/team-logos/138.svg",
  "Tampa Bay Rays": "https://www.mlbstatic.com/team-logos/139.svg",
  "Texas Rangers": "https://www.mlbstatic.com/team-logos/140.svg",
  "Toronto Blue Jays": "https://www.mlbstatic.com/team-logos/141.svg",
  "Washington Nationals": "https://www.mlbstatic.com/team-logos/120.svg",
};

function teamLogo(team: string) {
  return TEAM_LOGOS[team] || "";
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
  bullpen,
  recentForm,
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

<div
  style={{
    display: "flex",
    alignItems: "center",
    gap: 10,
    margin: "4px 0 8px",
  }}
>
  {teamLogo(name) && (
    <img
      src={teamLogo(name)}
      alt={name}
      style={{
        width: 34,
        height: 34,
        objectFit: "contain",
      }}
    />
  )}

  <h2
    style={{
      margin: 0,
      fontSize: 22,
      lineHeight: 1.2,
    }}
  >
    {name}
  </h2>
</div>

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

<div
  style={{
    marginTop: 10,
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.6,
  }}
>
  ブルペン直近3日：
登板 {bullpen.appearances}人 /
投球数 {bullpen.pitches}球 /
疲労 {bullpen.fatigueScore}

ERA {bullpen.era}
WHIP {bullpen.whip}
</div>

<div
  style={{
    fontSize: 12,
    color: "#64748b",
    marginTop: 6,
  }}
>
  直近5試合：
{recentForm?.wins ?? 0}勝 -
{recentForm?.losses ?? 0}敗
 / 相手強度 {recentForm?.opponentStrength ?? 0}
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
const reasons = predictionReasons(game);
          const confidence = confidenceLabel(prob);

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
  bullpen={game.awayBullpen}
  recentForm={game.awayRecentForm}
  probability={prob.away}
/>

                  <TeamBlock
  side="Home"
  name={game.home}
  score={game.homeScore}
  probable={game.homeProbable}
  metrics={game.homeMetrics}
  pitcherMetrics={game.homePitcherMetrics}
  bullpen={game.homeBullpen}
  recentForm={game.homeRecentForm}
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

                    <li>信頼度：{confidence}</li>
                    
  <li>
    今季対戦成績：
    {game.away} {game.headToHead?.awayWins ?? 0}勝 -
    {game.home} {game.headToHead?.homeWins ?? 0}勝
  </li>

                    <li>
  ホーム/アウェイ成績：
  {game.away} away {game.awayRoadRecord?.wins ?? 0}勝-
  {game.awayRoadRecord?.losses ?? 0}敗 /
  {game.home} home {game.homeHomeRecord?.wins ?? 0}勝-
  {game.homeHomeRecord?.losses ?? 0}敗
</li>
                    
  <li>
    予想根拠：
    <ul>
      {reasons.map((reason, idx) => (
        <li key={idx}>{reason}</li>
      ))}
    </ul>
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
