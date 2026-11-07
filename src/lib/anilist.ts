import {
  MediaList,
  PaginatedResponse,
} from "@/types/miruro-api";
import { IAnimeDetails } from "@/types/anime-details";
import { IAnimeSearch, ISuggestionAnime, SearchAnimeParams } from "@/types/anime";

const ANILIST_GRAPHQL_ENDPOINT = "https://graphql.anilist.co";

const MEDIA_FIELDS = `
  id
  idMal
  title {
    romaji
    english
    native
  }
  coverImage {
    large
    extraLarge
    color
  }
  bannerImage
  format
  season
  seasonYear
  episodes
  duration
  status
  averageScore
  meanScore
  popularity
  favourites
  genres
  countryOfOrigin
  isAdult
  description
  nextAiringEpisode {
    episode
    airingAt
    timeUntilAiring
  }
  startDate {
    year
    month
    day
  }
  endDate {
    year
    month
    day
  }
  studios {
    nodes {
      name
      isAnimationStudio
    }
  }
`;

export async function fetchAniListGraphQL<T = any>(
  query: string,
  variables: Record<string, any> = {},
): Promise<T> {
  const res = await fetch(ANILIST_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`AniList GraphQL error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  if (json.errors && json.errors.length > 0) {
    throw new Error(json.errors[0]?.message || "AniList GraphQL query error");
  }

  return json.data;
}



type RussianTitleRecord = { malId?: number | string | null; russian?: string | null; rating?: string | null };

async function withRussianTitles<T>(
  items: T[],
  query = "",
  page = 1,
): Promise<T[]> {
  if (!items.length) return items;
  try {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    params.set("page", String(page));
    const response = await fetch("/api/shikimori/titles?" + params.toString(), { cache: "force-cache" });
    if (!response.ok) return items;
    const records = (await response.json()) as RussianTitleRecord[];
    const titles = new Map<string, string>();
    for (const record of records) {
      const malId = record.malId;
      const russian = record.russian?.trim();
      if (malId && russian && record.rating !== "rx") titles.set(String(malId), russian);
    }
    return items.map((item) => {
      const media = item as T & {
        idMal?: number | null;
        title?: { english?: string | null; romaji?: string | null; native?: string | null };
      };
      const russian = media.idMal ? titles.get(String(media.idMal)) : undefined;
      if (!russian || !media.title) return item;
      return { ...media, title: { ...media.title, english: russian } } as T;
    });
  } catch {
    return items;
  }
}

export async function getAniListPopular(
  page: number = 1,
  perPage: number = 20,
): Promise<PaginatedResponse<MediaList>> {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo {
          total
          currentPage
          lastPage
          hasNextPage
          perPage
        }
        media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;

  const data = await fetchAniListGraphQL(query, { page, perPage });
  const pageInfo = data.Page.pageInfo;
  const results = data.Page.media || [];
  const localizedResults = await withRussianTitles(results, "", page);

  return {
    page: pageInfo.currentPage,
    perPage: pageInfo.perPage,
    total: pageInfo.total,
    hasNextPage: pageInfo.hasNextPage,
    results: (localizedResults as unknown as MediaList[]).filter((item) => !item.isAdult),
  };
}

export async function getAniListTrending(
  page: number = 1,
  perPage: number = 14,
): Promise<PaginatedResponse<MediaList>> {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo {
          total
          currentPage
          lastPage
          hasNextPage
          perPage
        }
        media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;

  const data = await fetchAniListGraphQL(query, { page, perPage });
  const pageInfo = data.Page.pageInfo;
  const results = data.Page.media || [];
  const localizedResults = await withRussianTitles(results, "", page);

  return {
    page: pageInfo.currentPage,
    perPage: pageInfo.perPage,
    total: pageInfo.total,
    hasNextPage: pageInfo.hasNextPage,
    results: (localizedResults as unknown as MediaList[]).filter((item) => !item.isAdult),
  };
}

export async function getAniListUpcoming(
  page: number = 1,
  perPage: number = 14,
): Promise<PaginatedResponse<MediaList>> {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo {
          total
          currentPage
          lastPage
          hasNextPage
          perPage
        }
        media(type: ANIME, status: NOT_YET_RELEASED, sort: POPULARITY_DESC, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;

  const data = await fetchAniListGraphQL(query, { page, perPage });
  const pageInfo = data.Page.pageInfo;
  const results = data.Page.media || [];
  const localizedResults = await withRussianTitles(results, "", page);

  return {
    page: pageInfo.currentPage,
    perPage: pageInfo.perPage,
    total: pageInfo.total,
    hasNextPage: pageInfo.hasNextPage,
    results: (localizedResults as unknown as MediaList[]).filter((item) => !item.isAdult),
  };
}

export async function getAniListRecent(
  page: number = 1,
  perPage: number = 20,
): Promise<PaginatedResponse<MediaList>> {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo {
          total
          currentPage
          lastPage
          hasNextPage
          perPage
        }
        media(type: ANIME, sort: UPDATED_AT_DESC, status: RELEASING, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;

  const data = await fetchAniListGraphQL(query, { page, perPage });
  const pageInfo = data.Page.pageInfo;
  const results = data.Page.media || [];
  const localizedResults = await withRussianTitles(results, "", page);

  return {
    page: pageInfo.currentPage,
    perPage: pageInfo.perPage,
    total: pageInfo.total,
    hasNextPage: pageInfo.hasNextPage,
    results: (localizedResults as unknown as MediaList[]).filter((item) => !item.isAdult),
  };
}

export async function getAniListSpotlight(): Promise<MediaList[]> {
  const query = `
    query {
      Page(page: 1, perPage: 8) {
        media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;

  const data = await fetchAniListGraphQL(query);
  const results = (data.Page?.media || []) as MediaList[];
  const localized = await withRussianTitles(results, "", 1);
  return localized.filter((item) => !item.isAdult && item.bannerImage);
}

export async function getAniListAnimeDetails(animeId: string): Promise<IAnimeDetails> {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        ${MEDIA_FIELDS}
        trailer {
          id
          site
          thumbnail
        }
        synonyms
        characters(sort: ROLE, perPage: 12) {
          edges {
            role
            node {
              id
              name {
                full
                native
                userPreferred
              }
              image {
                large
                medium
              }
            }
            voiceActors(language: JAPANESE, sort: RELEVANCE) {
              id
              name {
                full
                native
              }
              image {
                large
              }
              languageV2
            }
          }
        }
        relations {
          edges {
            relationType
            node {
              id
              title {
                english
                romaji
                native
              }
              coverImage {
                large
                extraLarge
              }
              format
              episodes
            }
          }
        }
        recommendations(perPage: 10, sort: RATING_DESC) {
          nodes {
            mediaRecommendation {
              id
              title {
                english
                romaji
                native
              }
              coverImage {
                large
                extraLarge
              }
              format
              episodes
            }
          }
        }
      }
    }
  `;

  const data = await fetchAniListGraphQL(query, { id: parseInt(animeId, 10) });
  const rawMedia = data.Media;
  const localizedMedia = await withRussianTitles([rawMedia], rawMedia?.title?.english || rawMedia?.title?.romaji || "", 1);
  const media = localizedMedia[0] || rawMedia;

  const title =
    media.title?.english || media.title?.romaji || media.title?.native || "Untitled";
  const poster = media.coverImage?.extraLarge || media.coverImage?.large || "";

  const charactersVoiceActors = (media.characters?.edges || [])
    .filter((edge: any) => edge && edge.node && edge.node.id)
    .map((edge: any) => ({
      character: {
        id: String(edge.node.id),
        poster: edge.node.image?.large || "",
        name: edge.node.name?.full || "Unknown",
        cast: edge.role,
      },
      voiceActor: {
        id: String(edge.voiceActors?.[0]?.id || ""),
        poster: edge.voiceActors?.[0]?.image?.large || "",
        name: edge.voiceActors?.[0]?.name?.full || "Unknown",
        cast: edge.voiceActors?.[0]?.languageV2 || "Japanese",
      },
    }));

  const seasons = (media.relations?.edges || [])
    .filter((edge: any) => edge && edge.node && edge.node.id)
    .map((edge: any) => ({
      id: String(edge.node.id),
      name: edge.node.title?.english || edge.node.title?.romaji || "Related Anime",
      title: edge.relationType || "Relation",
      poster: edge.node.coverImage?.large || edge.node.coverImage?.extraLarge || "",
      isCurrent: edge.node.id === media.id,
    }));

  const recommendedAnimes = (media.recommendations?.nodes || [])
    .filter((rec: any) => rec && rec.mediaRecommendation && rec.mediaRecommendation.id)
    .map((rec: any) => {
      const rMedia = rec.mediaRecommendation;
      return {
        id: String(rMedia.id),
        name: rMedia.title?.english || rMedia.title?.romaji || "Untitled",
        jname: rMedia.title?.native || rMedia.title?.romaji || "",
        poster: rMedia.coverImage?.extraLarge || rMedia.coverImage?.large || "",
        duration: `${rMedia.episodes || 0} eps`,
        type: rMedia.format || "TV",
        episodes: {
          sub: rMedia.episodes || 0,
          dub: rMedia.episodes || 0,
        },
      };
    });

  const airedString = media.startDate?.year
    ? `${media.startDate.year}-${media.startDate.month || 1}-${media.startDate.day || 1}`
    : "N/A";

  const studiosString =
    media.studios?.nodes?.map((s: any) => s.name).join(", ") || "N/A";

  const relatedAnimes = (media.relations?.edges || [])
    .filter((edge: any) => edge && edge.node && edge.node.id)
    .map((edge: any) => {
      const rNode = edge.node;
      return {
        id: String(rNode.id),
        name: rNode.title?.english || rNode.title?.romaji || "Untitled",
        jname: rNode.title?.native || rNode.title?.romaji || "",
        poster: rNode.coverImage?.extraLarge || rNode.coverImage?.large || "",
        duration: `${rNode.episodes || 0} eps`,
        type: rNode.format || edge.relationType || "TV",
        episodes: {
          sub: rNode.episodes || 0,
          dub: rNode.episodes || 0,
        },
      };
    });

  return {
    anime: {
      info: {
        id: String(media.id),
        anilistId: media.id,
        malId: media.idMal || 0,
        name: title,
        poster: poster,
        bannerImage: media.bannerImage || media.coverImage?.extraLarge || "",
        description: media.description || "",
        stats: {
          rating: media.averageScore ? `${media.averageScore}%` : "N/A",
          quality: "HD",
          episodes: {
            sub: media.episodes || 0,
            dub: media.episodes || 0,
          },
          type: media.format || "TV",
          duration: media.duration ? `${media.duration} min` : "N/A",
        },
        promotionalVideos: media.trailer?.id
          ? [
              {
                title: "Trailer",
                source:
                  media.trailer.site === "youtube"
                    ? `https://www.youtube.com/watch?v=${media.trailer.id}`
                    : media.trailer.id,
                thumbnail: media.trailer.thumbnail || "",
              },
            ]
          : [],
        charactersVoiceActors,
      },
      moreInfo: {
        japanese: media.title?.native || "",
        synonyms: media.synonyms?.join(", ") || "",
        aired: airedString,
        premiered:
          media.season && media.seasonYear
            ? `${media.season} ${media.seasonYear}`
            : "N/A",
        duration: media.duration ? `${media.duration} min` : "N/A",
        status: media.status || "N/A",
        malscore: media.meanScore ? String(media.meanScore) : "N/A",
        genres: media.genres || [],
        studios: studiosString,
        producers: [],
      },
    },
    seasons,
    mostPopularAnimes: [],
    relatedAnimes,
    recommendedAnimes,
  };
}

