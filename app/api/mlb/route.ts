import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const date = new Date().toISOString().split("T")[0];

  const url =
    `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${date}`;

  const res = await fetch(url);

  const data = await res.json();

  const games =
    data.dates?.[0]?.games?.map((g: any) => ({
      id: g.gamePk,
      away: g.teams.away.team.name,
      home: g.teams.home.team.name,
      awayScore: g.teams.away.score ?? 0,
      homeScore: g.teams.home.score ?? 0,
      status: g.status.detailedState,
      venue: g.venue.name,
    })) || [];

  return NextResponse.json({
    games,
  });
}
