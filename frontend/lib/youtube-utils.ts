export type InputType = 'video' | 'channel';

export interface ParsedInput {
  type: InputType;
  value: string;
}

export function parseInput(input: string): ParsedInput {
  const trimmed = input.trim();
  
  // 1. Check for Video URL
  
  // Shorts: youtube.com/shorts/ID
  const shortsRegex = /youtube\.com\/shorts\/([\w-]{11})/i;
  const shortsMatch = trimmed.match(shortsRegex);
  if (shortsMatch && shortsMatch[1]) {
    return { type: 'video', value: shortsMatch[1] };
  }

  // Standard Watch: youtube.com/watch?v=ID
  // Using a slightly more flexible regex to catch params after v=ID
  const watchRegex = /youtube\.com\/watch\?.*v=([\w-]{11})/i;
  const watchMatch = trimmed.match(watchRegex);
  if (watchMatch && watchMatch[1]) {
    return { type: 'video', value: watchMatch[1] };
  }

  // Share: youtu.be/ID
  const shareRegex = /youtu\.be\/([\w-]{11})/i;
  const shareMatch = trimmed.match(shareRegex);
  if (shareMatch && shareMatch[1]) {
    return { type: 'video', value: shareMatch[1] };
  }

  // 2. Check for Channel URL with ID
  // Matches: youtube.com/channel/ID
  const channelIdRegex = /youtube\.com\/channel\/(UC[\w-]{21}[AQgw])/i;
  const channelIdMatch = trimmed.match(channelIdRegex);
  if (channelIdMatch && channelIdMatch[1]) {
    return { type: 'channel', value: channelIdMatch[1] };
  }

  // 3. Check for Channel URL with Handle
  // Matches: youtube.com/@handle
  const channelHandleRegex = /youtube\.com\/@([\w-]+)/i;
  const channelHandleMatch = trimmed.match(channelHandleRegex);
  if (channelHandleMatch && channelHandleMatch[1]) {
    return { type: 'channel', value: `@${channelHandleMatch[1]}` };
  }

  // 4. Default: Treat as Channel ID, Handle, or Search Term
  return { type: 'channel', value: trimmed };
}
