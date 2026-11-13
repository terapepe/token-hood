import { defineChain, type Chain } from "viem";
import { HOOD_CONFIG as CFG, type NetworkId } from "@/hood.config";

/** Network helpers (client + server). Mirrors the single/multi logic used in the other repos. */

type RawNet = (typeof CFG.networks)[NetworkId];
export type Net = RawNet & { id: NetworkId; primary: boolean };
export type { NetworkId };

const ALL = Object.keys(CFG.networks) as NetworkId[];

export const isSingle = () => CFG.mode !== "multi";

/** Main network: single → singleNetwork · multi → primaryNetwork. */
export function primaryId(): NetworkId {
  const want = isSingle() ? CFG.singleNetwork : CFG.primaryNetwork;
  return CFG.networks[want] ? want : ALL[0];
}

export function getNet(id: string | null | undefined): Net | null {
  if (!id || !(id in CFG.networks)) return null;
  const n = CFG.networks[id as NetworkId];
  return { ...n, id: id as NetworkId, primary: id === primaryId() };
}

/** Shown networks: single → 1 · multi → all, ordered by multiOrder. */
export function listNets(): Net[] {
  if (isSingle()) return [getNet(primaryId())!];
  return [...new Set([...(CFG.multiOrder ?? []), ...ALL])].filter((id) => id in CFG.networks).map((id) => getNet(id)!);
}

/** EVM networks share token.address, Solana uses token.sol; a network `ca` overrides. */
export function tokenAddress(id: NetworkId): string {
  const n = CFG.networks[id];
  if (!n) return "";
  return (n.ca || (n.type === "solana" ? CFG.token.sol : CFG.token.address) || "").trim();
}

export const explorerToken = (id: NetworkId) => {
  const n = CFG.networks[id], a = tokenAddress(id);
  return n && a ? `${n.explorer}/token/${a}` : "";
};
export const explorerTx = (id: NetworkId, tx: string) => `${CFG.networks[id].explorer}/tx/${tx}`;
export const explorerAddr = (id: NetworkId, a: string) => `${CFG.networks[id].explorer}/${CFG.networks[id].type === "solana" ? "account" : "address"}/${a}`;
export const explorerBlock = (id: NetworkId, b: number) => `${CFG.networks[id].explorer}/block/${b}`;
export const buyLink = (id: NetworkId) => {
  const a = tokenAddress(id);
  return a ? CFG.networks[id].buyUrl.replaceAll("{ca}", a) : "";
};

/** Networks sharing a CA are grouped → one "Copy CA" card each (e.g. Robinhood/Base/BSC + Solana). */
export function caGroups(): { ca: string; nets: Net[] }[] {
  return listNets().reduce<{ key: string; ca: string; nets: Net[] }[]>((acc, n) => {
    const ca = tokenAddress(n.id);
    const key = ca ? ca.toLowerCase() : n.id;
    const g = acc.find((x) => x.key === key);
    if (g) g.nets.push(n);
    else acc.push({ key, ca, nets: [n] });
    return acc;
  }, []);
}

/** Shown EVM networks as viem chains (for wallets + reads). */
export function evmChains(): Chain[] {
  return listNets()
    .filter((n) => n.type === "evm")
    .map((n) =>
      defineChain({
        id: n.chainId,
        name: n.name,
        nativeCurrency: n.nativeCurrency,
        rpcUrls: { default: { http: n.rpcUrls } },
        blockExplorers: { default: { name: `${n.short} explorer`, url: n.explorer } },
      }),
    );
}

export const hasType = (t: "evm" | "solana") => listNets().some((n) => n.type === t);
export const netNames = () => listNets().map((n) => n.short).join(", ");
