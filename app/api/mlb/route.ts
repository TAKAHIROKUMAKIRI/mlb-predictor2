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

async function fetchBullpenFatigue(teamId?: number, referenceDate?: string) {
  if (!teamId) {
    return {
      appearances: 0,
      pitches: 0,
      fatigueScore: 0,
    };
  }

  try {
    const end = referenceDate ? new Date(referenceDate) : new Date();
    end.setDate(end.getDate() - 1);

    const start = new Date(end);
    start.setDate(start.getDate() - 3);

    const startDate = start.toISOString().slice(0, 10);
    const endDate = end.toISOString().slice(0, 10);

    // まず直近3日間の試合一覧だけ取得
    const scheduleUrl =
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=${teamId}` +
      `&startDate=${startDate}&endDate=${endDate}&gameType=R`;

    const scheduleRes = await fetch(scheduleUrl, {
      cache: "no-store",
    });

    if (!scheduleRes.ok) {
      throw new Error("bullpen schedule fetch failed");
    }

    const scheduleData = await scheduleRes.json();

    let appearances = 0;
    let innings = 0;
let earnedRuns = 0;
let strikeouts = 0;
let walks = 0;
let hits = 0;
    let pitches = 0;

    for (const d of scheduleData.dates || []) {
      for (const g of d.games || []) {
        if (g.status?.abstractGameState !== "Final") continue;

        const gamePk = g.gamePk;
        if (!gamePk) continue;

        // 試合ごとにboxscoreを直接取得
        const boxscoreUrl =
          `https://statsapi.mlb.com/api/v1/game/${gamePk}/boxscore`;

        const boxscoreRes = await fetch(boxscoreUrl, {
          cache: "no-store",
        });

        if (!boxscoreRes.ok) continue;

        const boxscore = await boxscoreRes.json();

        const side =
          boxscore.teams?.away?.team?.id === teamId
            ? boxscore.teams.away
            : boxscore.teams?.home?.team?.id === teamId
              ? boxscore.teams.home
              : null;

        if (!side?.players) continue;

        for (const player of Object.values(side.players) as any[]) {
          const pitching = player?.stats?.pitching;
          if (!pitching) continue;

          const inningsText = String(pitching.inningsPitched || "0");
          const gamesPitched = Number(pitching.gamesPlayed || 0);

const numberOfPitches =
  Number(pitching.numberOfPitches || 0);

          const ip =
  parseFloat(
    String(
      pitching.inningsPitched || 0
    )
  ) || 0;

innings += ip;

earnedRuns +=
  Number(pitching.earnedRuns || 0);

strikeouts +=
  Number(pitching.strikeOuts || 0);

walks +=
  Number(pitching.baseOnBalls || 0);

hits +=
  Number(pitching.hits || 0);
          
          // 先発投手も含まれるため、登板投手としてまず集計
          // 完全に0回の投手は除外
          if (ip > 0) {
            appearances += 1;
            pitches += numberOfPitches;
          }
        }
      }
    }


    const era =
  innings > 0
    ? (earnedRuns * 9) / innings
    : 0;

