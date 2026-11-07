import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type ShikimoriAnime = {
  id: string;
  malId: number | null;
  name: string;
  russian: string | null;
  japanese: string | null;
  kind: string | null;
  rating: string | null;
  score: number | string | null;
  status: string | null;
  episodes: number | null;
  episodesAired: number | null;
  duration: number | null;
  season: string | null;
  airedOn: { year?: number | null; month?: number | null; day?: number | null } | null;
  releasedOn: { year?: number | null; month?: number | null; day?: number | null } | null;
  poster: { originalUrl?: string | null; mainUrl?: string | null } | null;
  genres: Array<{ russian?: string | null; name?: string | null }>;
  studios: Array<{ id: string; name: string }>;
};

const SHIKIMORI_ENDPOINT = "https://shikimori.one/api/graphql";
const ANILIST_ENDPOINT = "https://graphql.anilist.co";

const SHIKIMORI_FIELDS = `
  id malId name russian japanese kind rating score status episodes episodesAired
  duration season
  airedOn { year month day }
  releasedOn { year month day }
  poster { originalUrl mainUrl }
  genres { russian name }
  studios { id name }
`;

function getFilters(category: string, page: number, perPage: number, search: string) {
  if (category === "search") {
    return `search: ${JSON.stringify(search)}, page: ${page}, limit: ${perPage}, order: popularity, censored: true`;
  }
  if (category === "upcoming") {
    return `page: ${page}, limit: ${perPage}, status: "anons", order: popularity, censored: true`;
  }
  if (category === "recent") {
    return `page: ${page}, limit: ${perPage}, order: aired_on, censored: true`;
  }
  if (category === "trending") {
    return `page: ${page}, limit: ${perPage}, order: ranked, censored: true`;
  }
  return `page: ${page}, limit: ${perPage}, order: popularity, censored: true`;
}

function mapKind(kind: string | null) {
  switch (kind) {
    case "movie": return "MOVIE";
    case "ova": return "OVA";
    case "ona": return "ONA";
    case "special":
    case "tv_special": return "SPECIAL";
    case "music":
    case "pv":
    case "cm": return "MUSIC";
    default: return "TV";
  }
}

function mapStatus(status: string | null) {
  switch (status) {
    case "ongoing": return "RELEASING";
    case "anons": return "NOT_YET_RELEASED";
    case "released": return "FINISHED";
    default: return "FINISHED";
  }
}

function mapSeason(value: string | null): { season: "WINTER" | "SPRING" | "SUMMER" | "FALL" | null; year: number | null } {
  if (!value) return { season: null, year: null };
  const match = value.match(/^(winter|spring|summer|fall)_(\d{4})$/i);
  if (!match) return { season: null, year: null };
  return { season: match[1].toUpperCase() as "WINTER" | "SPRING" | "SUMMER" | "FALL", year: Number(match[2]) };
}

function mapDate(value: ShikimoriAnime["airedOn"]) {
  return {
    year: value?.year ?? null,
    month: value?.month ?? null,
    day: value?.day ?? null,
  };
}

async function mapToAniListIds(items: ShikimoriAnime[]) {
  const uniqueMalIds = [...new Set(items.map((item) => item.malId).filter((id): id is number => Number.isInteger(id) && Number(id) > 0))];
  if (!uniqueMalIds.length) return new Map<number, number>();

  const fields = uniqueMalIds.map((malId, index) => `m${index}: Media(idMal: ${malId}, type: ANIME) { id }`);
  const response = await fetch(ANILIST_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: `query MirakuIdMap { ${fields.join("\n")} }` }),
    signal: AbortSignal.timeout(9000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`AniList ID mapping failed: ${response.status}`);
  const payload = await response.json();
  if (payload?.errors?.length || !payload?.data) throw new Error("AniList ID mapping returned errors");

  const result = new Map<number, number>();
  uniqueMalIds.forEach((malId, index) => {
    const id = payload.data[`m${index}`]?.id;
    if (Number.isInteger(id)) result.set(malId, id);
  });
  return result;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const category = params.get("category") || "popular";
  const page = Math.max(1, Math.min(1000, Math.floor(Number(params.get("page") || 1)) || 1));
  const perPage = Math.max(1, Math.min(50, Math.floor(Number(params.get("perPage") || 20)) || 20));
  const search = (params.get("q") || "").trim();

  if (!["popular", "trending", "upcoming", "recent", "search"].includes(category)) {
    return NextResponse.json({ error: "Unknown catalog category." }, { status: 400 });
  }
  if (category === "search" && (!search || search.length > 100)) {
    return NextResponse.json({ results: [], page, perPage, total: 0, hasNextPage: false });
  }

  const query = `query MirakuCatalog { animes(${getFilters(category, page, perPage, search)}) { ${SHIKIMORI_FIELDS} } }`;

  try {
    const response = await fetch(SHIKIMORI_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Miraku/1.0 (anime catalog)",
      },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(10000),
      next: { revalidate: category === "search" ? 300 : 1800 },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Shikimori catalog is temporarily unavailable." }, { status: 502 });
    }
    const payload = await response.json();
    if (payload?.errors?.length || !Array.isArray(payload?.data?.animes)) {
      return NextResponse.json({ error: "Shikimori returned an invalid catalog response." }, { status: 502 });
    }

    const items = (payload.data.animes as ShikimoriAnime[]).filter((item) =>
      item && item.rating !== "rx" && item.russian && item.malId
    );
    const ids = await mapToAniListIds(items);
    const results = items.flatMap((item) => {
      const anilistId = item.malId ? ids.get(item.malId) : undefined;
      if (!anilistId) return [];
      const season = mapSeason(item.season);
      const poster = item.poster?.mainUrl || item.poster?.originalUrl || "";
      const score = Number(item.score || 0);
      return [{
        id: anilistId,
        idMal: item.malId,
        title: {
          romaji: item.name || item.russian || "",
          english: item.russian || item.name || "",
          native: item.japanese || null,
        },
        coverImage: { large: poster, extraLarge: item.poster?.originalUrl || poster },
        bannerImage: null,
        format: mapKind(item.kind),
        season: season.season,
        seasonYear: season.year,
        episodes: item.episodes ?? null,
        duration: item.duration ?? null,
        status: mapStatus(item.status),
        averageScore: score ? Math.round(score * 10) : null,
        meanScore: score || null,
        popularity: 0,
        favourites: 0,
        genres: (item.genres || []).map((genre) => genre.russian || genre.name || "").filter(Boolean),
        source: null,
        countryOfOrigin: "JP",
        isAdult: false,
        studios: { nodes: (item.studios || []).map((studio) => ({ id: Number(studio.id), name: studio.name, isAnimationStudio: true })) },
        nextAiringEpisode: null,
        startDate: mapDate(item.airedOn),
        endDate: mapDate(item.releasedOn),
      }];
    });

    const hasNextPage = items.length === perPage;
    return NextResponse.json({
      page,
      perPage,
      total: page * perPage + (hasNextPage ? 1 : 0),
      hasNextPage,
      results,
    }, {
      headers: {
        "Cache-Control": category === "search"
          ? "public, s-maxage=300, stale-while-revalidate=900"
          : "public, s-maxage=1800, stale-while-revalidate=7200",
      },
    });
  } catch {
    return NextResponse.json({ error: "Could not load the Shikimori catalog." }, { status: 502 });
  }
}
