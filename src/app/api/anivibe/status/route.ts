import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ANIVIBE_API_URL = "https://anivibe.pro/api/v1";

export async function GET(request: NextRequest) {
  const apiKey = process.env.ANIVIBE_API_KEY;
  const configuredOrigin = process.env.ANIVIBE_ORIGIN;
  if (!apiKey || !configuredOrigin) {
    return NextResponse.json(
      { configured: false, authenticated: false, originMatches: false, message: "Не задан API-ключ или домен AniVibe." },
      { status: 503 },
    );
  }

  let origin: string;
  try {
    origin = new URL(configuredOrigin).origin;
  } catch {
    return NextResponse.json(
      { configured: false, authenticated: false, originMatches: false, message: "ANIVIBE_ORIGIN имеет неверный формат." },
      { status: 503 },
    );
  }

  const originMatches = origin === request.nextUrl.origin;
  try {
    const response = await fetch(ANIVIBE_API_URL + "/partner/me", {
      method: "GET",
      headers: { "X-Api-Key": apiKey },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    return NextResponse.json({
      configured: true,
      authenticated: response.ok,
      originMatches,
      origin,
      upstreamStatus: response.status,
      message: response.ok
        ? (originMatches ? "Ключ принят, домен совпадает." : "Ключ принят, но домен в настройках не совпадает с адресом сайта.")
        : response.status === 401
          ? "AniVibe отклонил API-ключ."
          : "AniVibe отклонил запрос партнёра.",
    }, { status: response.ok ? 200 : response.status });
  } catch {
    return NextResponse.json({
      configured: true,
      authenticated: false,
      originMatches,
      origin,
      message: "Не удалось связаться с AniVibe.",
    }, { status: 502 });
  }
}
