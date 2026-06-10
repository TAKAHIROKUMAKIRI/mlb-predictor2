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

    const last30 = finals.slice(-1000);

const normalizedGames = await Promise.all(
  last30.map((g) => normalizeBacktestGame(g))
);

let correct = 0;
    let roiStake = 0;
    let roi55Stake = 0;
let roi55Profit = 0;

let roi60Stake = 0;
let roi60Profit = 0;

let roi65Stake = 0;
let roi65Profit = 0;
let roiProfit = 0;
let over55Total = 0;
let over55Correct = 0;

let over60Total = 0;
let over60Correct = 0;

let over65Total = 0;
let over65Correct = 0;
const games = normalizedGames.map((g) => {
      const away = g.away;
const home = g.home;
const awayScore = g.awayScore;
const homeScore = g.homeScore;

      const winner = awayScore > homeScore ? away : home;

      // 仮ロジック：ホームチームを予想勝者にする
      // 次ステップで現在の勝率ロジックを移植します
      const prob = backtestWinProbability(g);

const predicted =
  prob.away > prob.home
    ? away
    : home;

const predictedProb =
  predicted === away
    ? prob.away
    : prob.home;

const fairOdds =
  Number(
    (
      1 /
      (predictedProb / 100)
    ).toFixed(2)
  );

const hit = predicted === winner;

roiStake += 1000;

if (hit) {
  roiProfit += 1000 * fairOdds - 1000;
} else {
  roiProfit -= 1000;
}

function addRoi(hit: boolean, fairOdds: number) {
  if (hit) {
    return 1000 * fairOdds - 1000;
  }

  return -1000;
}

const maxProb = Math.max(prob.away, prob.home);

if (maxProb >= 55) {
  roi55Stake += 1000;
  roi55Profit += addRoi(hit, fairOdds);

  over55Total += 1;
  if (hit) over55Correct += 1;
}

if (maxProb >= 60) {
  roi60Stake += 1000;
  roi60Profit += addRoi(hit, fairOdds);

  over60Total += 1;
  if (hit) over60Correct += 1;
}

if (maxProb >= 65) {
  roi65Stake += 1000;
  roi65Profit += addRoi(hit, fairOdds);

  over65Total += 1;
  if (hit) over65Correct += 1;
}

if (hit) correct += 1;

return {
  date: g.gameDate,
  away,
  home,

  awayPitcherMetrics: g.awayPitcherMetrics,
  homePitcherMetrics: g.homePitcherMetrics,

  awayScore,
  homeScore,
  winner,
  predicted,
  predictedProb,
  fairOdds,
  hit,
  prob,

  awayRecentForm: g.awayRecentForm,
  homeRecentForm: g.homeRecentForm,
  awayRoadRecord: g.awayRoadRecord,
  homeHomeRecord: g.homeHomeRecord,
  awayBullpen: g.awayBullpen,
  homeBullpen: g.homeBullpen,
  headToHead: g.headToHead,
  awayRecentPitcherForm: g.awayRecentPitcherForm,
  homeRecentPitcherForm: g.homeRecentPitcherForm,
};
    });

    games.sort(
  (a, b) =>
    new Date(b.date).getTime() -
    new Date(a.date).getTime()
);

const dailyResults: Record<string, any> = {};

for (const game of games) {
  const day = String(game.date).slice(0, 10);

  if (!dailyResults[day]) {
    dailyResults[day] = {
      date: day,
      total: 0,
      correct: 0,
      games: [],
    };
  }

  dailyResults[day].total += 1;

  if (game.hit) {
    dailyResults[day].correct += 1;
  }

  dailyResults[day].games.push(game);
}

