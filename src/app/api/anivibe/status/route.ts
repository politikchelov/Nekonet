import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ANIVIBE_API_URL = "https://anivibe.pro/api/v1";

export async function GET() {
  const apiKey = process.env.ANIVIBE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { configured: false, authenticated: false, message: "AniVibe API key is missing." },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(`${ANIVIBE_API_URL}/partner/me`, {
      method: "GET",
      headers: { "X-Api-Key": apiKey },
      cache: "no-store",
    });

    return NextResponse.json(
      {
        configured: true,
        authenticated: response.ok,
        upstreamStatus: response.status,
        message: response.ok
          ? "AniVibe API key accepted."
          : "AniVibe rejected the API key or partner request.",
      },
      { status: response.ok ? 200 : response.status },
    );
  } catch {
    return NextResponse.json(
      {
        configured: true,
        authenticated: false,
        message: "Could not reach AniVibe API.",
      },
      { status: 502 },
    );
  }
}
