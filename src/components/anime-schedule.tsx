"use client";

import React, { useMemo, useState } from "react";
import Container from "./container";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useGetAnimeSchedule } from "@/query/get-anime-schedule";
import { Button } from "./ui/button";
import Link from "next/link";
import Image from "next/image";
import { ROUTES } from "@/constants/routes";
import { Clock, Play, Calendar } from "lucide-react";

function AnimeSchedule() {
  const currentDate = useMemo(() => new Date(), []);
  const currentDay = useMemo(
    () =>
      currentDate.toLocaleString("en-US", { weekday: "long" }).toLowerCase(),
    [currentDate],
  );
  const daysOfWeek = useMemo(
    () => [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ],
    [],
  );
  const [currentSelectedTab, setCurrentSelectedTab] = useState<string>(currentDay);

  const defaultTab = daysOfWeek.includes(currentDay) ? currentDay : "monday";

  // Map JS Sunday (0) to 6, Monday (1) to 0
  const currentDayOfWeek = (currentDate.getDay() + 6) % 7;

  const getDateForWeekday = (targetDay: string) => {
    const targetIndex = daysOfWeek.indexOf(targetDay);
    const date = new Date(currentDate);
    const diff = targetIndex - currentDayOfWeek;
    date.setDate(currentDate.getDate() + diff);
    return date;
  };

  const selectedDate = useMemo(() => {
    const date = getDateForWeekday(currentSelectedTab);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, [currentSelectedTab, currentDayOfWeek]);

  const { isLoading, data } = useGetAnimeSchedule(selectedDate);

  return (
    <Container className="py-8 md:py-12 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-indigo-500 to-cyan-400 shrink-0" />
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-indigo-400" />
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Airing Schedule
          </h2>
        </div>
      </div>

      <Tabs
        defaultValue={defaultTab}
        onValueChange={(val) => setCurrentSelectedTab(val)}
        value={currentSelectedTab}
        className="w-full flex flex-col lg:flex-row gap-6"
      >
        {/* Days of Week Tab Rail */}
        <TabsList className="flex flex-row lg:flex-col justify-start items-stretch gap-1.5 w-full lg:w-56 shrink-0 h-full p-1.5 bg-[#0d121d] border border-white/10 rounded-2xl overflow-x-auto no-scrollbar">
          {daysOfWeek.map((day) => {
            const dateObj = getDateForWeekday(day);
            const isToday = day === currentDay;

            return (
              <TabsTrigger
                key={day}
                value={day}
                className="shrink-0 flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-all duration-200 text-slate-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-violet-600 data-[state=active]:text-white hover:text-white hover:bg-white/5"
              >
                <div className="flex flex-col items-start">
                  <span className="font-bold text-xs uppercase tracking-wider">
                    {day}
                  </span>
                  <span className="text-[10px] opacity-75">
                    {dateObj.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                     
                    })}
                  </span>
                </div>
                {isToday && (
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-bold">
                    TODAY
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Schedule Cards Content */}
        <div className="flex-1 w-full min-h-[300px]">
          {isLoading ? (
            <LoadingSkeleton />
          ) : (
            daysOfWeek.map((day) => (
              <TabsContent key={day} value={day} className="mt-0">
                {day === currentSelectedTab &&
                  (data?.scheduledAnimes && data.scheduledAnimes.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5 w-full">
                      {data.scheduledAnimes.map((anime, idx) => {
                        const timeFormatted = new Date(
                          anime.airingTimestamp,
                        ).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: false,
                        });

                        return (
                          <div
                            key={`${anime.id}-${anime.episode}-${idx}`}
                            className="flex flex-row gap-3.5 p-3 rounded-2xl bg-[#0d121d] border border-white/10 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-200 group relative overflow-hidden"
                          >
                            {/* Small Poster Thumbnail */}
                            {anime.poster ? (
                              <div className="h-24 w-16 shrink-0 overflow-hidden rounded-xl relative bg-slate-900 border border-white/5">
                                <Image
                                  src={anime.poster}
                                  alt={anime.name}
                                  fill
                                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                                  unoptimized
                                />
                              </div>
                            ) : (
                              <div className="h-24 w-16 shrink-0 bg-slate-900 rounded-xl flex items-center justify-center">
                                <Clock className="h-6 w-6 text-slate-500" />
                              </div>
                            )}

                            {/* Info Column */}
                            <div className="flex flex-col justify-between flex-1 min-w-0 py-0.5">
                              <div className="flex flex-col gap-1">
                                <span className="text-[11px] text-cyan-400 flex items-center gap-1 font-semibold">
                                  <Clock className="h-3 w-3" />
                                  {timeFormatted}
                                </span>
                                <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-indigo-300 transition-colors">
                                  {anime.name}
                                </h3>
                              </div>

                              <div className="flex items-center justify-between gap-2 mt-2">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                                  Ep {anime.episode}
                                </span>
                                <Link href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}>
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs bg-slate-800 hover:bg-indigo-600 text-white px-3 rounded-lg flex items-center gap-1.5 transition-all duration-200 font-semibold"
                                  >
                                    <Play className="h-3 w-3 fill-current" /> Details
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center min-h-[220px] rounded-2xl bg-[#0d121d] border border-white/5 p-8 text-center">
                      <Clock className="h-8 w-8 text-slate-500 mb-2 opacity-60" />
                      <p className="text-sm font-semibold text-slate-300">
                        No scheduled anime for this day
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Check back later or browse other days of the week.
                      </p>
                    </div>
                  ))}
              </TabsContent>
            ))
          )}
        </div>
      </Tabs>
    </Container>
  );
}

const LoadingSkeleton = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5 w-full">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div
          key={idx}
          className="h-28 rounded-2xl bg-[#0d121d] border border-white/5 animate-pulse"
        />
      ))}
    </div>
  );
};

export default AnimeSchedule;