const whip =
  innings > 0
    ? (walks + hits) / innings
    : 0;
    
    
    const fatigueScore = Math.min(
      10,
      appearances * 0.45 + pitches * 0.018
    );

    return {
  appearances,
  pitches,

  fatigueScore:
    Number(fatigueScore.toFixed(1)),

  era:
    Number(era.toFixed(2)),

  whip:
    Number(whip.toFixed(2)),

  strikeouts,

  innings:
    Number(innings.toFixed(1)),
};
  } catch (e) {
    return {
      appearances: 0,
      pitches: 0,
      fatigueScore: 0,
    };
  }
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

      if (opponentMetrics?.wrc != null && opponentMetrics?.fip != null) {
        opponentStrength +=
          (opponentMetrics.wrc - 100) * 0.03 +
          (4.2 - opponentMetrics.fip) * 0.8;
      }
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
    return { wins: 0, losses: 0, winPct: 0, bonus: 0 };
  }

  try {
    const end = referenceDate ? new Date(referenceDate) : new Date();
    end.setDate(end.getDate() - 1);

    const season = end.getFullYear();
    const start = new Date(`${season}-03-01`);

    const startDate = start.toISOString().slice(0, 10);
    const endDate = end.toISOString().slice(0, 10);

    const url =
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=${teamId}` +
      `&startDate=${startDate}` +
      `&endDate=${endDate}` +
      `&gameType=R`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("home away fetch failed");

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

        const isHomeGame = homeId === teamId;
        const isAwayGame = awayId === teamId;

        if (type === "home" && !isHomeGame) continue;
        if (type === "away" && !isAwayGame) continue;

        const won =
          isHomeGame
            ? homeScore > awayScore
            : awayScore > homeScore;

        if (won) wins += 1;
        else losses += 1;
      }
    }

    const games = wins + losses;
    const winPct = games > 0 ? wins / games : 0.5;
    const bonus = Math.max(-4, Math.min(4, (winPct - 0.5) * 12));

    return {
      wins,
      losses,
      winPct: Number(winPct.toFixed(3)),
      bonus: Number(bonus.toFixed(1)),
    };
  } catch (e) {
    return { wins: 0, losses: 0, winPct: 0, bonus: 0 };
  }
}

function currentSeason() {
  return new Date().getFullYear();
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

  const fipConstant = 3.1;

  return Number(
    (((13 * hr + 3 * (bb + hbp) - 2 * k) / ip) + fipConstant).toFixed(2)
  );
}

function calcK9(stat: any) {
  const ip = parseInnings(stat?.inningsPitched);
  const k = Number(stat?.strikeOuts || 0);

  if (!ip) return null;

  return Number(((k * 9) / ip).toFixed(1));
}

async function fetchPitcherMetrics(playerId?: number) {
  if (!playerId) {
    return {
      era: null,
      fip: null,
      whip: null,
      k9: null,
    };
  }

  try {
    const season = currentSeason();

    const url =
      `https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=season&group=pitching&season=${season}`;

    const res = await fetch(url, {
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error("Pitcher stats fetch failed");
    }

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
  } catch (e) {
    return {
      era: null,
      fip: null,
      whip: null,
      k9: null,
    };
  }
}

async function fetchHeadToHead(
  awayTeamId?: number,
  homeTeamId?: number
) {
  return {
    awayWins: 0,
    homeWins: 0,
    totalGames: 0,
    bonus: 0,
  };
}
async function normalizeGame(g: any, date: string) {
  const away = g.teams?.away?.team?.name || "Away";
  const home = g.teams?.home?.team?.name || "Home";

const awayTeamId = g.teams?.away?.team?.id;
const homeTeamId = g.teams?.home?.team?.id;
  
  const awayPitcher = g.teams?.away?.probablePitcher;
  const homePitcher = g.teams?.home?.probablePitcher;

  const abstract = g.status?.abstractGameState || "Preview";

  const status =
    abstract === "Live"
      ? "LIVE"
      : abstract === "Final"
        ? "FINAL"
        : "SCHEDULED";

  const [
  awayPitcherMetrics,
  homePitcherMetrics,
  awayBullpen,
  homeBullpen,
  headToHead,
  awayRecentForm,
  homeRecentForm,
  awayRoadRecord,
  homeHomeRecord,
] = await Promise.all([
  fetchPitcherMetrics(awayPitcher?.id),
  fetchPitcherMetrics(homePitcher?.id),
  fetchBullpenFatigue(awayTeamId, date),
  fetchBullpenFatigue(homeTeamId, date),
  fetchHeadToHead(awayTeamId, homeTeamId),
  fetchRecentForm(awayTeamId, date),
  fetchRecentForm(homeTeamId, date),
  fetchHomeAwayRecord(awayTeamId, "away", date),
  fetchHomeAwayRecord(homeTeamId, "home", date),
]);

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
  awayProbable: awayPitcher?.fullName || "未発表",
  homeProbable: homePitcher?.fullName || "未発表",
  awayMetrics: metricsFor(away),
  homeMetrics: metricsFor(home),
  awayPitcherMetrics,
homePitcherMetrics,
awayBullpen,
homeBullpen,
awayRecentForm,
homeRecentForm,
    awayRoadRecord,
homeHomeRecord,
headToHead: headToHead ?? {
  awayWins: 0,
  homeWins: 0,
  totalGames: 0,
  bonus: 0,
},
debugHeadToHead: headToHead ?? {
  awayWins: 0,
  homeWins: 0,
  totalGames: 0,
  bonus: 0,
},
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

  const rawGames = data.dates?.[0]?.games || [];

  return Promise.all(
    rawGames.map((g: any) =>
      normalizeGame(g, data.dates?.[0]?.date || date)
    )
  );
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
// redeploy fix
