/**
 * The visitor's own GitHub token, if they chose to paste one.
 *
 * There is no backend, so anything in the bundle reaches every visitor.
 * The only token that can exist is one the visitor typed into their own
 * browser, stored in their own localStorage, and sent to api.github.com
 * and nowhere else. This module is the whole of that: nothing else reads
 * the key, and the client is the only thing that reads this module.
 */

const KEY = "gitgrade:token"

let listeners = new Set<() => void>()

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

/** The stored token, or null. Whitespace is never a token. */
export function getToken(): string | null {
  try {
    const raw = storage()?.getItem(KEY) ?? null
    const token = raw?.trim() ?? ""
    return token.length > 0 ? token : null
  } catch {
    return null
  }
}

/** Stores a token, or removes it when given null or blank. */
export function setToken(token: string | null): void {
  const store = storage()
  try {
    const trimmed = token?.trim() ?? ""
    if (trimmed.length > 0) store?.setItem(KEY, trimmed)
    else store?.removeItem(KEY)
  } catch {
    /* a browser that refuses storage just does not keep the token */
  }
  for (const listener of listeners) listener()
}

/** Returns an unsubscribe function. */
export function subscribeToken(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Test seam. */
export function resetTokenListeners(): void {
  listeners = new Set()
}
