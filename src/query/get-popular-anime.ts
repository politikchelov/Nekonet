import { api } from "@/lib/api";
import { withRussianTitles } from "@/lib/anilist";
import { getAniListPopular } from "@/lib/anilist";
import { MediaList, PaginatedResponse } from "@/types/miruro-api";
import { useQuery } from "react-query";

export const GET_POPULAR_ANIME = "GET_POPULAR_ANIME";

const getPopularAnime = async (
  page = 1,
  perPage = 20,
): Promise<PaginatedResponse<MediaList>> => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    try {
      const res = await api.get<PaginatedResponse<MediaList>>("/popular", {
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
  return getAniListPopular(page, perPage);
};

export const useGetPopularAnime = (page = 1, perPage = 20) => {
  return useQuery({
    queryFn: () => getPopularAnime(page, perPage),
    queryKey: [GET_POPULAR_ANIME, page, perPage],
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
};
