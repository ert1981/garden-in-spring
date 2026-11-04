// Minter + token ABIs, sourced from the shared SDK instead of hand-typed here — one definition
// that tracks the deployed contracts (the ABX repo's 'pnpm sync-abis' regenerates it from the
// contracts themselves), so this file can never drift the way a hand-copied fragment can.
//
// name / totalSupply / maxInvocations / paused / tokenURI are identical fragments on every ABX
// Series contract type (Image or Code) — importing both and spreading is harmless (duplicate
// fragments, byte-identical shape) and keeps this working whichever Series type backs your
// collection, without this app needing to know which one it is.
// (A rename re-export — 'export {x as y} from …' — of a subpath import tripped up Next's bundler
// here; a plain import + local const assignment is the form that survives the production build.)
import {abxFixedPriceMinterAbi, seriesImageAbi, seriesCodeAbi} from '@artblocks/abx-sdk/abi';

export const minterAbi = abxFixedPriceMinterAbi;
export const tokenAbi = [...seriesImageAbi, ...seriesCodeAbi] as const;
