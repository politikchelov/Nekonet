import { api } from "@/lib/api";
import { withRussianTitles } from "@/lib/anilist";
import { getAniListTrending } from "@/lib/anilist";
import { MediaList, PaginatedResponse } from "@/types/miruro-api";
import { useQuery } from "react-query";

export const GET_TRENDING_ANIME = "GET_TRENDING_ANIME";

const getTrendingAnime = async (
  page = 1,
  perPage = 14,
): Promise<PaginatedResponse<MediaList>> => {
  try {
    const shikimori = await fetch(`/api/shikimori/catalog?category=trending&page=${page}&perPage=${perPage}`);
    if (shikimori.ok) {
      const catalog = await shikimori.json();
      if (Array.isArray(catalog.results) && catalog.results.length > 0) {
        return catalog as PaginatedResponse<MediaList>;
      }
    }
  } catch {
    // Fall back to the configured catalog if Shikimori is unavailable.
  }

  if (process.env.NEXT_PUBLIC_API_URL) {
    try {
      const res = await api.get<PaginatedResponse<MediaList>>("/trending", {
        params: { page, per_page: perPage },
      });
      const data = res.data;
      if (data && data.results) {
        return {
          ...data,
          results: await withRussianTitles((data.results || []).filter((item) => !item.isAdult)),
        };
      }
    } catch {
      // Fallback to AniList
    }
  }
  return getAniListTrending(page, perPage);
};

export const useGetTrendingAnime = (page = 1, perPage = 14) => {
  return useQuery({
    queryFn: () => getTrendingAnime(page, perPage),
    queryKey: [GET_TRENDING_ANIME, page, perPage],
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
};
