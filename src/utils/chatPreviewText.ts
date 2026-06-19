type PreviewContent =
  | { kind: 'text'; text: string }
  | { kind: 'shared_post' }
  | { kind: 'photo' }
  | { kind: 'file' }
  | { kind: 'voice' }
  | { kind: 'system'; text: string };

function firstName(name?: string | null): string | null {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0] ?? null;
}

export function formatActorLabel(
  currentUserId: string,
  senderUserId?: string | null,
  senderName?: string | null,
): string {
  if (senderUserId && senderUserId === currentUserId) return 'You';
  return firstName(senderName) ?? 'Someone';
}

export function formatChatPreviewLabel(params: {
  currentUserId: string;
  senderUserId?: string | null;
  senderName?: string | null;
  content: PreviewContent;
  /** Circle inboxes prefix plain text with "Name: message". */
  style?: 'circle' | 'dm';
}): string {
  const actor = formatActorLabel(params.currentUserId, params.senderUserId, params.senderName);
  const isMe = !!params.senderUserId && params.senderUserId === params.currentUserId;

  switch (params.content.kind) {
    case 'text': {
      const text = params.content.text.trim();
      if (!text) return '';
      if (params.style === 'circle') return `${actor}: ${text}`;
      return isMe ? `You: ${text}` : text;
    }
    case 'shared_post':
      return `${actor} shared a post`;
    case 'photo':
      return `${actor} sent a photo`;
    case 'file':
      return `${actor} sent a file`;
    case 'voice':
      return `${actor} sent a voice note`;
    case 'system':
      return params.content.text.trim();
  }
}

function mediaPreviewContent(mediaKind?: string | null): Extract<PreviewContent, { kind: 'photo' | 'file' | 'voice' }> {
  if (mediaKind === 'photo') return { kind: 'photo' };
  if (mediaKind === 'audio') return { kind: 'voice' };
  return { kind: 'file' };
}

export function circleMessagePreview(params: {
  currentUserId: string;
  type: string;
  text?: string | null;
  mediaKind?: string | null;
  senderUserId?: string | null;
  senderName?: string | null;
}): string {
  const base = {
    currentUserId: params.currentUserId,
    senderUserId: params.senderUserId,
    senderName: params.senderName,
    style: 'circle' as const,
  };

  if (params.type === 'system') {
    return formatChatPreviewLabel({
      ...base,
      content: { kind: 'system', text: params.text ?? '' },
    });
  }
  if (params.type === 'text') {
    return formatChatPreviewLabel({
      ...base,
      content: { kind: 'text', text: params.text ?? '' },
    });
  }
  if (params.type === 'shared_post') {
    return formatChatPreviewLabel({ ...base, content: { kind: 'shared_post' } });
  }
  if (params.type === 'media') {
    return formatChatPreviewLabel({
      ...base,
      content: mediaPreviewContent(params.mediaKind),
    });
  }
  return `${formatActorLabel(params.currentUserId, params.senderUserId, params.senderName)} sent a message`;
}

export function dmMessagePreview(params: {
  currentUserId: string;
  kind: string;
  text?: string | null;
  mediaKind?: string | null;
  senderUserId?: string | null;
  senderName?: string | null;
}): string {
  const base = {
    currentUserId: params.currentUserId,
    senderUserId: params.senderUserId,
    senderName: params.senderName,
    style: 'dm' as const,
  };

  if (params.kind === 'system') {
    return formatChatPreviewLabel({
      ...base,
      content: { kind: 'system', text: params.text ?? '' },
    });
  }
  if (params.kind === 'shared_post') {
    return formatChatPreviewLabel({ ...base, content: { kind: 'shared_post' } });
  }
  if (params.kind === 'media') {
    return formatChatPreviewLabel({
      ...base,
      content: mediaPreviewContent(params.mediaKind),
    });
  }
  return formatChatPreviewLabel({
    ...base,
    content: { kind: 'text', text: params.text ?? '' },
  });
}

/** Loading placeholder inside an open chat thread. */
export function sharedPostLoadingLabel(
  currentUserId: string,
  senderUserId: string,
  senderName?: string | null,
): string {
  return formatChatPreviewLabel({
    currentUserId,
    senderUserId,
    senderName,
    content: { kind: 'shared_post' },
    style: 'circle',
  });
}
