import { api } from "@/lib/api";
import { withRussianTitles } from "@/lib/anilist";
import { getAniListSpotlight } from "@/lib/anilist";
import { MediaList } from "@/types/miruro-api";
import { useQuery } from "react-query";

export const GET_SPOTLIGHT_ANIME = "GET_SPOTLIGHT_ANIME";

const getSpotlightAnime = async (): Promise<MediaList[]> => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    try {
      const res = await api.get<{ results: MediaList[] }>("/spotlight");
      const list = res.data?.results || [];
      if (list.length > 0) {
        return withRussianTitles(list.filter((item) => !item.isAdult));
      }
    } catch {
      // Fallback to AniList
    }
  }
  return getAniListSpotlight();
};

export const useGetSpotlightAnime = () => {
  return useQuery({
    queryFn: getSpotlightAnime,
    queryKey: [GET_SPOTLIGHT_ANIME],
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
};
