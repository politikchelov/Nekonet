"use client";

import React, { useRef } from "react";
import Container from "@/components/container";
import Avatar from "@/components/common/avatar";
import { useAuthStore } from "@/store/auth-store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { toast } from "sonner";
import AnimeLists from "./components/anime-lists";
import ActivityProgression from "./components/activity-progression";
import Loading from "@/app/loading";
import AnilistImport from "./components/anilist-import";
import { useQuery, useQueryClient } from "react-query";
import { Camera, ImagePlus, UserX, X } from "lucide-react";

export type TargetProfileUser = {
  id: string;
  username: string;
  avatar: string;
  bannerUrl: string;
  profileBackgroundUrl: string;
  collectionId: string;
  collectionName: string;
  created: string;
};

function ProfilePage() {
  const params = useParams();
  const rawUsername = params?.username as string;
  const username = rawUsername ? decodeURIComponent(rawUsername) : "";

  const { auth, setAuth } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const profileBackgroundInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const {
    data: targetUser,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["PUBLIC_PROFILE_USER", username],
    queryFn: async (): Promise<TargetProfileUser> => {
      const supabase = getSupabaseBrowserClient();
      const { data: record, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, banner_url, profile_background_url, created_at")
        .ilike("username", username)
        .single();
      if (error) throw error;

      return {
        id: record.id,
        username: record.username,
        avatar: record.avatar_url || "",
        bannerUrl: record.banner_url || "",
        profileBackgroundUrl: record.profile_background_url || "",
        collectionId: "",
        collectionName: "profiles",
        created: record.created_at,
      };
    },
    enabled: !!username,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const isOwner = !!(auth?.id && targetUser?.id && auth.id === targetUser.id);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!isOwner || !auth) return;
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      toast.error("Use JPG, PNG, WebP or GIF.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Avatar must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${auth.id}/avatar-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("miraku-avatars")
        .upload(filePath, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from("miraku-avatars")
        .getPublicUrl(filePath);
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl.publicUrl, updated_at: new Date().toISOString() })
        .eq("id", auth.id);
      if (profileError) throw profileError;

      setAuth({ ...auth, avatar: publicUrl.publicUrl });
      toast.success("Avatar updated.");
      queryClient.invalidateQueries(["PUBLIC_PROFILE_USER", username]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update avatar.");
    } finally {
      event.target.value = "";
    }
  };

  const handleBannerChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!isOwner || !auth) return;
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      toast.error("Use JPG, PNG, WebP or GIF.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Background must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${auth.id}/banner-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("miraku-avatars")
        .upload(filePath, file, { upsert: false, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from("miraku-avatars")
        .getPublicUrl(filePath);
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ banner_url: publicUrl.publicUrl, updated_at: new Date().toISOString() })
        .eq("id", auth.id);
      if (profileError) throw profileError;

      queryClient.setQueryData<TargetProfileUser>(
        ["PUBLIC_PROFILE_USER", username],
        { ...targetUser, bannerUrl: publicUrl.publicUrl },
      );
      toast.success("Profile background updated.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update background.");
    } finally {
      event.target.value = "";
    }
  };

  const handleProfileBackgroundChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isOwner || !auth) return;
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      toast.error("Use JPG, PNG, WebP or GIF.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile background must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }
    try {
      const supabase = getSupabaseBrowserClient();
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${auth.id}/profile-background-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("miraku-avatars")
        .upload(filePath, file, { upsert: false, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: publicUrl } = supabase.storage.from("miraku-avatars").getPublicUrl(filePath);
      const { error } = await supabase.from("profiles")
        .update({ profile_background_url: publicUrl.publicUrl, updated_at: new Date().toISOString() })
        .eq("id", auth.id);
      if (error) throw error;
      queryClient.setQueryData<TargetProfileUser>(["PUBLIC_PROFILE_USER", username], {
        ...targetUser, profileBackgroundUrl: publicUrl.publicUrl,
      });
      toast.success("Profile page background updated.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update profile page background.");
    } finally {
      event.target.value = "";
    }
  };

  const handleRemoveProfileBackground = async () => {
    if (!isOwner || !auth) return;
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("profiles")
        .update({ profile_background_url: null, updated_at: new Date().toISOString() })
        .eq("id", auth.id);
      if (error) throw error;
      queryClient.setQueryData<TargetProfileUser>(["PUBLIC_PROFILE_USER", username], {
        ...targetUser, profileBackgroundUrl: "",
      });
      toast.success("Profile page background removed.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove profile page background.");
    }
  };

  const handleRemoveBanner = async () => {
    if (!isOwner || !auth) return;
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("profiles")
        .update({ banner_url: null, updated_at: new Date().toISOString() })
        .eq("id", auth.id);
      if (error) throw error;

      queryClient.setQueryData<TargetProfileUser>(
        ["PUBLIC_PROFILE_USER", username],
        { ...targetUser, bannerUrl: "" },
      );
      toast.success("Profile background removed.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove background.");
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  if (isError || !targetUser) {
    return (
      <Container className="min-h-[70vh] mt-24 flex flex-col items-center justify-center text-center">
        <UserX className="h-16 w-16 text-slate-600 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">User Not Found</h2>
        <p className="text-sm text-gray-400 mb-6">
          The user profile &quot;@{username}&quot; does not exist or has been removed.
        </p>
      </Container>
    );
  }

  return (
    <div
      className="relative isolate w-full overflow-hidden bg-slate-950 bg-cover bg-center"
      style={targetUser.profileBackgroundUrl ? { backgroundImage: `url("${targetUser.profileBackgroundUrl}")` } : undefined}
    >
      <div className="absolute inset-0 bg-slate-950/50" aria-hidden="true" />
      <div
        className="w-full h-48 md:h-64 lg:h-72 relative overflow-hidden bg-gradient-to-r from-slate-950/55 via-indigo-950/35 to-slate-950/55 border-b border-white/10 bg-cover bg-center"
        style={targetUser.bannerUrl ? { backgroundImage: `url("${targetUser.bannerUrl}")` } : undefined}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-slate-950/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.25),rgba(255,255,255,0))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e1b4b_1px,transparent_1px),linear-gradient(to_bottom,#1e1b4b_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,#000_60%,transparent_100%)] opacity-25" />

        {isOwner && (
          <div className="absolute right-4 bottom-4 z-10 flex items-center gap-2">
            <input
              ref={bannerFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleBannerChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => bannerFileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-slate-950/70 px-3 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-md transition hover:bg-slate-900"
            >
              <ImagePlus className="h-4 w-4" />
              Change banner
            </button>
            <input ref={profileBackgroundInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleProfileBackgroundChange} className="hidden" />
            <button
              type="button"
              onClick={() => profileBackgroundInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-slate-950/70 px-3 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-md transition hover:bg-slate-900"
            >
              <ImagePlus className="h-4 w-4" />
              Change page background
            </button>
            {targetUser.profileBackgroundUrl && (
              <button
                type="button"
                onClick={handleRemoveProfileBackground}
                aria-label="Remove profile page background"
                className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-slate-950/70 p-2 text-white shadow-lg backdrop-blur-md transition hover:bg-red-950/80"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {targetUser.bannerUrl && (
              <button
                type="button"
                onClick={handleRemoveBanner}
                aria-label="Remove profile background"
                className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-slate-950/70 p-2 text-white shadow-lg backdrop-blur-md transition hover:bg-red-950/80"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      <Container className="relative z-10 min-h-[70vh] mt-10 flex flex-col md:flex-row justify-around gap-8 md:gap-4">
        <div className="flex flex-col items-center gap-4 w-full md:w-1/3">
          <div className="relative group rounded-full overflow-hidden shrink-0">
            <Avatar
              className="w-[150px] h-[150px] cursor-pointer"
              username={targetUser.username}
              url={targetUser.avatar}
              collectionID={targetUser.collectionId}
              id={targetUser.id}
              onClick={() => {
                if (isOwner && fileInputRef.current) {
                  fileInputRef.current.click();
                }
              }}
            />

            {isOwner && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/60 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white p-2 text-center select-none"
              >
                <Camera className="h-7 w-7 text-white mb-1 drop-shadow-md animate-bounce" />
                <span className="text-xs font-bold tracking-wide">Change Avatar</span>
              </div>
            )}
          </div>

          {isOwner && (
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
              className="hidden"
            />
          )}

          <div className="flex flex-col items-center">
            <h2 className="text-xl font-bold text-white">@{targetUser.username}</h2>
            {isOwner && (
              <span className="text-[11px] font-semibold text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20 mt-1">
                Your Profile
              </span>
            )}
          </div>
        </div>

        <div className="w-full md:w-2/3">
          <div className="w-full">
            {isOwner && (
              <div className="float-right flex gap-2 items-center mb-2">
                <p className="text-sm text-gray-500">Import:</p>
                <AnilistImport />
              </div>
            )}

            <Tabs defaultValue="watching" className="w-full">
              <TabsList className="grid w-full grid-cols-1 sm:grid-cols-5">
                <TabsTrigger value="watching">Watching</TabsTrigger>
                <TabsTrigger value="plan-to-watch">Plan To Watch</TabsTrigger>
                <TabsTrigger value="on-hold">On Hold</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="dropped">Dropped</TabsTrigger>
              </TabsList>

              <TabsContent value="watching" className="mt-4">
                <AnimeLists status="watching" userId={targetUser.id} />
              </TabsContent>
              <TabsContent value="plan-to-watch" className="mt-4">
                <AnimeLists status="plan to watch" userId={targetUser.id} />
              </TabsContent>
              <TabsContent value="on-hold" className="mt-4">
                <AnimeLists status="on hold" userId={targetUser.id} />
              </TabsContent>
              <TabsContent value="completed" className="mt-4">
                <AnimeLists status="completed" userId={targetUser.id} />
              </TabsContent>
              <TabsContent value="dropped" className="mt-4">
                <AnimeLists status="dropped" userId={targetUser.id} />
              </TabsContent>
            </Tabs>
          </div>

          <div className="my-10">
            <ActivityProgression targetUser={targetUser} />
          </div>
        </div>
      </Container>
    </div>
  );
}

export default ProfilePage;
