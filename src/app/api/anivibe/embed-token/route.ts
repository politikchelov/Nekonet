import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ANIVIBE_API_URL = "https://anivibe.pro/api/v1";

const upstreamMessage = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ["error", "message", "detail", "reason"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) return value.trim().slice(0, 240);
    }
  }
  return fallback;
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANIVIBE_API_KEY;
  const configuredOrigin = process.env.ANIVIBE_ORIGIN;
  if (!apiKey || !configuredOrigin) {
    return NextResponse.json(
      { error: "AniVibe не настроен: отсутствует API-ключ или домен.", code: "CONFIG_MISSING" },
      { status: 503 },
    );
  }

  let origin: string;
  try {
    const parsed = new URL(configuredOrigin);
    if (parsed.protocol !== "https:") throw new Error("HTTPS required");
    origin = parsed.origin;
  } catch {
    return NextResponse.json(
      { error: "ANIVIBE_ORIGIN задан неверно. Нужен полный HTTPS-адрес сайта.", code: "ORIGIN_INVALID" },
      { status: 503 },
    );
  }

  let body: { anime_id?: unknown; episode?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос плеера." }, { status: 400 });
  }

  const animeId = Number(body.anime_id);
  const episode = Number(body.episode);
  if (!Number.isSafeInteger(animeId) || animeId < 1) {
    return NextResponse.json({ error: "Не удалось определить ID аниме." }, { status: 400 });
  }
  if (!Number.isSafeInteger(episode) || episode < 1) {
    return NextResponse.json({ error: "Номер серии указан неверно." }, { status: 400 });
  }

  try {
    const response = await fetch(ANIVIBE_API_URL + "/embed-token", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
      body: JSON.stringify({ anime_id: animeId, episode, origin }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const fallback = response.status === 401
        ? "AniVibe отклонил API-ключ (401)."
        : response.status === 403
          ? "AniVibe запретил запрос для этого домена (403)."
          : "AniVibe не смог создать ссылку плеера.";
      return NextResponse.json({
        error: upstreamMessage(payload, fallback),
        code: response.status === 401 ? "API_KEY_REJECTED" : response.status === 403 ? "ORIGIN_FORBIDDEN" : "UPSTREAM_ERROR",
        upstreamStatus: response.status,
      }, { status: response.status });
    }
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(
      { error: "Не удалось связаться с AniVibe. Попробуй ещё раз позже.", code: "UPSTREAM_UNAVAILABLE" },
      { status: 502 },
    );
  }
}
