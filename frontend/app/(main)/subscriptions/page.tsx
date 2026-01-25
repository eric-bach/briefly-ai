'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Loader2, Trash2, ExternalLink, Youtube, Bell, Mail } from 'lucide-react';
import Link from 'next/link';

interface Subscription {
  channelId: string;
  channelTitle?: string;
  channelThumbnail?: string;
  createdAt?: string;
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [emailEnabled, setEmailEnabled] = useState(false);

  useEffect(() => {
    fetchSubscriptions();
    fetchSettings();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const res = await fetch('/api/subscriptions');
      const data = await res.json();
      if (res.ok) {
        setSubscriptions(data.subscriptions || []);
      } else {
        setError(data.error || 'Failed to fetch subscriptions');
      }
    } catch (e) {
      setError('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/user/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setEmailEnabled(!!data.profile.emailNotificationsEnabled);
        }
      }
    } catch (e) {
      console.error('Failed to fetch user settings', e);
    }
  };

  const handleUnsubscribe = async (channelId: string) => {
    if (!confirm('Are you sure you want to stop receiving summaries for this channel?')) return;

    // Optimistic update
    const previous = subscriptions;
    setSubscriptions((prev) => prev.filter((s) => s.channelId !== channelId));

    try {
      const res = await fetch(`/api/subscriptions?channelId=${channelId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Failed to delete');
      }
    } catch (e) {
      console.error(e);
      setSubscriptions(previous); // Revert
      alert('Failed to unsubscribe');
    }
  };

  return (
    <div className='flex flex-col min-h-screen bg-gray-50'>
      <Navbar />

      <div className='flex-1 w-full max-w-4xl mx-auto pt-32 p-8 space-y-8'>
        <div className='space-y-2'>
          <h1 className='text-3xl font-bold text-gray-900'>Subscriptions</h1>
          <p className='text-gray-600'>Manage your channel subscriptions for automated video summaries.</p>
        </div>

        {!emailEnabled && !loading && (
          <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3 text-yellow-800'>
            <Mail className='w-5 h-5 mt-0.5 shrink-0' />
            <div>
              <h4 className='font-semibold'>Email Notifications Disabled</h4>
              <p className='text-sm mt-1'>
                Your global email notifications are currently turned off. You won't receive summaries even for
                subscribed channels.
                <Link href='/profile' className='underline font-medium ml-1 hover:text-yellow-900'>
                  Enable in Settings
                </Link>
              </p>
            </div>
          </div>
        )}

        <div className='bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden'>
          <div className='p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50'>
            <div className='flex items-center gap-2 text-sm font-medium text-gray-700'>
              <Bell className='w-4 h-4' />
              <span>
                {subscriptions.length} Active Subscription
                {subscriptions.length !== 1 ? 's' : ''}
              </span>
            </div>
            <Link href='/dashboard' className='text-sm text-red-600 hover:text-red-700 font-medium hover:underline'>
              + Add New
            </Link>
          </div>

          {loading ? (
            <div className='p-12 flex justify-center'>
              <Loader2 className='w-6 h-6 animate-spin text-gray-400' />
            </div>
          ) : error ? (
            <div className='p-8 text-center text-red-600'>{error}</div>
          ) : subscriptions.length === 0 ? (
            <div className='p-12 text-center text-gray-500 space-y-3'>
              <Youtube className='w-12 h-12 mx-auto text-gray-300' />
              <p>You haven't subscribed to any channels yet.</p>
              <Link
                href='/dashboard'
                className='inline-block px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-black transition-colors'
              >
                Browse Channels
              </Link>
            </div>
          ) : (
            <div className='divide-y divide-gray-100'>
              {subscriptions.map((sub) => (
                <div
                  key={sub.channelId}
                  className='p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group'
                >
                  <div className='flex items-center gap-4'>
                    {sub.channelThumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={sub.channelThumbnail}
                        alt={sub.channelTitle || 'Channel'}
                        className='w-10 h-10 rounded-full border border-gray-200'
                      />
                    ) : (
                      <div className='w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-lg'>
                        {sub.channelTitle ? sub.channelTitle[0].toUpperCase() : 'C'}
                      </div>
                    )}
                    <div>
                      <h3 className='font-medium text-gray-900'>{sub.channelTitle || 'Unknown Channel'}</h3>
                      <p className='text-xs text-gray-500 font-mono'>{sub.channelId}</p>
                    </div>
                  </div>
                  <div className='flex items-center gap-2'>
                    <a
                      href={`https://youtube.com/channel/${sub.channelId}`}
                      target='_blank'
                      rel='noreferrer'
                      className='p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors'
                      title='View on YouTube'
                    >
                      <ExternalLink className='w-4 h-4' />
                    </a>
                    <button
                      onClick={() => handleUnsubscribe(sub.channelId)}
                      className='p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors'
                      title='Unsubscribe'
                    >
                      <Trash2 className='w-4 h-4' />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
