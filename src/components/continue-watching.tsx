"use client";

import React, { useEffect, useState } from "react";
import Container from "./container";
import AnimeCard from "./anime-card";
import { ROUTES } from "@/constants/routes";
import { IAnime } from "@/types/anime";
import { History } from "lucide-react";
import useBookMarks, { WatchHistory } from "@/hooks/use-get-bookmark";
import { useAuthStore } from "@/store/auth-store";

type Props = {
  loading: boolean;
};

interface WatchedAnime extends IAnime {
  episode: WatchHistory | string;
}

const ContinueWatching = (props: Props) => {
  const [anime, setAnime] = useState<WatchedAnime[] | null>(null);

  const { auth } = useAuthStore();
  const { bookmarks } = useBookMarks({
    page: 1,
    per_page: 14,
    status: "watching",
  });

  useEffect(() => {
    if (!auth) {
      if (typeof window !== "undefined") {
        const storedData = localStorage.getItem("watched");
        const watchedAnimes: {
          anime: { id: string; title: string; poster: string };
          episodes: string[];
        }[] = storedData ? JSON.parse(storedData) : [];

        if (!Array.isArray(watchedAnimes)) {
          localStorage.removeItem("watched");
          return;
        }

        const animes = watchedAnimes.reverse().map((item) => ({
          id: item.anime.id,
          name: item.anime.title,
          poster: item.anime.poster,
          episode: item.episodes[item.episodes.length - 1],
        }));
        setAnime(animes as WatchedAnime[]);
      }
    } else {
      if (bookmarks && bookmarks.length > 0) {
        const animes = bookmarks
          .map((item) => ({
            id: item.animeId,
            name: item.animeTitle,
            poster: item.thumbnail,
            episode: item.expand?.watchHistory
              ? item.expand.watchHistory.sort(
                  (a, b) => b.episodeNumber - a.episodeNumber,
                )[0]
              : null,
          }))
          .filter((item) => !!item.episode);

        setAnime(animes.length > 0 ? (animes as WatchedAnime[]) : null);
      } else {
        setAnime(null);
      }
    }
  }, [auth, bookmarks]);

  if (props.loading) return <LoadingSkeleton />;
  if (!anime || !anime.length) return null;

  return (
    <Container className="py-8 md:py-12 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-cyan-400 to-indigo-500 shrink-0" />
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-cyan-400" />
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Продолжить просмотр
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3.5 sm:gap-4 md:gap-5 w-full">
        {anime.map(
          (ani, idx) =>
            ani.episode && (
              <div key={`${ani.id}-${idx}`} className="w-full">
                <AnimeCard
                  title={ani.name}
                  poster={ani.poster}
                  href={`${ROUTES.WATCH}?anime=${ani.id}&ep=${
                    typeof ani.episode !== "string" ? ani.episode.episodeNumber : 1
                  }`}
                  watchDetail={
                    typeof ani.episode !== "string" ? ani.episode : null
                  }
                />
              </div>
            ),
        )}
      </div>
    </Container>
  );
};

const LoadingSkeleton = () => {
  return (
    <Container className="py-8 md:py-12 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-6 rounded-full bg-slate-800 shrink-0" />
        <div className="h-7 w-48 rounded-lg bg-slate-800/80 animate-pulse" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 w-full">
        {Array.from({ length: 7 }).map((_, idx) => (
          <div
            key={idx}
            className="aspect-[3/4.2] w-full rounded-2xl bg-slate-900/60 border border-white/5 animate-pulse"
          />
        ))}
      </div>
    </Container>
  );
};

export default ContinueWatching;
