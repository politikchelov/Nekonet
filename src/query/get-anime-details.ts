import { GET_ANIME_DETAILS } from "@/constants/query-keys";
import { IAnimeDetails } from "@/types/anime-details";
import { mapAniVibeDetails } from "@/lib/anivibe-catalog";
import { useQuery } from "react-query";

const getAnimeDetails = async (animeId: string): Promise<IAnimeDetails> => {
  const response = await fetch("/api/anivibe/anime/" + encodeURIComponent(animeId), { cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || "AniVibe: не удалось загрузить карточку аниме.");
  return mapAniVibeDetails(payload, animeId);
};

export const useGetAnimeDetails = (animeId: string) =>
  useQuery({
    queryFn: () => getAnimeDetails(animeId),
    queryKey: [GET_ANIME_DETAILS, animeId],
    enabled: !!animeId,
    staleTime: 1000 * 60 * 5,
  });
