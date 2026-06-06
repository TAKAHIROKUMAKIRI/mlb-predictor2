import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function fetchJson(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("fetch failed");
  return res.json();
}

export async function GET() {
  try {
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 60);

    const startDate = start.toISOString().slice(0, 10);
    const endDate = today.toISOString().slice(0, 10);

    const url =
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1` +
      `&startDate=${startDate}` +
      `&endDate=${endDate}` +
      `&gameType=R`;

    const data = await fetchJson(url);

    const finals: any[] = [];

    for (const d of data.dates || []) {
      for (const g of d.games || []) {
        if (g.status?.abstractGameState === "Final") {
          finals.push(g);
        }
      }
    }

    const last30 = finals.slice(-30);

const normalizedGames = await Promise.all(
  last30.map((g) => normalizeBacktestGame(g))
);

let correct = 0;

const games = normalizedGames.map((g) => {
      const away = g.teams?.away?.team?.name;
      const home = g.teams?.home?.team?.name;
      const awayScore = g.teams?.away?.score ?? 0;
      const homeScore = g.teams?.home?.score ?? 0;

      const winner = awayScore > homeScore ? away : home;

      // 仮ロジック：ホームチームを予想勝者にする
      // 次ステップで現在の勝率ロジックを移植します
      const prob = backtestWinProbability(g);

const predicted =
  prob.away > prob.home
    ? away
    : home;

const hit = predicted === winner;

if (hit) correct += 1;

return {
  date: g.gameDate,
  away,
  home,
  awayScore,
  homeScore,
  winner,
  predicted,
  hit,
};
    });

    return NextResponse.json({
      ok: true,
      target: "last30FinalGames",
      total: games.length,
      correct,
      accuracy:
        games.length > 0
          ? Number(((correct / games.length) * 100).toFixed(1))
          : 0,
      games,
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: "backtest failed",
      },
      { status: 500 }
    );
  }
}

const PARK_FACTOR: Record<string, number> = {
  "Coors Field": 2,
  "Great American Ball Park": 1.2,
  "Yankee Stadium": 0.8,
  "Fenway Park": 0.6,
  "Chase Field": 0.5,
  "T-Mobile Park": -1,
  "Oracle Park": -0.8,
  "Petco Park": -0.8,
  "Comerica Park": -0.5,
  "Dodger Stadium": -0.3,
};

function strength(teamMetrics: any, pitcherMetrics?: any) {
  if (!teamMetrics) return 0;

  let score = 0;

  score += (teamMetrics.ops - 0.7) * 35;
  score += (teamMetrics.woba - 0.31) * 55;
  score += (teamMetrics.wraa || 0) * 0.05;
  score += (teamMetrics.wrc - 100) * 0.04;
  score += (4.2 - teamMetrics.fip) * 1.2;
  score += (teamMetrics.uzr || 0) * 0.08;

  if (pitcherMetrics?.era != null) {
    score += (4.2 - pitcherMetrics.era) * 1.2;
  }

  if (pitcherMetrics?.fip != null) {
    score += (4.2 - pitcherMetrics.fip) * 1.4;
  }

  if (pitcherMetrics?.whip != null) {
    score += (1.3 - pitcherMetrics.whip) * 2;
  }

  if (pitcherMetrics?.k9 != null) {
    score += (pitcherMetrics.k9 - 8) * 0.25;
  }

  return Math.max(-12, Math.min(12, score));
}

function recentFormBonus(form?: any) {
  return form?.bonus || 0;
}

function homeAwayBonus(record?: any) {
  return record?.bonus || 0;
}

function bullpenBonus(teamMetrics: any, bullpen?: any) {
  if (!bullpen) return 0;

  let score = 0;

  score -= (bullpen.fatigueScore || 0) * 0.6;

  if (bullpen.era <= 3.5) score += 3;
  else if (bullpen.era <= 4.2) score += 1;
  else if (bullpen.era >= 5.5) score -= 3;

  if (bullpen.whip <= 1.2) score += 2;
  else if (bullpen.whip >= 1.4) score -= 2;

  return Math.max(-8, Math.min(8, score));
}

function matchupBonus(game: any) {
  const a = game.awayMetrics;
  const h = game.homeMetrics;

  if (!a || !h) return 0;

  const awayScore =
    a.wrc * 0.03 +
    a.wraa * 0.04 +
    a.ops * 20;

  const homeScore =
    h.wrc * 0.03 +
    h.wraa * 0.04 +
    h.ops * 20;

  return Math.max(-3, Math.min(3, (awayScore - homeScore) * 0.25));
}

function homeAdvantageFor(venue?: string) {
  return 2.5;
}

async function normalizeBacktestGame(g: any) {
  const away = g.teams?.away?.team?.name || "Away";
  const home = g.teams?.home?.team?.name || "Home";

  return {
    id: g.gamePk,
    date: g.gameDate,
    gameDate: g.gameDate || "",
    away,
    home,
    awayScore: g.teams?.away?.score ?? 0,
    homeScore: g.teams?.home?.score ?? 0,

    // FINAL扱いにすると実結果100%になるので、予想用はSCHEDULED扱い
    status: "SCHEDULED",

    venue: g.venue?.name || "",

    awayMetrics: metricsFor(away),
    homeMetrics: metricsFor(home),

    awayPitcherMetrics: null,
    homePitcherMetrics: null,

    awayBullpen: { appearances: 0, pitches: 0, fatigueScore: 0 },
    homeBullpen: { appearances: 0, pitches: 0, fatigueScore: 0 },

    awayRecentForm: { wins: 0, losses: 0, games: 0, bonus: 0 },
    homeRecentForm: { wins: 0, losses: 0, games: 0, bonus: 0 },

    awayRoadRecord: { wins: 0, losses: 0, winPct: 0.5, bonus: 0 },
    homeHomeRecord: { wins: 0, losses: 0, winPct: 0.5, bonus: 0 },

    headToHead: { awayWins: 0, homeWins: 0, totalGames: 0, bonus: 0 },

    awayRecentPitcherForm: { bonus: 0 },
    homeRecentPitcherForm: { bonus: 0 },
  };
}

function backtestWinProbability(game: any) {
  const parkAdjustment = PARK_FACTOR[game.venue] || 0;
  const homeAdv = homeAdvantageFor(game.venue) || 2.5;

  let away =
    50 +
    (strength(game.awayMetrics, game.awayPitcherMetrics) || 0) +
    (recentFormBonus(game.awayRecentForm) || 0) +
    (homeAwayBonus(game.awayRoadRecord) || 0) +
    (bullpenBonus(game.awayMetrics, game.awayBullpen) || 0) +
    (matchupBonus(game) || 0) +
    (game.headToHead?.bonus || 0) +
    (game.awayRecentPitcherForm?.bonus ?? 0) -
    (
      (strength(game.homeMetrics, game.homePitcherMetrics) || 0) +
      (recentFormBonus(game.homeRecentForm) || 0) +
      (homeAwayBonus(game.homeHomeRecord) || 0) +
      (bullpenBonus(game.homeMetrics, game.homeBullpen) || 0) +
      (game.homeRecentPitcherForm?.bonus ?? 0) +
      homeAdv
    );

  away -= parkAdjustment;

  if (!Number.isFinite(away)) {
    away = 50;
  }

  away = Math.round(Math.max(3, Math.min(97, away)));

  return {
    away,
    home: 100 - away,
  };
}
