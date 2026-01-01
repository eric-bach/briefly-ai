'use client';

import { Mail } from 'lucide-react';
import Link from 'next/link';
import { Tooltip } from '@/components/ui/tooltip';

interface EmailStatusIndicatorProps {
  enabled: boolean;
  email?: string;
}

export function EmailStatusIndicator({ enabled, email }: EmailStatusIndicatorProps) {
  const content = (
    <div
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
        enabled
          ? 'bg-green-100 text-green-700 border border-green-200 shadow-sm'
          : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200 cursor-pointer'
      }`}
    >
      <Mail className={`w-3.5 h-3.5 ${enabled ? 'text-green-600' : 'text-gray-400'}`} />
      <span>{enabled ? 'Notifications ON' : 'Notifications OFF'}</span>
    </div>
  );

  const tooltipContent = enabled 
    ? `Sending summaries to ${email || 'your email'}`
    : 'Click to enable email notifications in your profile';

  return (
    <Tooltip content={tooltipContent}>
      {enabled ? (
        <div>{content}</div>
      ) : (
        <Link href="/profile" className="block outline-none">
          {content}
        </Link>
      )}
    </Tooltip>
  );
}

