import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const ANIVIBE_API_URL = "https://anivibe.pro/api/v1";

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANIVIBE_API_KEY;
  const origin = process.env.ANIVIBE_ORIGIN;

  if (!apiKey || !origin) {
    return NextResponse.json(
      { error: "AniVibe is not configured on the server." },
      { status: 503 },
    );
  }

  let body: { anime_id?: unknown; episode?: unknown; translation?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const animeId = Number(body.anime_id);
  const episode = body.episode == null ? undefined : Number(body.episode);

  if (!Number.isSafeInteger(animeId) || animeId < 1) {
    return NextResponse.json({ error: "anime_id must be a positive integer." }, { status: 400 });
  }

  if (episode !== undefined && (!Number.isSafeInteger(episode) || episode < 1)) {
    return NextResponse.json({ error: "episode must be a positive integer." }, { status: 400 });
  }

  const payload: Record<string, string | number> = {
    anime_id: animeId,
    origin,
  };

  if (episode !== undefined) payload.episode = episode;
  if (typeof body.translation === "string" && body.translation.trim()) {
    payload.translation = body.translation.trim().slice(0, 100);
  }

  try {
    const response = await fetch(`${ANIVIBE_API_URL}/embed-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const responseBody = await response.json().catch(() => ({
      error: "AniVibe returned an unreadable response.",
    }));

    return NextResponse.json(responseBody, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: "Unable to reach AniVibe right now." },
      { status: 502 },
    );
  }
}