return NextResponse.json({
  ok: true,
  target: "last30FinalGames",
  total: games.length,
  correct,
  accuracy:
    games.length > 0
      ? Number(((correct / games.length) * 100).toFixed(1))
      : 0,

  roi: {
  stake: roiStake,
  profit: Math.round(roiProfit),
  roi:
    roiStake > 0
      ? Number(((roiProfit / roiStake) * 100).toFixed(1))
      : 0,
},

roiByThreshold: {
  over55: {
    stake: roi55Stake,
    profit: Math.round(roi55Profit),
    roi:
      roi55Stake > 0
        ? Number(((roi55Profit / roi55Stake) * 100).toFixed(1))
        : 0,
  },

  over60: {
    stake: roi60Stake,
    profit: Math.round(roi60Profit),
    roi:
      roi60Stake > 0
        ? Number(((roi60Profit / roi60Stake) * 100).toFixed(1))
        : 0,
  },

  over65: {
    stake: roi65Stake,
    profit: Math.round(roi65Profit),
    roi:
      roi65Stake > 0
        ? Number(((roi65Profit / roi65Stake) * 100).toFixed(1))
        : 0,
  },
},

over55: {
  total: over55Total,
  correct: over55Correct,
  accuracy:
    over55Total > 0
      ? Number(((over55Correct / over55Total) * 100).toFixed(1))
      : 0,
},

over60: {
  total: over60Total,
  correct: over60Correct,
  accuracy:
    over60Total > 0
      ? Number(((over60Correct / over60Total) * 100).toFixed(1))
      : 0,
},

over65: {
  total: over65Total,
  correct: over65Correct,
  accuracy:
    over65Total > 0
      ? Number(((over65Correct / over65Total) * 100).toFixed(1))
      : 0,
},

  dailyResults: Object.values(dailyResults),

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

function metricsFor(teamName?: string) {
  const data: Record<string, any> = {
    "Seattle Mariners": { ops: 0.714, woba: 0.316, wraa: -1.2, wrc: 99, fip: 3.5, uzr: 8.4 },
    "Detroit Tigers": { ops: 0.706, woba: 0.311, wraa: -4.1, wrc: 96, fip: 3.9, uzr: 3.2 },
    "Miami Marlins": { ops: 0.672, woba: 0.296, wraa: -20.4, wrc: 84, fip: 4.3, uzr: -1.9 },
    "Washington Nationals": { ops: 0.684, woba: 0.298, wraa: -18.4, wrc: 88, fip: 4.4, uzr: -3.3 },
    "Los Angeles Dodgers": { ops: 0.781, woba: 0.348, wraa: 42.5, wrc: 129, fip: 3.6, uzr: 3.4 },
    "Arizona Diamondbacks": { ops: 0.740, woba: 0.326, wraa: 9.6, wrc: 106, fip: 4.2, uzr: 1.3 },
    "New York Mets": { ops: 0.734, woba: 0.321, wraa: 6.2, wrc: 104, fip: 3.9, uzr: -0.9 },
    "Houston Astros": { ops: 0.755, woba: 0.332, wraa: 20.1, wrc: 116, fip: 3.6, uzr: 3.9 },
    "New York Yankees": { ops: 0.761, woba: 0.336, wraa: 28.4, wrc: 122, fip: 3.7, uzr: 5.8 },
    "Philadelphia Phillies": { ops: 0.759, woba: 0.334, wraa: 22.4, wrc: 118, fip: 3.7, uzr: 1.1 },
    "Chicago Cubs": { ops: 0.773, woba: 0.341, wraa: 31.8, wrc: 126, fip: 3.5, uzr: 4.1 },
    "San Francisco Giants": { ops: 0.711, woba: 0.314, wraa: -2.1, wrc: 97, fip: 4.1, uzr: 1.6 },
    "Milwaukee Brewers": { ops: 0.734, woba: 0.322, wraa: 6.8, wrc: 105, fip: 3.8, uzr: 4.8 },
    "Texas Rangers": { ops: 0.705, woba: 0.310, wraa: -4.6, wrc: 95, fip: 4.0, uzr: 0.4 },
    "St. Louis Cardinals": { ops: 0.725, woba: 0.319, wraa: 2.1, wrc: 101, fip: 4.2, uzr: -0.6 },
    "Boston Red Sox": { ops: 0.742, woba: 0.325, wraa: 10.2, wrc: 108, fip: 4.0, uzr: -1.2 },
    "Toronto Blue Jays": { ops: 0.711, woba: 0.313, wraa: -2.9, wrc: 96, fip: 4.1, uzr: -2.1 },
    "Cincinnati Reds": { ops: 0.711, woba: 0.313, wraa: -2.9, wrc: 96, fip: 4.1, uzr: -2.1 },
    "Minnesota Twins": { ops: 0.728, woba: 0.320, wraa: 3.9, wrc: 102, fip: 4.0, uzr: 1.7 },
    "Chicago White Sox": { ops: 0.631, woba: 0.279, wraa: -35.2, wrc: 75, fip: 4.7, uzr: -6.4 },
  };

  return (
    data[teamName || ""] || {
      ops: 0.700,
      woba: 0.310,
      wraa: 0,
      wrc: 100,
      fip: 4.2,
      uzr: 0,
    }
  );
}

async function fetchRecentForm(teamId?: number, referenceDate?: string) {
  if (!teamId) {
    return { wins: 0, losses: 0, games: 0, opponentStrength: 0, bonus: 0 };
  }

  try {
    const end = referenceDate ? new Date(referenceDate) : new Date();
    end.setDate(end.getDate() - 1);

    const start = new Date(end);
    start.setDate(start.getDate() - 30);

    const url =
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=${teamId}` +
      `&startDate=${start.toISOString().slice(0, 10)}` +
      `&endDate=${end.toISOString().slice(0, 10)}` +
      `&gameType=R`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("recent form fetch failed");

    const data = await res.json();
    const finals: any[] = [];

    for (const d of data.dates || []) {
      for (const g of d.games || []) {
        if (g.status?.abstractGameState === "Final") {
          finals.push(g);
        }
      }
    }

    const last5 = finals.slice(-5);

    let wins = 0;
    let losses = 0;
    let opponentStrength = 0;

    for (const g of last5) {
      const awayId = g.teams?.away?.team?.id;
      const homeId = g.teams?.home?.team?.id;
      const awayName = g.teams?.away?.team?.name;
      const homeName = g.teams?.home?.team?.name;
      const awayScore = g.teams?.away?.score ?? 0;
      const homeScore = g.teams?.home?.score ?? 0;

      const isAway = teamId === awayId;
      const opponentName = isAway ? homeName : awayName;

      const won = isAway
        ? awayScore > homeScore
        : homeScore > awayScore;

      if (won) wins += 1;
      else losses += 1;

      const opponentMetrics = metricsFor(opponentName);

      opponentStrength +=
        (opponentMetrics.wrc - 100) * 0.03 +
        (4.2 - opponentMetrics.fip) * 0.8;
    }

    const formBonus = (wins - losses) * 1.2;
    const opponentBonus = opponentStrength * 0.25;

    return {
      wins,
      losses,
      games: last5.length,
      opponentStrength: Number(opponentStrength.toFixed(1)),
      bonus: Math.max(-5, Math.min(5, formBonus + opponentBonus)),
    };
  } catch (e) {
    return { wins: 0, losses: 0, games: 0, opponentStrength: 0, bonus: 0 };
  }
}

async function fetchHomeAwayRecord(
  teamId?: number,
  type: "home" | "away" = "home",
  referenceDate?: string
) {
  if (!teamId) {
    return {
      wins: 0,
      losses: 0,
      winPct: 0.5,
      bonus: 0,
    };
  }

  try {
    const end = referenceDate ? new Date(referenceDate) : new Date();
    end.setDate(end.getDate() - 1);

    const season = end.getFullYear();
    const start = new Date(`${season}-03-01`);

    const url =
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=${teamId}` +
      `&startDate=${start.toISOString().slice(0, 10)}` +
      `&endDate=${end.toISOString().slice(0, 10)}` +
      `&gameType=R`;

    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();

    let wins = 0;
    let losses = 0;

    for (const d of data.dates || []) {
      for (const g of d.games || []) {
        if (g.status?.abstractGameState !== "Final") continue;

        const awayId = g.teams?.away?.team?.id;
        const homeId = g.teams?.home?.team?.id;

        const awayScore = g.teams?.away?.score ?? 0;
        const homeScore = g.teams?.home?.score ?? 0;

        if (type === "home" && homeId !== teamId) continue;
        if (type === "away" && awayId !== teamId) continue;

        const won =
          type === "home"
            ? homeScore > awayScore
            : awayScore > homeScore;

        if (won) wins++;
        else losses++;
      }
    }

    const games = wins + losses;
    const winPct = games > 0 ? wins / games : 0.5;

    return {
      wins,
      losses,
      winPct: Number(winPct.toFixed(3)),
      bonus: Number(((winPct - 0.5) * 8).toFixed(1)),
    };
  } catch {
    return {
      wins: 0,
      losses: 0,
      winPct: 0.5,
      bonus: 0,
    };
  }
}

function parseInnings(ip: any) {
  if (!ip) return 0;

  const raw = String(ip);

  if (!raw.includes(".")) {
    return Number(raw) || 0;
  }

  const [whole, fraction] = raw.split(".");
  const outs = Number(fraction) || 0;

  return (Number(whole) || 0) + outs / 3;
}

function calcFip(stat: any) {
  const ip = parseInnings(stat?.inningsPitched);
  if (!ip) return null;

  const hr = Number(stat?.homeRuns || 0);
  const bb = Number(stat?.baseOnBalls || 0);
  const hbp = Number(stat?.hitBatsmen || 0);
  const k = Number(stat?.strikeOuts || 0);

  return Number(
    (((13 * hr + 3 * (bb + hbp) - 2 * k) / ip) + 3.1).toFixed(2)
  );
}

function calcK9(stat: any) {
  const ip = parseInnings(stat?.inningsPitched);
  const k = Number(stat?.strikeOuts || 0);

  if (!ip) return null;

  return Number(((k * 9) / ip).toFixed(1));
}

async function fetchPitcherMetrics(playerId?: number, referenceDate?: string) {
  if (!playerId) {
    return {
      era: null,
      fip: null,
      whip: null,
      k9: null,
    };
  }

  try {
    const end = referenceDate ? new Date(referenceDate) : new Date();
    const season = end.getFullYear();

    const url =
      `https://statsapi.mlb.com/api/v1/people/${playerId}/stats` +
      `?stats=season&group=pitching&season=${season}`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("pitcher metrics fetch failed");

    const data = await res.json();
    const stat = data.stats?.[0]?.splits?.[0]?.stat || null;

    if (!stat) {
      return {
        era: null,
        fip: null,
        whip: null,
        k9: null,
      };
    }

    return {
      era: stat.era ? Number(stat.era) : null,
      fip: calcFip(stat),
      whip: stat.whip ? Number(stat.whip) : null,
      k9: calcK9(stat),
    };
  } catch {
    return {
      era: null,
      fip: null,
      whip: null,
      k9: null,
    };
  }
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

async function fetchStartingPitchers(gamePk: number) {
  try {
    const url =
      `https://statsapi.mlb.com/api/v1/game/${gamePk}/boxscore`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("boxscore fetch failed");

    const data = await res.json();

    const awayPitchers = data.teams?.away?.pitchers || [];
    const homePitchers = data.teams?.home?.pitchers || [];

    return {
      awayPitcherId: awayPitchers[0],
      homePitcherId: homePitchers[0],
    };
  } catch {
    return {
      awayPitcherId: undefined,
      homePitcherId: undefined,
    };
  }
}

async function normalizeBacktestGame(g: any) {
  const away = g.teams?.away?.team?.name || "Away";
  const home = g.teams?.home?.team?.name || "Home";

  const awayTeamId = g.teams?.away?.team?.id;
  const homeTeamId = g.teams?.home?.team?.id;

    console.log(
    "AWAY",
    away,
    g.teams?.away?.probablePitcher
  );

  console.log(
    "HOME",
    home,
    g.teams?.home?.probablePitcher
  );
  
    const starters =
  await fetchStartingPitchers(g.gamePk);

const awayPitcherMetrics =
  await fetchPitcherMetrics(
    starters.awayPitcherId,
    g.gameDate
  );

const homePitcherMetrics =
  await fetchPitcherMetrics(
    starters.homePitcherId,
    g.gameDate
  );
  
  const awayRecentForm = await fetchRecentForm(awayTeamId, g.gameDate);
  const homeRecentForm = await fetchRecentForm(homeTeamId, g.gameDate);

  const awayRoadRecord =
  await fetchHomeAwayRecord(
    awayTeamId,
    "away",
    g.gameDate
  );

const homeHomeRecord =
  await fetchHomeAwayRecord(
    homeTeamId,
    "home",
    g.gameDate
  );
  
  return {
    id: g.gamePk,
    date: g.gameDate,
    gameDate: g.gameDate || "",
    away,
    home,
    awayScore: g.teams?.away?.score ?? 0,
    homeScore: g.teams?.home?.score ?? 0,

    status: "SCHEDULED",

    venue: g.venue?.name || "",

    awayMetrics: metricsFor(away),
    homeMetrics: metricsFor(home),

    awayPitcherMetrics,
homePitcherMetrics,

    awayBullpen: { appearances: 0, pitches: 0, fatigueScore: 0 },
    homeBullpen: { appearances: 0, pitches: 0, fatigueScore: 0 },

    awayRecentForm,
    homeRecentForm,

    awayRoadRecord,
homeHomeRecord,

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

  away = 50 + (away - 50) * 0.65;
  
  if (!Number.isFinite(away)) {
    away = 50;
  }

  away = Math.round(Math.max(8, Math.min(92, away)));

  return {
    away,
    home: 100 - away,
  };
}
