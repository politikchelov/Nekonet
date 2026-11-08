import type { MediaList, PaginatedResponse } from "@/types/miruro-api";
import type { IAnimeDetails } from "@/types/anime-details";

type AnyRecord = Record<string, any>;

const record = (value: unknown): AnyRecord | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as AnyRecord : null;

const first = (source: AnyRecord, keys: string[]) => {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
};

const str = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : fallback;

const unwrap = (value: unknown, depth = 0): AnyRecord => {
  const obj = record(value) || {};
  if (depth > 4) return obj;
  for (const key of ["data", "result", "anime", "item", "payload"]) {
    const nested = record(obj[key]);
    if (nested) return unwrap(nested, depth + 1);
  }
  return obj;
};

export const extractAniVibeItems = (payload: unknown): AnyRecord[] => {
  const visit = (value: unknown, depth = 0): AnyRecord[] => {
    if (depth > 5) return [];
    if (Array.isArray(value)) return value.map(record).filter((v): v is AnyRecord => !!v);
    const obj = record(value);
    if (!obj) return [];
    for (const key of ["results", "items", "animes", "anime", "updates", "recent", "data"]) {
      const candidate = obj[key];
      if (Array.isArray(candidate)) return candidate.map(record).filter((v): v is AnyRecord => !!v);
    }
    for (const key of ["data", "result", "payload"]) {
      const found = visit(obj[key], depth + 1);
      if (found.length) return found;
    }
    return [];
  };
  return visit(payload);
};

const titleOf = (item: AnyRecord) => {
  const titles = record(item.titles) || record(item.title);
  const russian = str(first(item, ["title_ru", "russian", "name_ru", "title_russian"])) ||
    (titles ? str(first(titles, ["ru", "russian"])) : "") ||
    (typeof item.title === "string" ? item.title : "") ||
    str(first(item, ["name", "title_en", "english_title"]));
  const original = str(first(item, ["title_original", "original_title", "japanese", "title_jp"])) ||
    (titles ? str(first(titles, ["original", "jp", "ja", "native"])) : "");
  return { russian: russian || "Без названия", original };
};

const posterOf = (item: AnyRecord) => {
  const poster = record(item.poster) || record(item.cover) || record(item.image);
  return str(first(item, ["poster_url", "image_url", "cover_url", "poster", "image"])) ||
    (poster ? str(first(poster, ["url", "original", "large", "medium", "src"])) : "");
};

const numeric = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const mapAniVibeMedia = (raw: AnyRecord): MediaList | null => {
  const item = unwrap(raw);
  const id = numeric(first(item, ["id", "anime_id", "shikimori_id", "shikimoriId", "mal_id"]));
  if (!id) return null;
  const titles = titleOf(item);
  const episodes = numeric(first(item, ["episodes", "episodes_count", "episode_count", "episodes_aired"]));
  const score = numeric(first(item, ["score", "rating", "rating_score"]));
  const genresValue = first(item, ["genres", "genre"]);
  const genres = Array.isArray(genresValue)
    ? genresValue.map((g) => typeof g === "string" ? g : str(record(g)?.russian || record(g)?.name)).filter(Boolean)
    : [];
  const kind = str(first(item, ["kind", "type", "format"])).toUpperCase();
  const format = kind.includes("MOVIE") || kind.includes("FILM") ? "MOVIE"
    : kind.includes("OVA") ? "OVA" : kind.includes("ONA") ? "ONA"
    : kind.includes("SPECIAL") ? "SPECIAL" : "TV";
  const statusValue = str(first(item, ["status", "release_status"])).toLowerCase();
  const status = statusValue.includes("ongoing") || statusValue.includes("airing") ? "RELEASING"
    : statusValue.includes("anons") || statusValue.includes("upcoming") ? "NOT_YET_RELEASED"
    : statusValue.includes("cancel") ? "CANCELLED" : "FINISHED";
  const year = numeric(first(item, ["year", "season_year", "aired_year"]), 0) || null;
  const poster = posterOf(item);
  return {
    id,
    title: { romaji: titles.russian, english: null, native: titles.original || null },
    coverImage: { large: poster, extraLarge: poster },
    bannerImage: str(first(item, ["banner", "banner_url", "banner_image"])) || null,
    format,
    season: null,
    seasonYear: year,
    episodes: episodes || null,
    duration: numeric(first(item, ["duration", "duration_minutes"])) || null,
    status,
    averageScore: score ? Math.round(score <= 10 ? score * 10 : score) : null,
    meanScore: score || null,
    popularity: 0,
    favourites: 0,
    genres,
    source: null,
    countryOfOrigin: "JP",
    isAdult: false,
    studios: { nodes: [] },
    nextAiringEpisode: null,
    startDate: { year, month: null, day: null },
    endDate: { year: null, month: null, day: null },
  };
};

export const getAniVibeNextCursor = (payload: unknown): string => {\n  const root = record(payload) || {};\n  const meta = record(root.pagination) || record(root.meta) || {};\n  return str(first(root, ["next_cursor", "nextCursor", "continue_cursor", "continueCursor"]) ?? first(meta, ["next_cursor", "nextCursor", "next"]));\n};\n\nexport const mapAniVibeList = (payload: unknown, page = 1, perPage = 20): PaginatedResponse<MediaList> => {
  const root = record(payload) || {};
  const results = extractAniVibeItems(payload).map(mapAniVibeMedia).filter((item): item is MediaList => !!item);
  const cursor = first(root, ["next_cursor", "nextCursor", "continue_cursor", "continueCursor"]);
  const meta = record(root.pagination) || record(root.meta) || {};
  const next = cursor ?? first(meta, ["next_cursor", "nextCursor", "next"]);
  return {
    page,
    perPage,
    total: numeric(first(root, ["total", "count"]), results.length),
    hasNextPage: Boolean(next),
    results,
  };
};

export const mapAniVibeDetails = (payload: unknown, id: string): IAnimeDetails => {
  const item = unwrap(payload);
  const mapped = mapAniVibeMedia(item) || mapAniVibeMedia({ ...item, id });
  const info = mapped!;
  const titles = titleOf(item);
  const description = str(first(item, ["description", "synopsis", "plot", "description_ru"]));
  const episodes = info.episodes || 0;
  const score = info.averageScore ? String(info.averageScore) + "%" : "N/A";
  const genres = info.genres || [];
  const studios = first(item, ["studios", "studio"]);
  const studioText = Array.isArray(studios)
    ? studios.map((s) => typeof s === "string" ? s : str(record(s)?.name)).filter(Boolean).join(", ")
    : str(studios, "N/A");
  return {
    anime: {
      info: {
        id: String(info.id), anilistId: info.id, malId: info.id,
        name: titles.russian, poster: info.coverImage.large,
        bannerImage: info.bannerImage || undefined, description,
        stats: { rating: score, quality: "HD", episodes: { sub: episodes, dub: episodes }, type: info.format, duration: info.duration ? info.duration + " min" : "N/A" },
        promotionalVideos: [], charactersVoiceActors: [],
      },
      moreInfo: {
        japanese: titles.original, synonyms: "", aired: info.seasonYear ? String(info.seasonYear) : "N/A",
        premiered: info.seasonYear ? String(info.seasonYear) : "N/A",
        duration: info.duration ? info.duration + " min" : "N/A",
        status: str(first(item, ["status", "release_status"]), "N/A"),
        malscore: score, genres, studios: studioText || "N/A", producers: [],
      },
    },
    seasons: [], mostPopularAnimes: [], relatedAnimes: [], recommendedAnimes: [],
  };
};
