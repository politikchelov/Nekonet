import { SEARCH_ANIME } from "@/constants/query-keys";
import { IAnimeSearch } from "@/types/anime";
import { useQuery } from "react-query";
import { extractAniVibeItems, mapAniVibeMedia } from "@/lib/anivibe-catalog";

const searchAnime = async (query: string, page = 1): Promise<IAnimeSearch> => {
  const term = query.trim();
  if (!term) return { animes: [], totalPages: 1, hasNextPage: false, currentPage: 1 };
  const response = await fetch("/api/anivibe/search?q=" + encodeURIComponent(term), { cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || "Поиск AniVibe временно недоступен.");
  const items = extractAniVibeItems(payload).map(mapAniVibeMedia).filter((item): item is NonNullable<ReturnType<typeof mapAniVibeMedia>> => !!item);
  return {
    animes: items.map((media) => ({
      id: String(media.id),
      name: media.title.romaji,
      jname: media.title.native || "",
      poster: media.coverImage.extraLarge || media.coverImage.large,
      episodes: { sub: media.episodes || 0, dub: media.episodes || 0 },
      type: media.format as any,
    })),
    totalPages: 1,
    hasNextPage: false,
    currentPage: page,
  };
};

export const useGetSearchAnimeResults = (params: { q: string; page: number }) =>
  useQuery({
    queryFn: () => searchAnime(params.q, params.page),
    queryKey: [SEARCH_ANIME, params.q, params.page],
    enabled: true,
    staleTime: 1000 * 60 * 2,
  });
