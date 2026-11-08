import { getSupabaseBrowserClient } from "@/lib/supabase";
import { IComment } from "@/types/comment";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "react-query";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";

export const GET_COMMENTS_KEY = "GET_COMMENTS";
export const GET_RECENT_COMMENTS_KEY = "GET_RECENT_COMMENTS";

type GetCommentsParams = {
  animeId: string;
  episodeNumber?: number;
  page?: number;
  perPage?: number;
};

const commentSelect = "id,content,user_id,anime_id,anime_title,episode_number,is_spoiler,created_at,updated_at,profiles(id,username,avatar_url)";

const mapComment = (row: any): IComment => ({
  id: row.id,
  content: row.content,
  user: row.user_id,
  animeId: row.anime_id,
  animeTitle: row.anime_title,
  episodeNumber: row.episode_number,
  spoil: row.is_spoiler,
  created: row.created_at,
  updated: row.updated_at,
  expand: {
    user: row.profiles ? {
      id: row.profiles.id,
      username: row.profiles.username,
      avatar: row.profiles.avatar_url || "",
      collectionId: "",
    } : undefined,
  },
});

export const useGetComments = ({ animeId, episodeNumber, page = 1, perPage = 30 }: GetCommentsParams) => {
  return useQuery({
    queryKey: [GET_COMMENTS_KEY, { animeId, episodeNumber, page, perPage }],
    queryFn: async () => {
      let query = getSupabaseBrowserClient()
        .from("comments")
        .select(commentSelect, { count: "exact" })
        .eq("anime_id", animeId)
        .order("created_at", { ascending: false });
      if (episodeNumber !== undefined && episodeNumber !== null) query = query.eq("episode_number", episodeNumber);
      const from = (page - 1) * perPage;
      const { data, error, count } = await query.range(from, from + perPage - 1);
      if (error) throw error;
      return {
        comments: (data || []).map(mapComment),
        totalItems: count || 0,
        totalPages: Math.max(1, Math.ceil((count || 0) / perPage)),
      };
    },
    enabled: !!animeId,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export const useGetInfiniteComments = ({ animeId, episodeNumber, perPage = 10 }: {
  animeId: string;
  episodeNumber?: number;
  perPage?: number;
}) => {
  return useInfiniteQuery({
    queryKey: [GET_COMMENTS_KEY, { animeId, episodeNumber, perPage }],
    queryFn: async ({ pageParam = 1 }) => {
      let query = getSupabaseBrowserClient()
        .from("comments")
        .select(commentSelect, { count: "exact" })
        .eq("anime_id", animeId)
        .order("created_at", { ascending: false });
      if (episodeNumber !== undefined && episodeNumber !== null && episodeNumber > 0) query = query.eq("episode_number", episodeNumber);
      const from = (pageParam - 1) * perPage;
      const { data, error, count } = await query.range(from, from + perPage - 1);
      if (error) throw error;
      return {
        comments: (data || []).map(mapComment),
        totalItems: count || 0,
        totalPages: Math.max(1, Math.ceil((count || 0) / perPage)),
        page: pageParam,
      };
    },
    getNextPageParam: (lastPage) => lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: !!animeId,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export const useGetRecentComments = (limit = 10) => {
  return useQuery({
    queryKey: [GET_RECENT_COMMENTS_KEY, limit],
    queryFn: async () => {
      const { data, error } = await getSupabaseBrowserClient()
        .from("comments")
        .select(commentSelect)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []).map(mapComment);
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export type AddCommentInput = {
  content: string;
  animeId: string;
  animeTitle: string;
  episodeNumber: number;
  spoil: boolean;
};

export const useAddComment = () => {
  const queryClient = useQueryClient();
  const { auth } = useAuthStore();

  return useMutation({
    mutationFn: async (input: AddCommentInput) => {
      if (!auth) throw new Error("You must be logged in to comment.");
      const { data, error } = await getSupabaseBrowserClient()
        .from("comments")
        .insert({
          content: input.content,
          user_id: auth.id,
          anime_id: input.animeId,
          anime_title: input.animeTitle,
          episode_number: input.episodeNumber,
          is_spoiler: input.spoil,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Comment posted successfully!");
      queryClient.invalidateQueries(GET_COMMENTS_KEY);
      queryClient.invalidateQueries(GET_RECENT_COMMENTS_KEY);
    },
    onError: (error: any) => toast.error(error?.message || "Failed to post comment"),
  });
};
