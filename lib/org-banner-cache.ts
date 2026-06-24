import { orgApi, type OrgAnnouncement } from "./api"

/** Session-scoped cache — survives admin section navigations and component remounts. */
let cached: OrgAnnouncement[] | null = null
let inflight: Promise<OrgAnnouncement[]> | null = null

export function peekOrgBanner(): OrgAnnouncement[] | null {
  return cached
}

export async function getOrgBanner(force = false): Promise<OrgAnnouncement[]> {
  if (!force && cached !== null) return cached
  if (inflight) return inflight

  inflight = orgApi
    .banner()
    .then((data) => {
      cached = data
      return data
    })
    .catch(() => {
      cached = []
      return []
    })
    .finally(() => {
      inflight = null
    })

  return inflight
}

export function invalidateOrgBanner(): void {
  cached = null
  inflight = null
}
