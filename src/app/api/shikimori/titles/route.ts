import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("q")?.trim() || "";
  const page = Math.max(1, Math.min(1000, Math.floor(Number(request.nextUrl.searchParams.get("page") || 1)) || 1));
  if (search.length > 100) {
    return NextResponse.json({ error: "Search query is too long." }, { status: 400 });
  }

  const filters = search
    ? `search: ${JSON.stringify(search)}, limit: 50`
    : `page: ${page}, limit: 50, order: popularity, censored: true`;
  const query = `query MirakuRussianTitles { animes(${filters}) { malId russian rating } }`;

  try {
    const response = await fetch("https://shikimori.one/api/graphql", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Miraku/1.0 (anime catalog)",
      },
      body: JSON.stringify({ query }),
      next: { revalidate: 21600 },
      signal: AbortSignal.timeout(9000),
    });

    if (!response.ok) {
      return NextResponse.json([], { headers: { "Cache-Control": "public, s-maxage=300" } });
    }

    const payload = await response.json();
    if (payload?.errors?.length) {
      return NextResponse.json([], { headers: { "Cache-Control": "public, s-maxage=300" } });
    }

    const records = Array.isArray(payload?.data?.animes) ? payload.data.animes : [];
    const titles = records
      .filter((item: any) => item && item.rating !== "rx")
      .map((item: any) => ({
        malId: item.malId ?? null,
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
