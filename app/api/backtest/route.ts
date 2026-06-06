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

    let correct = 0;

    const games = last30.map((g) => {
      const away = g.teams?.away?.team?.name;
      const home = g.teams?.home?.team?.name;
      const awayScore = g.teams?.away?.score ?? 0;
      const homeScore = g.teams?.home?.score ?? 0;

      const winner = awayScore > homeScore ? away : home;

      // 仮ロジック：ホームチームを予想勝者にする
      // 次ステップで現在の勝率ロジックを移植します
      const predicted = home;

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
