import { useQuery } from "react-query";
import { MediaList, PaginatedResponse } from "@/types/miruro-api";
import { getAniVibeNextCursor, mapAniVibeList } from "@/lib/anivibe-catalog";

export const GET_RECENT_ANIME = "GET_RECENT_ANIME";
const cursors = new Map<number, string>();

const getRecentAnime = async (page = 1, perPage = 20): Promise<PaginatedResponse<MediaList>> => {
  const cursor = page > 1 ? cursors.get(page - 1) : undefined;
  if (page > 1 && !cursor) return { page, perPage, total: 0, hasNextPage: false, results: [] };
  const url = new URL("/api/anivibe/recent", window.location.origin);
  if (cursor) url.searchParams.set("cursor", cursor);
  const response = await fetch(url.toString(), { cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || "AniVibe: не удалось загрузить обновления.");
  const nextCursor = getAniVibeNextCursor(payload);
  if (nextCursor) cursors.set(page, nextCursor);
  else cursors.delete(page);
  return mapAniVibeList(payload, page, perPage);
};

export const useGetRecentAnime = (page = 1, perPage = 20) =>
  useQuery({
    queryFn: () => getRecentAnime(page, perPage),
    queryKey: [GET_RECENT_ANIME, page, perPage],
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });
