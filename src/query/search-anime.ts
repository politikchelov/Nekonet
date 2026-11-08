import { SEARCH_ANIME } from "@/constants/query-keys";
import { ISuggestionAnime } from "@/types/anime";
import { useQuery } from "react-query";
import { extractAniVibeItems, mapAniVibeMedia } from "@/lib/anivibe-catalog";

const searchAnime = async (q: string): Promise<ISuggestionAnime[]> => {
  const term = q.trim();
  if (!term) return [];
  const response = await fetch("/api/anivibe/search?q=" + encodeURIComponent(term), { cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || "Поиск AniVibe временно недоступен.");
  return extractAniVibeItems(payload).flatMap((item): ISuggestionAnime[] => {
    const media = mapAniVibeMedia(item);
    if (!media) return [];
    return [{
      id: String(media.id),
      name: media.title.romaji,
      jname: media.title.native || "",
      poster: media.coverImage.extraLarge || media.coverImage.large,
      episodes: { sub: media.episodes || 0, dub: media.episodes || 0 },
      type: media.format as any,
      moreInfo: [media.seasonYear ? String(media.seasonYear) : "", media.format].filter(Boolean),
    }];
  }).slice(0, 8);
};

export const useSearchAnime = (query: string) =>
  useQuery({
    queryFn: () => searchAnime(query),
    queryKey: [SEARCH_ANIME, query],
    enabled: !!query.trim(),
    staleTime: 1000 * 60 * 2,
  });
