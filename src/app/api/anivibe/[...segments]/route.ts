import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_BASE = "https://anivibe.pro/api/v1";
const ID_PATTERN = /^[1-9][0-9]{0,11}$/;

type RouteContext = {
  params: Promise<{ segments: string[] }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { segments } = await context.params;
  const [resource, id, child] = segments;

  // Only expose the documented read-only catalog endpoints.
  let endpoint: string;
  if (resource === "search" && segments.length === 1) {
    const q = request.nextUrl.searchParams.get("q")?.trim();
    if (!q || q.length > 120) {
      return NextResponse.json({ error: "A search query is required." }, { status: 400 });
    }
    const limit = Math.max(1, Math.min(30, Number(request.nextUrl.searchParams.get("limit")) || 20));\n    endpoint = `/search?q=${encodeURIComponent(q)}&limit=${limit}`;
  } else if (resource === "recent" && segments.length === 1) {
    const cursor = request.nextUrl.searchParams.get("cursor");
    endpoint = cursor
      ? `/recent?cursor=${encodeURIComponent(cursor.slice(0, 500))}`
      : "/recent";
  } else if (
    resource === "anime" &&
    id &&
    ID_PATTERN.test(id) &&
    (segments.length === 2 || (segments.length === 3 && child === "episodes"))
  ) {
    endpoint = `/anime/${id}${child === "episodes" ? "/episodes" : ""}`;
  } else {
    return NextResponse.json({ error: "Unsupported AniVibe endpoint." }, { status: 404 });
  }

  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    const apiKey = process.env.ANIVIBE_API_KEY;
    if (apiKey) headers["X-Api-Key"] = apiKey;

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: "GET",
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const body = await response.json().catch(() => ({ error: "AniVibe returned invalid JSON." }));

    return NextResponse.json(body, {
      status: response.status,
      headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=240" },
    });
  } catch {
    return NextResponse.json(
      { error: "AniVibe is temporarily unavailable. Please try again." },
      { status: 502 },
    );
  }
}
