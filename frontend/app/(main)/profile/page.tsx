'use client';

import { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { Loader2, Mail, Bell, Save } from 'lucide-react';

export default function ProfilePage() {
  // Settings state
  const [emailInput, setEmailInput] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/user/settings');
      if (res.ok) {
        const data = await res.json();
        setEmailInput(data.profile.notificationEmail || '');
        setNotificationsEnabled(data.profile.emailNotificationsEnabled);
      }
    } catch (e) {
      console.error('Failed to fetch settings', e);
    } finally {
      setIsSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const res = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationEmail: emailInput,
          emailNotificationsEnabled: notificationsEnabled,
        }),
      });
      if (res.ok) {
        // const data = await res.json();
        // alert("Settings saved!");
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to save settings.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className='flex flex-col items-center justify-start min-h-screen bg-gray-50'>
      <Navbar />
      <div className='w-full max-w-5xl pt-32 p-8 space-y-12'>
        {/* Notification Settings Section */}
        <div className='space-y-6'>
          <div className='space-y-2'>
            <h1 className='text-3xl font-bold text-gray-900'>
              Account Settings
            </h1>
            <p className='text-gray-600'>
              Manage your profile and notification preferences.
            </p>
          </div>

          <div className='bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 space-y-8'>
            <div className='grid md:grid-cols-2 gap-8'>
              {/* Email Setting */}
              <div className='space-y-4'>
                <div className='flex items-center gap-2 text-gray-900 font-semibold'>
                  <Mail className='w-5 h-5 text-red-600' />
                  <h2>Notification Email</h2>
                </div>
                <p className='text-sm text-gray-500'>
                  The email address where your video summaries will be sent.
                </p>
                <div className='flex gap-2'>
                  <input
                    type='email'
                    placeholder='Enter notification email...'
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className='flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition-all'
                  />
                </div>
              </div>

              {/* Toggle Setting */}
              <div className='space-y-4'>
                <div className='flex items-center gap-2 text-gray-900 font-semibold'>
                  <Bell className='w-5 h-5 text-red-600' />
                  <h2>Email Notifications</h2>
                </div>
                <p className='text-sm text-gray-500'>
                  Enable or disable summary delivery to your email inbox.
                </p>
                <div className='flex items-center gap-3'>
                  <button
                    onClick={() =>
                      setNotificationsEnabled(!notificationsEnabled)
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                      notificationsEnabled ? 'bg-red-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className='text-sm font-medium text-gray-700'>
                    {notificationsEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            <div className='flex justify-end pt-4 border-t'>
              <button
                onClick={handleSaveSettings}
                disabled={isSavingSettings || isSettingsLoading}
                className='flex items-center gap-2 px-6 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50'
              >
                {isSavingSettings ? (
                  <Loader2 className='w-4 h-4 animate-spin' />
                ) : (
                  <Save className='w-4 h-4' />
                )}
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
