import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth-store";
import { useQuery, useQueryClient } from "react-query";
import { toast } from "sonner";

export const GET_BOOKMARKS_KEY = "GET_BOOKMARKS";

type Props = {
  animeID?: string;
  status?: string;
  userId?: string;
  page?: number;
  per_page?: number;
  populate?: boolean;
};

export type WatchHistory = {
  id: string;
  current: number;
  timestamp: number;
  episodeId?: string;
  episodeNumber: number;
  created: string;
};

export type Bookmark = {
  id: string;
  user: string;
  animeId: string;
  thumbnail: string;
  animeTitle: string;
  status: string;
  created: string;
  expand: { watchHistory: WatchHistory[] };
};

type SupabaseBookmark = {
  id: string;
  user_id: string;
  anime_id: string;
  anime_title: string;
  thumbnail: string;
  status: string;
  created_at: string;
  watch_history: {
    id: string;
    episode_number: number;
    episode_id: string | null;
    current_seconds: number;
    duration_seconds: number;
    created_at: string;
  }[];
};

const toBookmark = (row: SupabaseBookmark): Bookmark => ({
  id: row.id,
  user: row.user_id,
  animeId: row.anime_id,
  animeTitle: row.anime_title,
  thumbnail: row.thumbnail,
  status: row.status.replaceAll("_", " "),
  created: row.created_at,
  expand: {
    watchHistory: (row.watch_history || []).map((watch) => ({
      id: watch.id,
      episodeNumber: watch.episode_number,
      episodeId: watch.episode_id || undefined,
      current: watch.current_seconds,
      timestamp: watch.duration_seconds,
      created: watch.created_at,
    })),
  },
});

function useBookMarks({
  animeID,
  status,
  userId,
  page = 1,
  per_page = 20,
  populate = true,
}: Props) {
  const { auth } = useAuthStore();
  const queryClient = useQueryClient();
  const targetUserId = userId || auth?.id;

  const { data, isLoading } = useQuery({
    queryKey: [GET_BOOKMARKS_KEY, { animeID, status, page, per_page, userId: targetUserId }],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      let query = supabase
        .from("bookmarks")
        .select("id,user_id,anime_id,anime_title,thumbnail,status,created_at,watch_history(id,episode_number,episode_id,current_seconds,duration_seconds,created_at)", { count: "exact" })
        .eq("user_id", targetUserId!)
        .order("updated_at", { ascending: false });

      if (animeID) query = query.eq("anime_id", animeID);
      if (status) query = query.eq("status", status.replaceAll(" ", "_"));
      const from = (page - 1) * per_page;
      const { data: rows, error, count } = await query.range(from, from + per_page - 1);
      if (error) throw error;
      return {
        bookmarks: (rows as unknown as SupabaseBookmark[]).map(toBookmark),
        totalPages: Math.ceil((count || 0) / per_page),
      };
    },
    enabled: populate && !!targetUserId,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const createOrUpdateBookMark = async (
    animeID: string,
    animeTitle: string,
    animeThumbnail: string,
    status: string,
    showToast = true,
  ): Promise<string | null> => {
    if (!auth) return null;
    try {
      const supabase = getSupabaseBrowserClient();
      const normalizedStatus = status.replaceAll(" ", "_");
      const { data: existing, error: lookupError } = await supabase
        .from("bookmarks")
        .select("id,status")
        .eq("user_id", auth.id)
        .eq("anime_id", animeID)
        .maybeSingle();
      if (lookupError) throw lookupError;

      if (existing?.status === normalizedStatus) {
        if (showToast) toast.error("Already in this status");
        return existing.id;
      }

      const { data: saved, error } = await supabase
        .from("bookmarks")
        .upsert({
          ...(existing?.id ? { id: existing.id } : {}),
          user_id: auth.id,
          anime_id: animeID,
          anime_title: animeTitle,
          thumbnail: animeThumbnail || "",
          status: normalizedStatus,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,anime_id" })
        .select("id")
        .single();
      if (error) throw error;

      if (showToast) toast.success(existing ? "Successfully updated status" : "Successfully added to list");
      queryClient.invalidateQueries(GET_BOOKMARKS_KEY);
      return saved.id;
    } catch (error) {
      console.error("Bookmark save failed:", error);
      if (showToast) toast.error("Could not save anime to your list");
      return null;
    }
  };

  const syncWatchProgress = async (
    bookmarkId: string | null,
    watchedRecordId: string | null,
    episodeData: { episodeId?: string; episodeNumber: number; current: number; duration: number },
  ): Promise<string | null> => {
    if (!auth || !bookmarkId) return watchedRecordId;
    try {
      const supabase = getSupabaseBrowserClient();
      const payload = {
        ...(watchedRecordId ? { id: watchedRecordId } : {}),
        bookmark_id: bookmarkId,
        user_id: auth.id,
        episode_number: episodeData.episodeNumber,
        episode_id: episodeData.episodeId || null,
        current_seconds: Math.round(episodeData.current),
        duration_seconds: Math.round(episodeData.duration),
        updated_at: new Date().toISOString(),
      };
      const { data: saved, error } = await supabase
        .from("watch_history")
        .upsert(payload, { onConflict: "bookmark_id,episode_number" })
        .select("id")
        .single();
      if (error) throw error;
      queryClient.invalidateQueries(GET_BOOKMARKS_KEY);
      return saved.id;
    } catch (error) {
      console.error("Watch progress sync failed:", error);
      return watchedRecordId;
    }
  };

  return {
    bookmarks: data?.bookmarks?.length ? data.bookmarks : null,
    syncWatchProgress,
    createOrUpdateBookMark,
    totalPages: data?.totalPages ?? 0,
    isLoading,
  };
}

export default useBookMarks;
