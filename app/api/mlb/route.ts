import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TEAM_METRICS: Record<string, any> = {
  "Arizona Diamondbacks": { ops: 0.740, woba: 0.326, wraa: 9.6, wrc: 106, fip: 4.18, uzr: 1.3 },
  "Athletics": { ops: 0.698, woba: 0.307, wraa: -8.8, wrc: 93, fip: 4.36, uzr: -2.6 },
  "Atlanta Braves": { ops: 0.773, woba: 0.341, wraa: 31.8, wrc: 126, fip: 3.49, uzr: 4.1 },
  "Baltimore Orioles": { ops: 0.768, woba: 0.339, wraa: 30.2, wrc: 124, fip: 3.71, uzr: 6.1 },
  "Boston Red Sox": { ops: 0.742, woba: 0.325, wraa: 10.2, wrc: 108, fip: 4.01, uzr: -1.2 },
  "Chicago Cubs": { ops: 0.731, woba: 0.320, wraa: 4.5, wrc: 102, fip: 3.93, uzr: 0.8 },
  "Chicago White Sox": { ops: 0.631, woba: 0.279, wraa: -35.2, wrc: 75, fip: 4.72, uzr: -6.4 },
  "Cincinnati Reds": { ops: 0.711, woba: 0.313, wraa: -2.9, wrc: 96, fip: 4.05, uzr: 2.1 },
  "Cleveland Guardians": { ops: 0.726, woba: 0.319, wraa: 2.8, wrc: 101, fip: 3.67, uzr: 7.2 },
  "Colorado Rockies": { ops: 0.700, woba: 0.309, wraa: -6.5, wrc: 91, fip: 4.85, uzr: -5.0 },
  "Detroit Tigers": { ops: 0.706, woba: 0.311, wraa: -4.1, wrc: 96, fip: 3.88, uzr: 3.2 },
  "Houston Astros": { ops: 0.755, woba: 0.332, wraa: 20.1, wrc: 116, fip: 3.62, uzr: 3.9 },
  "Kansas City Royals": { ops: 0.724, woba: 0.318, wraa: 1.6, wrc: 100, fip: 3.95, uzr: 5.5 },
  "Los Angeles Angels": { ops: 0.687, woba: 0.301, wraa: -15.1, wrc: 88, fip: 4.54, uzr: -4.7 },
  "Los Angeles Dodgers": { ops: 0.781, woba: 0.348, wraa: 42.5, wrc: 129, fip: 3.58, uzr: 3.4 },
  "Miami Marlins": { ops: 0.672, woba: 0.296, wraa: -20.4, wrc: 84, fip: 4.28, uzr: -1.9 },
  "Milwaukee Brewers": { ops: 0.734, woba: 0.322, wraa: 6.8, wrc: 105, fip: 3.83, uzr: 4.8 },
  "Minnesota Twins": { ops: 0.728, woba: 0.320, wraa: 3.9, wrc: 102, fip: 4.02, uzr: 1.7 },
  "New York Mets": { ops: 0.734, woba: 0.321, wraa: 6.2, wrc: 104, fip: 3.89, uzr: -0.9 },
  "New York Yankees": { ops: 0.761, woba: 0.336, wraa: 28.4, wrc: 122, fip: 3.74, uzr: 5.8 },
  "Philadelphia Phillies": { ops: 0.759, woba: 0.334, wraa: 22.4, wrc: 118, fip: 3.69, uzr: 1.1 },
  "Pittsburgh Pirates": { ops: 0.676, woba: 0.298, wraa: -17.8, wrc: 86, fip: 4.16, uzr: -1.4 },
  "San Diego Padres": { ops: 0.748, woba: 0.329, wraa: 15.6, wrc: 111, fip: 3.81, uzr: 2.7 },
  "San Francisco Giants": { ops: 0.711, woba: 0.314, wraa: -2.1, wrc: 97, fip: 4.12, uzr: 1.6 },
  "Seattle Mariners": { ops: 0.714, woba: 0.316, wraa: -1.2, wrc: 99, fip: 3.54, uzr: 8.4 },
  "St. Louis Cardinals": { ops: 0.705, woba: 0.310, wraa: -4.6, wrc: 95, fip: 4.09, uzr: 0.4 },
  "Tampa Bay Rays": { ops: 0.703, woba: 0.309, wraa: -5.4, wrc: 95, fip: 4.03, uzr: 2.4 },
  "Texas Rangers": { ops: 0.725, woba: 0.319, wraa: 2.1, wrc: 101, fip: 4.20, uzr: -0.6 },
  "Toronto Blue Jays": { ops: 0.714, woba: 0.315, wraa: -0.8, wrc: 99, fip: 4.07, uzr: 2.9 },
  "Washington Nationals": { ops: 0.684, woba: 0.298, wraa: -18.4, wrc: 88, fip: 4.42, uzr: -3.3 },
};

function metricsFor(team: string) {
  return TEAM_METRICS[team] || {
    ops: null,
    woba: null,
    wraa: null,
    wrc: null,
    fip: null,
    uzr: null,
  };
}

function easternDate(offset = 0) {
  const now = new Date();

  const et = new Date(
    now.toLocaleString("en-US", {
      timeZone: "America/New_York",
    })
  );

  et.setDate(et.getDate() + offset);

  const y = et.getFullYear();
  const m = String(et.getMonth() + 1).padStart(2, "0");
  const d = String(et.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function normalizeGame(g: any, date: string) {
  const away = g.teams?.away?.team?.name || "Away";
  const home = g.teams?.home?.team?.name || "Home";

  const abstract = g.status?.abstractGameState || "Preview";

  const status =
    abstract === "Live"
      ? "LIVE"
      : abstract === "Final"
        ? "FINAL"
        : "SCHEDULED";

  return {
    id: g.gamePk,
    date,
    away,
    home,
    awayScore: g.teams?.away?.score ?? 0,
    homeScore: g.teams?.home?.score ?? 0,
    status,
    detailedStatus: g.status?.detailedState || "",
    inning: g.linescore?.currentInningOrdinal || "",
    venue: g.venue?.name || "",
    awayProbable:
      g.teams?.away?.probablePitcher?.fullName || "未発表",
    homeProbable:
      g.teams?.home?.probablePitcher?.fullName || "未発表",
    awayMetrics: metricsFor(away),
    homeMetrics: metricsFor(home),
  };
}

async function fetchScheduleByDate(date: string) {
  const url =
    `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${date}&hydrate=team,linescore,probablePitcher`;

  const res = await fetch(url, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`MLB API error: ${res.status}`);
  }

  const data = await res.json();

  return (
    data.dates?.[0]?.games?.map((g: any) =>
      normalizeGame(g, data.dates?.[0]?.date || date)
    ) || []
  );
}

export async function GET() {
  try {
    const dates = [
      easternDate(0),
      easternDate(-1),
      easternDate(1),
    ];

    for (const date of dates) {
      const games = await fetchScheduleByDate(date);

      if (games.length > 0) {
        return NextResponse.json({
          ok: true,
          date,
          games,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      date: easternDate(0),
      games: [],
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      games: [],
      error: "MLB API取得失敗",
    });
  }
}
