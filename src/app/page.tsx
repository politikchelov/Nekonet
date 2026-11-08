"use client";

import ContinueWatching from "@/components/continue-watching";
import FeaturedCollection from "@/components/featured-collection";
import { useGetRecentAnime } from "@/query/get-recent-anime";
import dynamic from "next/dynamic";
import React, { useMemo } from "react";
import RecentCommentsSection from "@/components/recent-comments-section";

const HeroSection = dynamic(() => import("@/components/hero-section"));
const LatestEpisodesAnime = dynamic(() => import("@/components/latest-episodes-section"));

export default function Home() {
  const { data: recentRes, isLoading } = useGetRecentAnime(1, 14);
  const recentList = recentRes?.results || [];
  const heroList = useMemo(() => recentList.slice(0, 5), [recentList]);
  const featuredList = useMemo(() => recentList.slice(0, 6), [recentList]);

  return (
    <div className="flex flex-col min-h-screen">
      <HeroSection spotlightAnime={heroList} isDataLoading={isLoading} />
      <LatestEpisodesAnime loading={isLoading} />
      <ContinueWatching loading={false} />
      <FeaturedCollection
        loading={isLoading}
        featuredAnime={[
          { title: "Обновления AniVibe", anime: featuredList },
        ]}
      />
      <RecentCommentsSection />
    </div>
  );
}
