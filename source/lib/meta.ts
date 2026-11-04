// Read a token's image + name from tokenURI(id), directly from chain. Handles data: URIs
// (on-chain tokens) and http/ipfs/ar locators (off-chain custody). No backend.
//
// The read client is the SDK's browser-safe makePublicClient, given an EXPLICIT rpcUrls list —
// never env resolution (there is no server .env in a static site, and the SDK's own
// ABX_RPC_URLS/ABX_CHAIN conventions would silently no-op in a browser bundle anyway; an explicit
// override short-circuits that lookup entirely). One URL behaves exactly like a plain http()
// transport; paste a comma-separated NEXT_PUBLIC_RPC_URL to get the same fallback-transport
// failover the CLI/indexer get. Its attached chain metadata is the SDK's own default and is
// informational only for these plain reads — the WALLET's chain (used for the mint tx) is the one
// built in ./chain from your real NEXT_PUBLIC_CHAIN_ID/NAME, unaffected by this.
//
// Gateway + data: URI parsing go through the SAME sdk helpers the CLI/indexer use
// (gatewayUrlFor/resolveGatewayBase, parseDataUri) instead of a hand-rolled 'ipfs://'-slicing body —
// one implementation of "how to read a locator" instead of this app quietly re-deriving its own.
import {makePublicClient, gatewayUrlFor, resolveGatewayBase, parseDataUri} from '@artblocks/abx-sdk';
import {ART_PREVIEW, PREVIEW_SEEDS, RPC_URL, TOKEN} from './config';
import {tokenAbi} from './abi';

export const publicClient = makePublicClient({rpcUrls: RPC_URL.split(',').map((u) => u.trim()).filter(Boolean)});

export function toGateway(u: string): string {
  if (!u) return '';
  if (u.startsWith('ipfs://')) return gatewayUrlFor('ipfs', u.slice(7), resolveGatewayBase('ipfs'));
  if (u.startsWith('ar://')) return gatewayUrlFor('arweave', u.slice(5), resolveGatewayBase('arweave'));
  return u;
}

async function fetchJson(uri: string): Promise<any> {
  const parsed = parseDataUri(uri);
  if (parsed) {
    const text = parsed.base64 ? atob(parsed.body) : decodeURIComponent(parsed.body);
    return JSON.parse(text);
  }
  const res = await fetch(toGateway(uri));
  return res.json();
}

export interface TokenMeta {
  id: number;
  name: string;
  image: string;
  animation?: string;
  attributes?: {trait_type: string; value: string}[];
}

export async function readTokenMeta(id: number): Promise<TokenMeta> {
  const uri = (await publicClient.readContract({address: TOKEN, abi: tokenAbi, functionName: 'tokenURI', args: [BigInt(id)]})) as string;
  const json = await fetchJson(uri);
  const seed = ART_PREVIEW === 'v3' ? PREVIEW_SEEDS[id] : undefined;
  if (seed) {
    json.image = `/preview-v3/${id}.png`;
    json.animation_url = `/preview-v3/live.html?hash=${seed}`;
  }
  return {
    id,
    name: json.name || '#' + id,
    image: toGateway(json.image || ''),
    animation: json.animation_url ? toGateway(json.animation_url) : undefined,
    attributes: Array.isArray(json.attributes) ? json.attributes.map((a: any) => ({trait_type: String(a.trait_type), value: String(a.value)})) : [],
  };
}