export async function getAniListAnimeSchedule(
  targetDateInput?: Date | string | number,
): Promise<{
  scheduledAnimes: Array<{
    id: string;
    name: string;
    jname: string;
    poster: string;
    time: string;
    airingTimestamp: number;
    secondsUntilAiring: number;
    episode: number;
  }>;
}> {
  let target: Date;
  if (targetDateInput instanceof Date) {
    target = new Date(targetDateInput);
  } else if (typeof targetDateInput === "number") {
    target = new Date(targetDateInput);
  } else if (typeof targetDateInput === "string" && targetDateInput.trim()) {
    const parts = targetDateInput.split("-").map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      target = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
    } else {
      target = new Date(targetDateInput);
    }
    if (isNaN(target.getTime())) {
      target = new Date();
    }
  } else {
    target = new Date();
  }

  // Beginning of target day (00:00:00 local time)
  const startOfDay = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
    0,
    0,
    0,
    0,
  );
  const startSeconds = Math.floor(startOfDay.getTime() / 1000);
  const endSeconds = startSeconds + 86400; // 24 hours later

  const query = `
    query ($airingAt_greater: Int, $airingAt_lesser: Int) {
      Page(page: 1, perPage: 50) {
        airingSchedules(
          airingAt_greater: $airingAt_greater,
          airingAt_lesser: $airingAt_lesser,
          sort: TIME
        ) {
          id
          airingAt
          episode
          timeUntilAiring
          media {
            ${MEDIA_FIELDS}
          }
        }
      }
    }
  `;

  const data = await fetchAniListGraphQL(query, {
    airingAt_greater: startSeconds,
    airingAt_lesser: endSeconds,
  });

  const schedules = data.Page?.airingSchedules || [];
  const nowMs = Date.now();

  const scheduledAnimes = schedules.map((item: any) => {
    const airingTimeMs = item.airingAt ? item.airingAt * 1000 : nowMs;
    const diffSec = Math.floor((airingTimeMs - nowMs) / 1000);

    let timeString: string;
    if (diffSec > 0) {
      const hours = Math.floor(diffSec / 3600);
      const minutes = Math.floor((diffSec % 3600) / 60);
      timeString = hours > 0 ? `in ${hours}h ${minutes}m` : `in ${minutes}m`;
    } else {
      timeString = "Aired";
    }

    const m = item.media;
    return {
      id: String(m?.id || item.id),
      name: m?.title?.english || m?.title?.romaji || m?.title?.native || "Untitled",
      jname: m?.title?.native || m?.title?.romaji || "",
      poster: m?.coverImage?.extraLarge || m?.coverImage?.large || "",
      time: timeString,
      airingTimestamp: airingTimeMs,
      secondsUntilAiring: diffSec,
      episode: item.episode || 1,
    };
  });

  return { scheduledAnimes };
}

