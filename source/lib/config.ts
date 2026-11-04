// Config from NEXT_PUBLIC_* env (prefilled by `abx mint-page` into .env.local; set the same in Vercel).
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || '8453');
export const CHAIN_NAME = process.env.NEXT_PUBLIC_CHAIN_NAME || 'Base';
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org,https://base-rpc.publicnode.com';
export const TOKEN = (process.env.NEXT_PUBLIC_TOKEN || '0x28F05F5c1DcF9a2a56447c6b6082E8C9c2c25986') as `0x${string}`;
export const MINTER = (process.env.NEXT_PUBLIC_MINTER || '0xfb5C61274a3A7dA83CcDD88DdEC914438244E2c9') as `0x${string}`;
export const COLLECTION_NAME = process.env.NEXT_PUBLIC_COLLECTION_NAME || 'The garden in spring';
export const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER || 'https://basescan.org';
export const PAGE_SIZE = 12;
// Presentation copy (override with NEXT_PUBLIC_* if needed).
export const ARTIST = process.env.NEXT_PUBLIC_ARTIST || 'Reza Milani';
export const TITLE_FA = process.env.NEXT_PUBLIC_TITLE_FA || 'باغ در بهار';
export const DESCRIPTION =
  process.env.NEXT_PUBLIC_DESCRIPTION ||
  'The garden in spring brings together Persian calligraphy, the poetry of Hafez, and generative art. Each work grows a meadow of wildflowers whose dandelion heads are written in Nastaliq script, carrying a couplet from the Divan of Hafez with a public-domain English translation by Gertrude Bell (1897) or H. Wilberforce Clarke (1891). Wind moves through every composition, and no two gardens are alike.';
export const HAFEZ_FA = 'صبا به لطف بگو آن غزال رعنا را';
export const HAFEZ_EN = 'O breeze! with softness speak to the beautiful fawn.';

// Mainnet: no ART_PREVIEW override — minted tokens show the chain's own image + live view.
export const ART_PREVIEW = process.env.NEXT_PUBLIC_ART_PREVIEW || '';
export const ASPECT_LABEL = process.env.NEXT_PUBLIC_ASPECT_LABEL || '3:2';   // render.aspectRatio = 1.5
export const PREVIEW_SEEDS: Record<number, string> = {};
// Sub-path hosting (e.g. GitHub Pages project site): build with NEXT_PUBLIC_BASE_PATH=/repo-name. Empty for root hosts.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';
