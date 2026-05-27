"use client";

import { useEffect, useMemo, useState } from "react";

function strength(m: any) {
  if (!m || m.ops == null) return 0;

  return (
    ((m.ops - 0.7) * 170) +
    ((m.woba - 0.315) * 260) +
    (m.wraa * 0.18) +
    (m.wrc * 0.015) +
    ((4.2 - m.fip) * 12) +
    (m.uzr * 0.45)
  );
}

function winProbability(game: any) {
  let away =
    50 +
    strength(game.awayMetrics) -
    (strength(game.homeMetrics) + 2.5);

  away = Math.round(Math.max(8, Math.min(92, away)));

  return {
    away,
    home: 100 - away,
  };
}

function fmt(v: any) {
  if (v === null || v === undefined) return "未登録";

  if (typeof v === "number" && v > 0 && v < 1) {
    return v.toFixed(3).replace(/^0/, "");
  }

  if (typeof v === "number") {
    return Number.isInteger(v) ? v : v.toFixed(1);
  }

  return v;
}

const TEAM_METRICS: Record<string, any> = {
  "Los Angeles Dodgers": {
    ops: 0.781,
    woba: 0.348,
    wraa: 42.5,
    wrc: 129,
    fip: 3.58,
    uzr: 3.4,
  },

  "New York Yankees": {
    ops: 0.761,
    woba: 0.336,
    wraa: 28.4,
    wrc: 122,
    fip: 3.74,
    uzr: 5.8,
  },

  "Chicago Cubs": {
    ops: 0.731,
    woba: 0.320,
    wraa: 4.5,
    wrc: 102,
    fip: 3.9,
    uzr: 0.8,
  },

  "Pittsburgh Pirates": {
    ops: 0.676,
    woba: 0.298,
    wraa: -17.8,
    wrc: 86,
    fip: 4.16,
    uzr: -1.4,
  },

  "Cleveland Guardians": {
    ops: 0.726,
    woba: 0.319,
    wraa: 2.8,
    wrc: 101,
    fip: 3.67,
    uzr: 7.2,
  },

  "Toronto Blue Jays": {
    ops: 0.714,
    woba: 0.315,
    wraa: -0.8,
    wrc: 99,
    fip: 4.07,
    uzr: 2.9,
  },
};

function metricsFor(team: string) {
  return (
    TEAM_METRICS[team] || {
      ops: null,
      woba: null,
      wraa: null,
      wrc: null,
      fip: null,
      uzr: null,
    }
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: any;
}) {
  return (
    <div
      style={{
        background: "#0f172a",
        borderRadius: 14,
        padding: 12,
      }}
    >
      <div
        style={{
          color: "#94a3b8",
          fontSize: 12,
          marginBottom: 4,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
        }}
      >
        {fmt(value)}
      </div>
    </div>
  );
}

export default function Page() {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGames();

    const id = setInterval(loadGames, 60000);

    return () => clearInterval(id);
  }, []);

  async function loadGames() {
    try {
      const res = await fetch("/api/mlb");

      const data = await res.json();

      const mapped =
        data.games?.map((g: any) => ({
          ...g,
          awayMetrics: metricsFor(g.away),
          homeMetrics: metricsFor(g.home),
        })) || [];

      setGames(mapped);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const liveGames = useMemo(
    () => games.filter((g) => g.status.includes("In Progress")),
    [games]
  );

  return (
    <main
      style={{
        background: "#020617",
        minHeight: "100vh",
        color: "white",
        padding: 20,
        fontFamily: "sans-serif",
      }}
    >
      <h1
        style={{
          fontSize: 42,
          marginBottom: 24,
        }}
      >
        MLB速報・勝敗確率
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: "#111827",
            padding: 20,
            borderRadius: 20,
          }}
        >
          <div style={{ color: "#94a3b8" }}>Games</div>
          <div style={{ fontSize: 36, fontWeight: 700 }}>
            {loading ? "--" : games.length}
          </div>
        </div>

        <div
          style={{
            background: "#111827",
            padding: 20,
            borderRadius: 20,
          }}
        >
          <div style={{ color: "#94a3b8" }}>Live</div>
          <div style={{ fontSize: 36, fontWeight: 700 }}>
            {liveGames.length}
          </div>
        </div>
      </div>

      {games.map((g) => {
        const prob = winProbability(g);

        return (
          <div
            key={g.id}
            style={{
              background: "#0f172a",
              borderRadius: 24,
              padding: 24,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 20,
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    color: "#94a3b8",
                    marginBottom: 8,
                  }}
                >
                  Away
                </div>

                <h2>{g.away}</h2>

                <div style={{ marginBottom: 8 }}>
                  予想先発: {g.awayProbable}
                </div>

                <div
                  style={{
                    background: "#1e293b",
                    height: 10,
                    borderRadius: 999,
                    overflow: "hidden",
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      width: `${prob.away}%`,
                      background: "#3b82f6",
                      height: "100%",
                    }}
                  />
                </div>

                <div
                  style={{
                    marginBottom: 12,
                    fontWeight: 700,
                  }}
                >
                  勝率 {prob.away}%
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit,minmax(120px,1fr))",
                    gap: 10,
                  }}
                >
                  <Metric
                    label="OPS"
                    value={g.awayMetrics.ops}
                  />

                  <Metric
                    label="wOBA"
                    value={g.awayMetrics.woba}
                  />

                  <Metric
                    label="wRAA"
                    value={g.awayMetrics.wraa}
                  />

                  <Metric
                    label="wRC"
                    value={g.awayMetrics.wrc}
                  />

                  <Metric
                    label="FIP"
                    value={g.awayMetrics.fip}
                  />

                  <Metric
                    label="UZR"
                    value={g.awayMetrics.uzr}
                  />
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <div
                  style={{
                    color: "#94a3b8",
                    marginBottom: 8,
                  }}
                >
                  Home
                </div>

                <h2>{g.home}</h2>

                <div style={{ marginBottom: 8 }}>
                  予想先発: {g.homeProbable}
                </div>

                <div
                  style={{
                    background: "#1e293b",
                    height: 10,
                    borderRadius: 999,
                    overflow: "hidden",
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      width: `${prob.home}%`,
                      background: "#22c55e",
                      height: "100%",
                    }}
                  />
                </div>

                <div
                  style={{
                    marginBottom: 12,
                    fontWeight: 700,
                  }}
                >
                  勝率 {prob.home}%
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit,minmax(120px,1fr))",
                    gap: 10,
                  }}
                >
                  <Metric
                    label="OPS"
                    value={g.homeMetrics.ops}
                  />

                  <Metric
                    label="wOBA"
                    value={g.homeMetrics.woba}
                  />

                  <Metric
                    label="wRAA"
                    value={g.homeMetrics.wraa}
                  />

                  <Metric
                    label="wRC"
                    value={g.homeMetrics.wrc}
                  />

                  <Metric
                    label="FIP"
                    value={g.homeMetrics.fip}
                  />

                  <Metric
                    label="UZR"
                    value={g.homeMetrics.uzr}
                  />
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 24,
                background: "#020617",
                borderRadius: 16,
                padding: 16,
              }}
            >
              <div
                style={{
                  marginBottom: 8,
                  fontWeight: 700,
                }}
              >
                速報・注目ポイント
              </div>

              <div>ステータス: {g.status}</div>
              <div>球場: {g.venue}</div>
              <div>
                スコア: {g.awayScore} - {g.homeScore}
              </div>
            </div>
          </div>
        );
      })}
    </main>
  );
}
