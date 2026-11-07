"use client";

import { useEffect, useState } from "react";
import { Loader2, Play, Search, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type RecordValue = Record<string, unknown>;
type AnimeOption = { id: number; title: string; year?: string };
type EpisodeOption = { number: number; title?: string };

const asRecord = (value: unknown): RecordValue | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : null;

const textField = (record: RecordValue, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
};

const findArray = (value: unknown, keys: string[], depth = 0): unknown[] => {
  if (depth > 4) return [];
  if (Array.isArray(value)) return value;
  const record = asRecord(value);
  if (!record) return [];
  for (const key of keys) if (Array.isArray(record[key])) return record[key] as unknown[];
  for (const key of ["data", "result", "anime", "payload"]) {
    const found = findArray(record[key], keys, depth + 1);
    if (found.length) return found;
  }
  return [];
};

const getAnimeOptions = (payload: unknown): AnimeOption[] => {
  const options: AnimeOption[] = [];
  for (const item of findArray(payload, ["results", "items", "animes", "anime", "data"])) {
    const record = asRecord(item);
    if (!record) continue;
    const id = Number(textField(record, ["id", "anime_id", "shikimori_id", "shikimoriId"]));
    const title = textField(record, ["title_ru", "russian", "name_ru", "title", "name", "title_en"]);
    if (Number.isSafeInteger(id) && id > 0 && title) {
      options.push({ id, title, year: textField(record, ["year", "season_year", "aired_year"]) });
    }
  }
  return options.slice(0, 12);
};

const getEpisodes = (payload: unknown): EpisodeOption[] => {
  const options: EpisodeOption[] = [];
  for (const item of findArray(payload, ["episodes", "items", "results", "data"])) {
    const record = asRecord(item);
    if (!record) continue;
    const number = Number(textField(record, ["number", "episode", "episode_number", "ordinal"]));
    if (Number.isSafeInteger(number) && number > 0) {
      options.push({ number, title: textField(record, ["title_ru", "russian", "title", "name"]) });
    }
  }
  return options.sort((a, b) => a.number - b.number);
};

const findEmbedUrl = (payload: unknown, depth = 0): string => {
  if (depth > 5) return "";
  if (typeof payload === "string" && /^https:\/\//i.test(payload)) return payload;
  const record = asRecord(payload);
  if (!record) return "";
  for (const key of ["iframe_url", "iframeUrl", "embed_url", "embedUrl", "player_url", "playerUrl", "iframe", "url", "src"]) {
    const value = record[key];
    if (typeof value === "string" && /^https:\/\//i.test(value)) return value;
  }
  for (const key of ["data", "result", "embed", "player"]) {
    const found = findEmbedUrl(record[key], depth + 1);
    if (found) return found;
  }
  return "";
};

const apiError = (payload: unknown, status: number) => {
  const record = asRecord(payload);
  const message = record ? textField(record, ["error", "message", "detail", "reason"]) : "";
  if (message) return message;
  if (status === 401) return "AniVibe отклонил API-ключ (401).";
  if (status === 403) return "AniVibe запретил запрос для этого домена (403).";
  if (status === 429) return "AniVibe временно ограничил запросы. Подожди немного.";
  return "AniVibe не смог создать ссылку плеера. Код: " + status;
};

type Props = { animeTitle: string; initialEpisode?: number };

export default function AniVibePlayer({ animeTitle, initialEpisode = 1 }: Props) {
  const [query, setQuery] = useState(animeTitle);
  const [results, setResults] = useState<AnimeOption[]>([]);
  const [selectedAnime, setSelectedAnime] = useState<AnimeOption | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeOption[]>([]);
  const [episode, setEpisode] = useState(initialEpisode);
  const [embedUrl, setEmbedUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const launchPlayer = async (item: AnimeOption, episodeNumber: number) => {
    setLoading(true);
    setError("");
    setEmbedUrl("");
    try {
      const response = await fetch("/api/anivibe/embed-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anime_id: item.id, episode: episodeNumber }),
      });
      const payload: unknown = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(apiError(payload, response.status));
      const url = findEmbedUrl(payload);
      if (!url) throw new Error("AniVibe ответил без ссылки iframe. Нужно проверить формат ответа API.");
      setEmbedUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось открыть плеер AniVibe.");
    } finally {
      setLoading(false);
    }
  };

  const chooseAnime = async (item: AnimeOption, autoplay = true) => {
    setSelectedAnime(item);
    setEpisodes([]);
    setEpisode(initialEpisode);
    setEmbedUrl("");
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/anivibe/anime/" + item.id + "/episodes");
      const payload: unknown = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error("Не удалось загрузить серии AniVibe (код " + response.status + ").");
      const found = getEpisodes(payload);
      setEpisodes(found);
      const nextEpisode = found.some((entry) => entry.number === initialEpisode)
        ? initialEpisode
        : found[0]?.number || initialEpisode;
      setEpisode(nextEpisode);
      if (autoplay) await launchPlayer(item, nextEpisode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить аниме.");
    } finally {
      setLoading(false);
    }
  };

  const searchAnime = async (searchQuery: string) => {
    const term = searchQuery.trim();
    if (!term) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/anivibe/search?q=" + encodeURIComponent(term));
      const payload: unknown = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error("Поиск AniVibe завершился ошибкой (код " + response.status + ").");
      const found = getAnimeOptions(payload);
      setResults(found);
      if (!found.length) {
        setSelectedAnime(null);
        setEmbedUrl("");
        throw new Error("AniVibe не нашёл это аниме. Попробуй другое название.");
      }
      const normalized = term.toLocaleLowerCase("ru").replace(/[ё]/g, "е").trim();
      const best = found.find((item) =>
        item.title.toLocaleLowerCase("ru").replace(/[ё]/g, "е").trim() === normalized
      ) || found[0];
      await chooseAnime(best, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка подключения к AniVibe.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (animeTitle.trim()) {
      setQuery(animeTitle);
      void searchAnime(animeTitle);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animeTitle]);

  return (
    <section className="w-full space-y-4 rounded-2xl border border-cyan-500/20 bg-[#0d121d] p-4 sm:p-5 shadow-xl">
      <div className="flex items-center gap-2">
        <Tv className="h-5 w-5 text-cyan-400" />
        <div>
          <h2 className="text-base font-bold text-white">Смотреть на AniVibe</h2>
          <p className="text-xs text-slate-400">Аниме подбирается автоматически — серия запускается сама</p>
        </div>
      </div>

      {animeTitle.trim() ? (
        <details className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
          <summary className="cursor-pointer text-sm text-slate-300">Не то аниме? Найти другое</summary>
          <form className="mt-3 flex flex-col sm:flex-row gap-2" onSubmit={(event) => {
            event.preventDefault();
            void searchAnime(query);
          }}>
            <Input value={query} onChange={(event) => setQuery(event.target.value)}
              placeholder="Название аниме..." className="bg-slate-950/70 border-white/10 text-white" />
            <Button type="submit" disabled={loading || !query.trim()} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Найти
            </Button>
          </form>
        </details>
      ) : (
        <form className="flex flex-col sm:flex-row gap-2" onSubmit={(event) => {
          event.preventDefault();
          void searchAnime(query);
        }}>
          <Input value={query} onChange={(event) => setQuery(event.target.value)}
            placeholder="Название аниме..." className="bg-slate-950/70 border-white/10 text-white" />
          <Button type="submit" disabled={loading || !query.trim()} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Найти
          </Button>
        </form>
      )}

      {loading && !embedUrl && (
        <div className="flex items-center gap-2 text-sm text-cyan-300">
          <Loader2 className="h-4 w-4 animate-spin" /> Подключаем плеер...
        </div>
      )}

      {results.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <span className="w-full text-xs text-slate-400">Другие совпадения:</span>
          {results.map((item) => (
            <Button key={item.id} type="button" size="sm"
              variant={selectedAnime?.id === item.id ? "default" : "outline"}
              onClick={() => void chooseAnime(item, true)} className="max-w-full">
              <span className="truncate">{item.title}{item.year ? " · " + item.year : ""}</span>
            </Button>
          ))}
        </div>
      )}

      {selectedAnime && episodes.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-slate-300">{selectedAnime.title}</span>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            Серия
            <select value={episode} onChange={(event) => {
              const nextEpisode = Number(event.target.value);
              setEpisode(nextEpisode);
              void launchPlayer(selectedAnime, nextEpisode);
            }} className="h-9 rounded-lg border border-white/10 bg-slate-950 px-3 text-white">
              {episodes.map((item) => (
                <option key={item.number} value={item.number}>
                  {item.number}{item.title ? " — " + item.title : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {error && <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-200">{error}</div>}

      {embedUrl && (
        <div className="aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black">
          <iframe key={embedUrl} src={embedUrl}
            title={"AniVibe — " + (selectedAnime?.title || "аниме")}
            className="h-full w-full border-0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen referrerPolicy="strict-origin" />
        </div>
      )}
    </section>
  );
}
