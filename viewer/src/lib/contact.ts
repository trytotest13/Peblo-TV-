// Single source of truth for the public support mailbox.
// Intentionally empty until the owner confirms the official address —
// pages render neutral fallback text instead of a made-up placeholder.
export const SUPPORT_EMAIL: string = (
  (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined) ?? ''
).trim()

export const SUPPORT_CONTACT_EMPTY_TEXT = 'Support contact will be published here.'
