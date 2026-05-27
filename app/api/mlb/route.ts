import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function easternDate() {
  const now = new Date();

  const et = new Date(
    now.toLocaleString("en-US", {
      timeZone: "America/New_York",
    })
  );

  const y = et.getFullYear();

  const m = String(et.getMonth() + 1).padStart(
    2,
    "0"
  );

  const d = String(et.getDate()).padStart(
    2,
    "0"
  );

  return `${y}-${m}-${d}`;
}

export async function GET() {
  try {
    const date = easternDate();

    const url =
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${date}&hydrate=team,linescore,probablePitcher`;

    const res = await fetch(url, {
      cache: "no-store",
    });

    const data = await res.json();

    const games =
      data.dates?.[0]?.games?.map((g: any) => ({
        id: g.gamePk,

        away: g.teams.away.team.name,

        home: g.teams.home.team.name,

        awayScore:
          g.teams.away.score ?? 0,

        homeScore:
          g.teams.home.score ?? 0,

        status:
          g.status.detailedState,

        venue:
          g.venue?.name || "",

        awayProbable:
          g.teams.away
            ?.probablePitcher?.fullName ||
          "未発表",

        homeProbable:
          g.teams.home
            ?.probablePitcher?.fullName ||
          "未発表",
      })) || [];

    return NextResponse.json({
      games,
    });
  } catch (e) {
    return NextResponse.json({
      games: [],
      error: "MLB API取得失敗",
    });
  }
}
