"use client";

import React, { useState } from "react";
import Container from "./container";
import AnimeCard from "./anime-card";
import { ROUTES } from "@/constants/routes";
import { useGetRecentAnime } from "@/query/get-recent-anime";
import { Button } from "./ui/button";
import { ChevronLeft, ChevronRight, Zap } from "lucide-react";

type Props = {
  loading?: boolean;
};

const LatestEpisodesAnime = ({ loading: initialLoading }: Props) => {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useGetRecentAnime(page, 14);

  const episodesList = data?.results || [];
  const hasNextPage = data?.hasNextPage ?? false;

  // Keep the previous page visible while the next page is fetched.
  if (isLoading || initialLoading || !episodesList.length) {
    return <LoadingSkeleton />;
  }

  return (
    <Container className="py-8 md:py-12 flex flex-col gap-6 relative z-20">
      {/* Header */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-amber-400 to-indigo-500 shrink-0" />
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-400" />
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Недавно обновлено
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium mr-1">
            Страница {page}
          </span>
          <Button
            size="icon"
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page <= 1}
            className="h-8 w-8 rounded-lg bg-slate-900 border border-white/10 text-white hover:bg-indigo-600 hover:border-indigo-500 disabled:opacity-30 disabled:hover:bg-slate-900 transition-all"
            aria-label="Предыдущая страница"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasNextPage}
            className="h-8 w-8 rounded-lg bg-slate-900 border border-white/10 text-white hover:bg-indigo-600 hover:border-indigo-500 disabled:opacity-30 disabled:hover:bg-slate-900 transition-all"
            aria-label="Следующая страница"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3.5 sm:gap-4 md:gap-5 w-full">
        {episodesList.map((anime, idx) => {
          const title =
            anime.title?.english || anime.title?.romaji || anime.title?.native || "Untitled";
          const subTitle = anime.title?.english ? anime.title?.romaji : undefined;
          const poster =
            anime.coverImage?.extraLarge || anime.coverImage?.large || "";
          const epNum = anime.episodes || 1;

          return (
            <div key={`${anime.id}-${idx}`} className="w-full">
              <AnimeCard
                title={title}
                subTitle={subTitle}
                format={anime.format}
                score={anime.averageScore}
                episodes={epNum}
                poster={poster}
                href={`${ROUTES.WATCH}?anime=${anime.id}&ep=${epNum}`}
                episodeCard
              />
            </div>
          );
        })}
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
        {Array.from({ length: 14 }).map((_, idx) => (
          <div
            key={idx}
            className="aspect-[3/4.2] w-full rounded-2xl bg-slate-900/60 border border-white/5 animate-pulse"
          />
        ))}
      </div>
    </Container>
  );
};

export default LatestEpisodesAnime;
