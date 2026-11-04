// Reza Milani's projects on Art Blocks, as listed on https://www.artblocks.io/artists/reza-milani/projects
// (fetched 2026-10-17 with headless Chrome; "All collections (13 results)"). Titles and URLs are copied verbatim from
// that page. Images: the project thumbnails Art Blocks serves (media-proxy.artblocks.io, chain 42161 = Arbitrum,
// contract 0x47a9…84ab), downloaded once at 900 px into public/ab-works/ so this page does not hotlink.
import works from './ab-works.json';
import {BASE_PATH} from './config';

export interface AbWork {url: string; title: string; slug: string; media: string; local: string; partner: string}
export const AB_ARTIST_URL = 'https://www.artblocks.io/artists/reza-milani';
export const AB_WORKS_INFO = 'Newest first · via Art Blocks';
export const AB_WORKS: AbWork[] = (works as Omit<AbWork, 'partner'>[]).map((w) => ({...w, local: BASE_PATH + w.local, partner: 'Prohibition'}));
