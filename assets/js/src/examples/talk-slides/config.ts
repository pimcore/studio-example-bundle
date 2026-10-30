// Where the standalone slide viewer (talk.html) is served. The deck and the viewer are not part of this bundle:
// build them in the talk project and publish them under the web root, or point this at any URL that allows framing.
export const DEFAULT_TALK_URL = '/talk/talk.html'

export type TalkHost = 'portal' | 'studio'

// The viewer URL for a host (F38): `host` tells the viewer where it is shown, `accent` (a CSS colour) is the colour
// its slides take instead of the neutral default. Keeps the URL's own query and its slide hash.
export const talkUrl = (url: string, host: TalkHost, accent?: string): string => {
  const hashAt = url.indexOf('#')
  const hash = hashAt === -1 ? '' : url.slice(hashAt)
  const beforeHash = hashAt === -1 ? url : url.slice(0, hashAt)
  const queryAt = beforeHash.indexOf('?')
  const path = queryAt === -1 ? beforeHash : beforeHash.slice(0, queryAt)
  const params = new URLSearchParams(queryAt === -1 ? '' : beforeHash.slice(queryAt + 1))
  params.delete('host')
  params.delete('accent')
  params.set('host', host)
  if (accent !== undefined && accent !== '') {
    params.set('accent', accent)
  }
  return `${path}?${params.toString()}${hash}`
}