export async function getAniListAnimeRelations(
  anilistId: string,
): Promise<MediaList[]> {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        relations {
          edges {
            node {
              ${MEDIA_FIELDS}
            }
          }
        }
      }
    }
  `;

  const data = await fetchAniListGraphQL(query, { id: parseInt(anilistId, 10) });
  const edges = data.Media?.relations?.edges || [];
  return edges
    .map((e: any) => e.node as MediaList)
    .filter((item: MediaList) => item && !item.isAdult);
}

const SORT_MAPPING: Record<string, string[]> = {
  default: ["POPULARITY_DESC"],
  "recently-added": ["ID_DESC"],
  "recently-updated": ["UPDATED_AT_DESC"],
  score: ["SCORE_DESC"],
  "name-a-z": ["TITLE_ROMAJI"],
  "released-date": ["START_DATE_DESC"],
  "most-watched": ["POPULARITY_DESC"],
};

const STATUS_MAPPING: Record<string, string> = {
  "finished-airing": "FINISHED",
  "currently-airing": "RELEASING",
  "not-yet-aired": "NOT_YET_RELEASED",
};

const GENRE_OR_TAG_MAP: Record<string, { genre?: string; tag?: string }> = {
  action: { genre: "Action" },
  adventure: { genre: "Adventure" },
  cars: { tag: "Cars" },
  comedy: { genre: "Comedy" },
  dementia: { tag: "Dementia" },
  demons: { tag: "Demons" },
  drama: { genre: "Drama" },
  ecchi: { genre: "Ecchi" },
  fantasy: { genre: "Fantasy" },
  game: { tag: "Video Games" },
  harem: { tag: "Harem" },
  historical: { tag: "Historical" },
  horror: { genre: "Horror" },
  isekai: { tag: "Isekai" },
  josei: { tag: "Josei" },
  kids: { tag: "Kids" },
  magic: { tag: "Magic" },
  "martial-arts": { tag: "Martial Arts" },
  mecha: { genre: "Mecha" },
  military: { tag: "Military" },
  music: { genre: "Music" },
  mystery: { genre: "Mystery" },
  parody: { tag: "Parody" },
  police: { tag: "Police" },
  psychological: { genre: "Psychological" },
  romance: { genre: "Romance" },
  samurai: { tag: "Samurai" },
  school: { tag: "School" },
  "sci-fi": { genre: "Sci-Fi" },
  seinen: { tag: "Seinen" },
  shoujo: { tag: "Shoujo" },
  "shoujo ai": { tag: "Yuri" },
  shounen: { tag: "Shounen" },
  "shounen ai": { tag: "Shounen Ai" },
  "slice-of-life": { genre: "Slice of Life" },
  space: { tag: "Space" },
  sports: { genre: "Sports" },
  "super-power": { tag: "Super Power" },
  supernatural: { genre: "Supernatural" },
  thriller: { genre: "Thriller" },
  vampire: { tag: "Vampire" },
};

export async function getAniListSearchResults(
  params: SearchAnimeParams,
): Promise<IAnimeSearch> {
  const query = `
    query (
      $search: String,
      $page: Int,
      $perPage: Int,
      $format: MediaFormat,
      $status: MediaStatus,
      $season: MediaSeason,
      $genre_in: [String],
      $tag_in: [String],
      $sort: [MediaSort]
    ) {
      Page(page: $page, perPage: $perPage) {
        pageInfo {
          total
          currentPage
          lastPage
          hasNextPage
          perPage
        }
        media(
          search: $search,
          type: ANIME,
          format: $format,
          status: $status,
          season: $season,
          genre_in: $genre_in,
          tag_in: $tag_in,
          sort: $sort,
          isAdult: false
        ) {
          ${MEDIA_FIELDS}
        }
      }
      countCheck: Page(page: 1, perPage: 50) {
        pageInfo {
          total
          hasNextPage
        }
        media(
          search: $search,
          type: ANIME,
          format: $format,
          status: $status,
          season: $season,
          genre_in: $genre_in,
          tag_in: $tag_in,
          isAdult: false
        ) {
          id
        }
      }
    }
  `;

  const cleanQuery = params.q ? params.q.replace(/^"+|"+$/g, "").trim() : "";

  let sortValue = ["POPULARITY_DESC"];
  if (params.sort && SORT_MAPPING[params.sort]) {
    sortValue = SORT_MAPPING[params.sort];
  } else if (cleanQuery) {
    sortValue = ["SEARCH_MATCH", "POPULARITY_DESC"];
  }

  const statusValue = params.status
    ? STATUS_MAPPING[params.status] || (params.status.toUpperCase() as any)
    : undefined;

  const formatValue =
    params.type && params.type !== "all"
      ? (params.type.toUpperCase() as any)
      : undefined;

  const seasonValue = params.season
    ? (params.season.toUpperCase() as any)
    : undefined;

  const genreIn: string[] = [];
  const tagIn: string[] = [];
  if (params.genres) {
    params.genres
      .split(",")
      .map((g) => g.trim().toLowerCase())
      .filter(Boolean)
      .forEach((g) => {
        const mapped = GENRE_OR_TAG_MAP[g];
        if (mapped?.genre) genreIn.push(mapped.genre);
        if (mapped?.tag) tagIn.push(mapped.tag);
      });
  }

  const variables: Record<string, any> = {
    page: params.page || 1,
    perPage: 20,
    search: cleanQuery || undefined,
    format: formatValue,
    status: statusValue,
    season: seasonValue,
    genre_in: genreIn.length ? genreIn : undefined,
    tag_in: tagIn.length ? tagIn : undefined,
    sort: sortValue,
  };

  const data = await fetchAniListGraphQL(query, variables);
  const pageInfo = data.Page?.pageInfo;
  const countCheck = data.countCheck?.pageInfo;
  const results = (data.Page?.media || []) as MediaList[];
  const filtered = results.filter((m) => !m.isAdult);

  const currentPage = pageInfo?.currentPage || params.page || 1;
  const localizedResults = await withRussianTitles(filtered, cleanQuery, currentPage);
  const hasNextPage = Boolean(pageInfo?.hasNextPage);

  let totalPages = 1;
  if (!hasNextPage) {
    totalPages = currentPage;
  } else if (countCheck && !countCheck.hasNextPage && countCheck.total) {
    totalPages = Math.ceil(countCheck.total / 20);
  } else if (pageInfo?.total && pageInfo.total < 5000) {
    totalPages = Math.ceil(pageInfo.total / 20);
  } else {
    totalPages = !cleanQuery ? 20 : currentPage + 1;
  }

  return {
    animes: localizedResults.map((m) => ({
      id: String(m.id),
      name: m.title?.english || m.title?.romaji || m.title?.native || "Untitled",
      jname: m.title?.native || m.title?.romaji || "",
      poster: m.coverImage?.extraLarge || m.coverImage?.large || "",
      episodes: {
        sub: m.episodes || 0,
        dub: m.episodes || 0,
      },
      type: m.format as any,
    })),
    totalPages: totalPages > 0 ? totalPages : 1,
    hasNextPage,
    currentPage,
  };
}

export async function getAniListSearchSuggestions(
  q: string,
): Promise<ISuggestionAnime[]> {
  if (!q.trim()) return [];

  const query = `
    query ($search: String) {
      Page(page: 1, perPage: 8) {
        media(search: $search, type: ANIME, isAdult: false) {
          id
          title {
            english
            romaji
            native
          }
          coverImage {
            large
            extraLarge
          }
          format
          episodes
          status
          startDate {
            year
          }
        }
      }
    }
  `;

  const data = await fetchAniListGraphQL(query, { search: q.trim() });
  const items = data.Page?.media || [];
  const localizedItems = await withRussianTitles(items, q, 1);

  return localizedItems.map((item: any) => ({
    id: String(item.id),
    name: item.title?.english || item.title?.romaji || item.title?.native || "Untitled",
    jname: item.title?.romaji || "",
    poster: item.coverImage?.extraLarge || item.coverImage?.large || "",
    episodes: {
      sub: item.episodes || 0,
      dub: item.episodes || 0,
    },
    type: item.format as any,
    moreInfo: [
      item.startDate?.year ? String(item.startDate.year) : "",
      item.format || "",
      item.status || "",
    ].filter(Boolean),
  }));
}
