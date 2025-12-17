"use client";

import { useState } from "react";
import { Loader2, Search, Youtube } from "lucide-react";
import Image from "next/image";

interface VideoSnippet {
  publishedAt: string;
  channelId: string;
  title: string;
  description: string;
  thumbnails: {
    medium: {
      url: string;
      width: number;
      height: number;
    };
    high: {
      url: string;
      width: number;
      height: number;
    };
  };
  channelTitle: string;
}

interface VideoItem {
  id: {
    kind: string;
    videoId: string;
  };
  snippet: VideoSnippet;
}

export function YouTubeViewer() {
  const [channelId, setChannelId] = useState("");
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVideos = async () => {
    if (!channelId.trim()) return;

    setLoading(true);
    setError(null);
    setVideos([]);

    try {
      const response = await fetch(
        `/api/youtube/videos?channelId=${encodeURIComponent(channelId)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch videos");
      }

      setVideos(data.items || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">
          YouTube Channel Videos
        </h2>
        <p className="text-muted-foreground text-gray-500">
          Enter a Channel ID to see the latest uploads.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Channel ID (e.g., UC_x5XG1OV2P6uZZ5FSM9Ttw)"
          value={channelId}
          onChange={(e) => setChannelId(e.target.value)}
          className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-800 dark:border-zinc-700"
          onKeyDown={(e) => e.key === "Enter" && fetchVideos()}
        />
        <button
          onClick={fetchVideos}
          disabled={loading || !channelId}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-colors"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          Fetch
        </button>
      </div>

      {error && (
        <div className="p-4 text-sm text-red-500 bg-red-50 dark:bg-red-950/20 rounded-md border border-red-200 dark:border-red-900">
          Error: {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {videos.map((video) => (
          <a
            key={video.id.videoId}
            href={`https://www.youtube.com/watch?v=${video.id.videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group block space-y-3 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-zinc-700"
          >
            <div className="relative aspect-video rounded-md overflow-hidden bg-gray-100 dark:bg-zinc-800">
              <Image
                src={video.snippet.thumbnails.high.url}
                alt={video.snippet.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold line-clamp-2 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {video.snippet.title}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(video.snippet.publishedAt).toLocaleDateString(
                  undefined,
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }
                )}
              </p>
            </div>
          </a>
        ))}
      </div>

      {!loading && videos.length === 0 && !error && (
        <div className="text-center py-12 text-gray-500">
          <Youtube className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No videos to display</p>
        </div>
      )}
    </div>
  );
}
