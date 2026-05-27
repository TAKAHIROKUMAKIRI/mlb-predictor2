"use client";

import { useEffect, useState } from "react";

export default function Page() {
  const [games, setGames] = useState<any[]>([]);

  useEffect(() => {
    loadGames();
  }, []);

  async function loadGames() {
    try {
      const res = await fetch("/api/mlb");
      const data = await res.json();
      setGames(data.games || []);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <main
      style={{
        background: "#020617",
        color: "white",
        minHeight: "100vh",
        padding: 20,
        fontFamily: "sans-serif",
      }}
    >
      <h1>MLB速報・勝敗確率</h1>

      {games.map((g) => (
        <div
          key={g.id}
          style={{
            background: "#111827",
            padding: 20,
            borderRadius: 16,
            marginBottom: 16,
          }}
        >
          <h2>
            {g.away} @ {g.home}
          </h2>

          <p>
            {g.awayScore} - {g.homeScore}
          </p>

          <p>{g.status}</p>

          <p>球場: {g.venue}</p>
        </div>
      ))}
    </main>
  );
}
