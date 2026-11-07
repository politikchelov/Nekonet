import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() || "";
  const page = Math.max(1, Math.min(1000, Number(request.nextUrl.searchParams.get("page") || 1)));
  if (query.length > 100) {
    return NextResponse.json({ error: "Search query is too long." }, { status: 400 });
  }

  const params = new URLSearchParams({ limit: "50", page: String(page), censored: "true" });
  if (query) params.set("search", query);
  else params.set("order", "popularity");

  try {
    const response = await fetch("https://shikimori.one/api/animes?" + params.toString(), {
      headers: { Accept: "application/json", "User-Agent": "Miraku/1.0 (anime catalog)" },
      next: { revalidate: 21600 },
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) {
      return NextResponse.json([], { headers: { "Cache-Control": "public, s-maxage=300" } });
    }
    const payload: unknown = await response.json();
    const records = Array.isArray(payload) ? payload : [];
    const titles = records
      .filter((item: any) => item && item.rating !== "rx")
      .map((item: any) => ({
        malId: item.malId ?? item.mal_id ?? item.myanimelist_id ?? null,
        russian: typeof item.russian === "string" ? item.russian : null,
        rating: item.rating ?? null,
      }))
      .filter((item: any) => item.malId && item.russian);
    return NextResponse.json(titles, {
      headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" },
    });
  } catch {
    return NextResponse.json([], { headers: { "Cache-Control": "public, s-maxage=300" } });
  }
}
