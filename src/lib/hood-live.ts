import { HOOD_INFO } from "./hood-info";

export type HoodInfo = typeof HOOD_INFO & { isLive: boolean };

/** Public $HOOD info for display (configured in lib/hood-info.ts). */
export async function getHoodInfo(): Promise<HoodInfo> {
  return { ...HOOD_INFO, isLive: /^0x[0-9a-fA-F]{40}$/.test(HOOD_INFO.contractAddress) };
}
