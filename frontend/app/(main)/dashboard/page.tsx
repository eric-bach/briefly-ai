'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Loader2,
  Play,
  Youtube,
  ChevronDown,
  ChevronUp,
  Search,
} from 'lucide-react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import { Skeleton } from '@/components/ui/skeleton';
import { Navbar } from '@/components/Navbar';
import { EmailStatusIndicator } from '@/components/EmailStatusIndicator';
import { parseInput } from '@/lib/youtube-utils';
import { shouldShowSavePrompt, saveOverride } from '@/lib/prompt-utils';

interface VideoSnippet {
  publishedAt: string;
  channelId: string;
  title: string;
  description: string;
  thumbnails: {
    medium: {
      url: string;
    };
    high: {
      url: string;
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

export default function Dashboard() {
  const searchParams = useSearchParams();
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'video' | 'channel'>('video');
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [originalOverride, setOriginalOverride] = useState<string | null>(null);
  const [currentChannelId, setCurrentChannelId] = useState<string | null>(null);
  const [isSkipped, setIsSkipped] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const hasAutoStartedRef = useRef(false);

  // Debounce ref
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [summary, loading]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/user/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.profile) {
            setEmailEnabled(!!data.profile.emailNotificationsEnabled);
            setNotificationEmail(data.profile.notificationEmail || '');
          }
        }
      } catch (e) {
        console.error('Failed to fetch user settings', e);
      }
    };
    fetchSettings();
  }, []);

  const fetchPromptOverride = async (videoId?: string, channelId?: string) => {
    try {
      const params = new URLSearchParams();
      if (videoId) params.append('videoId', videoId);
      if (channelId) params.append('channelId', channelId);

      const res = await fetch(`/api/user/prompts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.override) {
          setCustomPrompt(data.override.prompt);
          setOriginalOverride(data.override.prompt);
          setIsSkipped(false);
          // TODO: Set override active state/badge (Phase 3)
        } else {
          setCustomPrompt('');
          setOriginalOverride(null);
          setIsSkipped(false);
        }
      }
    } catch (e) {
      console.error('Failed to fetch override', e);
    }
  };

  const resolveVideoDetails = async (videoId: string) => {
    try {
      const res = await fetch(`/api/youtube/videos?videoId=${videoId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          return data.items[0].snippet.channelId;
        }
      }
    } catch (e) {
      console.error('Failed to resolve video details', e);
    }
    return null;
  };

  useEffect(() => {
    if (!input) {
      setMode('video'); // Default
      return;
    }

    const parsed = parseInput(input);
    setMode(parsed.type);

    // Debounce the override fetching
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(async () => {
      if (parsed.type === 'video') {
        const videoId = parsed.value;
        // Need channel ID for precedence
        const channelId = await resolveVideoDetails(videoId);
        setCurrentChannelId(channelId || null);
        await fetchPromptOverride(videoId, channelId || undefined);
      } else if (parsed.type === 'channel') {
        setCurrentChannelId(parsed.value); // Assuming value is ID for now
        await fetchPromptOverride(undefined, parsed.value);
      }
    }, 500); // 500ms debounce

    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [input]);

  const fetchChannelVideos = useCallback(
    async (channelId: string, token?: string) => {
      if (!channelId) {
        return;
      }

      setLoading(true);
      setError('');

      if (!token) {
        setVideos([]);
        setSummary(''); // Clear summary when fetching a new channel
      }

      try {
        let url = `/api/youtube/videos?channelId=${encodeURIComponent(
          channelId
        )}`;

        if (token) {
          url += `&pageToken=${token}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch videos');
        }

        const newVideos = data.items || [];

        setVideos((prev) => {
          if (!token) return newVideos;

          const existingIds = new Set(prev.map((v) => v.id.videoId));
          const uniqueNewVideos = newVideos.filter(
            (v: VideoItem) => !existingIds.has(v.id.videoId)
          );

          return [...prev, ...uniqueNewVideos];
        });

        setNextPageToken(data.nextPageToken || null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          nextPageToken &&
          !loading &&
          mode === 'channel'
        ) {
          const parsed = parseInput(input);

          fetchChannelVideos(parsed.value, nextPageToken);
        }
      },

      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [nextPageToken, loading, mode, input, fetchChannelVideos]);

  const generateSummary = useCallback(
    async (videoUrl: string, instructions: string) => {
      if (!videoUrl) {
        return;
      }

      setLoading(true);
      setSummary('');
      setError('');
      setVideos([]); // Clear videos when starting a summary
      setShowSaveToast(false); // Reset toast

      // Check if we should prompt to save (logic: has started = true now)
      // Use 'instructions' arg as it's the latest customPrompt value passed from handleSubmit
      if (shouldShowSavePrompt(instructions, originalOverride, true)) {
        setShowSaveToast(true);
      }

      try {
        const response = await fetch('/api/summarize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            videoUrl,
            additionalInstructions: instructions,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch summary');
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          setSummary((prev) => prev + chunk);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [originalOverride]
  );

  // Handle URL query parameter for auto-starting
  useEffect(() => {
    const videoUrlParam = searchParams.get('videoUrl');

    if (videoUrlParam && !hasAutoStartedRef.current) {
      const parsed = parseInput(videoUrlParam);
      setInput(videoUrlParam);
      setMode(parsed.type);
      hasAutoStartedRef.current = true;

      if (parsed.type === 'video') {
        generateSummary(videoUrlParam, '');
      } else {
        fetchChannelVideos(parsed.value);
      }
    }
  }, [searchParams, generateSummary, fetchChannelVideos]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input) return;

    const parsed = parseInput(input);
    if (parsed.type === 'video') {
      const videoUrl =
        input.includes('youtube.com') || input.includes('youtu.be')
          ? input
          : `https://www.youtube.com/watch?v=${parsed.value}`;
      await generateSummary(videoUrl, customPrompt);
    } else {
      await fetchChannelVideos(parsed.value);
    }
  };

  const handleVideoSelect = async (videoId: string) => {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    setInput(videoUrl);
    setMode('video');
    await generateSummary(videoUrl, customPrompt);
  };

  const handleSkipToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!originalOverride) return;
    const newSkipped = e.target.checked;
    setIsSkipped(newSkipped);
    if (newSkipped) {
      setCustomPrompt('');
    } else {
      setCustomPrompt(originalOverride);
    }
  };

  const handleSaveOverride = async (type: 'video' | 'channel') => {
    const parsed = parseInput(input);
    let targetId = '';

    if (type === 'video') {
      if (parsed.type !== 'video') return;
      targetId = parsed.value;
    } else {
      if (!currentChannelId) return;
      targetId = currentChannelId;
    }

    const success = await saveOverride(targetId, customPrompt, type);
    if (success) {
      setOriginalOverride(customPrompt);
      setShowSaveToast(false);
      // Optional: Show success toast
    } else {
      alert('Failed to save prompt override.');
    }
  };

  return (
    <div className='flex flex-col items-center justify-start min-h-screen bg-gray-50'>
      <Navbar />

      <div className='w-full max-w-3xl space-y-8 pt-32 p-8'>
        <div className='text-center space-y-4'>
          <div className='flex items-center justify-center gap-4'>
            <div className='p-3 bg-red-100 rounded-full'>
              <Youtube className='w-8 h-8 text-red-600' />
            </div>
            <h1 className='text-4xl font-bold tracking-tight text-gray-900'>
              Briefly AI
            </h1>
          </div>
          <p className='text-lg text-gray-600'>
            Paste a YouTube link or Channel name to get an instant AI-powered
            summary
          </p>
        </div>

        <div className='bg-white rounded-xl shadow-lg p-6 border border-gray-100 space-y-4'>
          <form onSubmit={handleSubmit} className='flex gap-4'>
            <input
              type='text'
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='Paste a YouTube link or Channel name...'
              className='flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all'
              required
            />
            <div className='flex flex-col gap-2'>
              <button
                type='submit'
                disabled={loading}
                className='px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap'
              >
                {loading ? (
                  <>
                    <Loader2 className='w-5 h-5 animate-spin' />
                    {mode === 'video' ? 'Summarizing...' : 'Fetching...'}
                  </>
                ) : (
                  <>
                    {mode === 'video' ? (
                      <Play className='w-5 h-5 fill-current' />
                    ) : (
                      <Search className='w-5 h-5' />
                    )}
                    {mode === 'video' ? 'Summarize' : 'Fetch'}
                  </>
                )}
              </button>
              <div className='flex justify-end'>
                <EmailStatusIndicator
                  enabled={emailEnabled}
                  email={notificationEmail}
                />
              </div>
            </div>
          </form>

          <div>
            <div className='flex items-center justify-between'>
              <button
                type='button'
                onClick={() => setIsPromptOpen(!isPromptOpen)}
                className='flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors'
              >
                {isPromptOpen ? (
                  <ChevronUp className='w-4 h-4' />
                ) : (
                  <ChevronDown className='w-4 h-4' />
                )}
                Additional Instructions
                {originalOverride && !isSkipped && (
                  <span className='px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold'>
                    Override Active
                  </span>
                )}
                {!isPromptOpen && ' (Optional)'}
              </button>

              {originalOverride && (
                <label className='flex items-center gap-2 text-sm text-gray-600 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={isSkipped}
                    onChange={handleSkipToggle}
                    className='rounded border-gray-300 text-red-600 focus:ring-red-500'
                  />
                  Skip for this summary
                </label>
              )}
            </div>

            {isPromptOpen && (
              <div className='mt-2 animate-in fade-in slide-in-from-top-1 duration-200'>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  disabled={isSkipped}
                  placeholder="e.g. 'Don't spoil the ending', 'Focus on the technical details', 'Summarize in bullet points'..."
                  className='w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all min-h-[100px] text-sm resize-y disabled:opacity-50 disabled:bg-gray-100'
                />
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className='p-4 bg-red-50 border border-red-200 rounded-lg text-red-700'>
            {error}
          </div>
        )}

        {loading && !summary && videos.length === 0 && (
          <div className='bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-4'>
            <Skeleton className='h-8 w-1/3' />
            <div className='space-y-2'>
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-4 w-5/6' />
            </div>
            <div className='space-y-2 pt-4'>
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-4 w-4/6' />
            </div>
          </div>
        )}

        {summary && (
          <div className='bg-white rounded-xl shadow-sm border border-gray-200 p-8 prose prose-gray max-w-none'>
            <h3 className='text-xl font-semibold mb-4 text-gray-900'>
              Summary
            </h3>
            <div className='prose prose-red max-w-none'>
              <ReactMarkdown>{summary}</ReactMarkdown>
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {videos.length > 0 && (
          <div className='space-y-6'>
            <h2 className='text-xl font-semibold text-gray-900'>
              Latest from {videos[0].snippet.channelTitle}
            </h2>
            <div className='grid gap-6 md:grid-cols-2'>
              {videos.map((video) => (
                <button
                  key={video.id.videoId}
                  onClick={() => handleVideoSelect(video.id.videoId)}
                  className='group text-left block space-y-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-red-100 transition-all'
                >
                  <div className='relative aspect-video rounded-lg overflow-hidden bg-gray-100'>
                    <Image
                      src={video.snippet.thumbnails.high.url}
                      alt={video.snippet.title}
                      fill
                      className='object-cover group-hover:scale-105 transition-transform duration-300'
                    />
                  </div>
                  <div className='space-y-1'>
                    <h3 className='font-semibold line-clamp-2 leading-tight group-hover:text-red-600 transition-colors'>
                      {video.snippet.title}
                    </h3>
                    <p className='text-xs text-gray-500'>
                      {new Date(video.snippet.publishedAt).toLocaleDateString()}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {loading && (
              <div className='flex justify-center py-4'>
                <Loader2 className='w-6 h-6 animate-spin text-red-600' />
              </div>
            )}

            <div ref={observerTarget} className='h-4 w-full' />
          </div>
        )}

        {/* Save Prompt Toast */}
        {showSaveToast && (
          <div className='fixed bottom-6 right-6 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-80 animate-in slide-in-from-bottom-5 duration-300 z-50'>
            <div className='flex justify-between items-start mb-2'>
              <h4 className='font-semibold text-gray-900'>Save this prompt?</h4>
              <button
                onClick={() => setShowSaveToast(false)}
                className='text-gray-400 hover:text-gray-500'
              >
                ✕
              </button>
            </div>
            <p className='text-sm text-gray-600 mb-3'>
              You can save this prompt for future videos.
            </p>
            <div className='flex flex-col gap-2'>
              {mode === 'video' && (
                <button
                  className='w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors text-center'
                  onClick={() => handleSaveOverride('video')}
                >
                  Save for this Video
                </button>
              )}

              {currentChannelId && (
                <button
                  className='w-full px-3 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-md transition-colors text-center'
                  onClick={() => handleSaveOverride('channel')}
                >
                  Save for {mode === 'video' ? 'Channel' : 'this Channel'}
                </button>
              )}

              <button
                className='w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-md transition-colors text-center'
                onClick={() => setShowSaveToast(false)}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
