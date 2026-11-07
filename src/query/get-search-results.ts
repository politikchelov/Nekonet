import { SEARCH_ANIME } from "@/constants/query-keys";
import { api } from "@/lib/api";
import { getAniListSearchResults, withRussianTitles } from "@/lib/anilist";
import { IAnimeSearch, SearchAnimeParams } from "@/types/anime";
import { MediaList, PaginatedResponse } from "@/types/miruro-api";
import { useQuery } from "react-query";

const searchAnime = async (params: SearchAnimeParams): Promise<IAnimeSearch> => {
  const cleanQuery = params.q ? params.q.replace(/^"+|"+$/g, "").trim() : "";
  const hasFilters = Boolean(params.genres || params.season || params.type || params.status || params.rated || params.sort);

  if (!hasFilters && cleanQuery) {
    try {
      const shikimori = await fetch(`/api/shikimori/catalog?category=search&q=${encodeURIComponent(cleanQuery)}&page=${params.page || 1}&perPage=20`);
      if (shikimori.ok) {
        const catalog = await shikimori.json();
        const results = Array.isArray(catalog.results) ? catalog.results : [];
        if (results.length > 0) {
          return {
            animes: results.map((m: MediaList) => ({
              id: String(m.id),
              name: m.title?.english || m.title?.romaji || m.title?.native || "Без названия",
              jname: m.title?.native || m.title?.romaji || "",
              poster: m.coverImage?.extraLarge || m.coverImage?.large || "",
              episodes: { sub: m.episodes || 0, dub: m.episodes || 0 },
              type: m.format as any,
            })),
            totalPages: catalog.hasNextPage ? (params.page || 1) + 1 : (params.page || 1),
            hasNextPage: Boolean(catalog.hasNextPage),
            currentPage: catalog.page || params.page || 1,
          };
        }
      }
    } catch {
      // Fall back to the configured search provider.
    }
  }

  if (process.env.NEXT_PUBLIC_API_URL) {
    try {
      const requestParams: Record<string, any> = {
        page: params.page || 1,
        per_page: 20,
        genre: params.genres || undefined,
        season: params.season ? params.season.toUpperCase() : undefined,
        format: params.type ? params.type.toUpperCase() : undefined,
        status: params.status ? params.status.toUpperCase() : undefined,
        sort: params.sort ? params.sort.toUpperCase() : undefined,
      };

      const cleanQuery = params.q ? params.q.replace(/^"+|"+$/g, "").trim() : "";

      const endpoint =
        cleanQuery && !params.genres && !params.season && !params.type && !params.status
          ? "/search"
          : "/filter";

      if (cleanQuery) {
        requestParams.query = cleanQuery;
      }

      const res = await api.get<PaginatedResponse<MediaList>>(endpoint, {
        params: requestParams,
      });

      const data = res.data;
      if (data && data.results) {
        const results = await withRussianTitles((data.results || []).filter((item) => !item.isAdult));
        const calculatedPages = Math.ceil((data.total || 0) / (data.perPage || 20));
        const totalPages = Math.min(calculatedPages, 20);

        return {
          animes: results.map((m) => ({
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
          hasNextPage: data.hasNextPage,
          currentPage: data.page,
        };
      }
    } catch {
      // Fallback to AniList
    }
  }

  return getAniListSearchResults(params);
};

export const useGetSearchAnimeResults = (params: SearchAnimeParams) => {
  return useQuery({
    queryFn: () => searchAnime(params),
    queryKey: [SEARCH_ANIME, { ...params }],
  });
};
