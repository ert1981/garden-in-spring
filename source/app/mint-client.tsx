'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {createWalletClient, custom, formatEther} from 'viem';
import {chain} from '../lib/chain';
import {readSaleConfig, type SaleConfig} from '@artblocks/abx-sdk';
import {BASE_PATH, ARTIST, ASPECT_LABEL, CHAIN_ID, CHAIN_NAME, COLLECTION_NAME, DESCRIPTION, EXPLORER, HAFEZ_EN, HAFEZ_FA, MINTER, PAGE_SIZE, TITLE_FA, TOKEN} from '../lib/config';
import {minterAbi, tokenAbi} from '../lib/abi';
import {publicClient, readTokenMeta, type TokenMeta} from '../lib/meta';
import {AB_ARTIST_URL, AB_WORKS, AB_WORKS_INFO} from '../lib/ab-works';

const ZERO = '0x0000000000000000000000000000000000000000';
// A fresh random 32-byte token hash (same shape as a real ABX seed) for the Generate preview.
function randomHash(): string {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return '0x' + Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}
const GEN_URL = (h: string) => `${BASE_PATH}/generator/index.html?hash=${h}`;

const CHAIN_HEX = '0x' + CHAIN_ID.toString(16);
const RPC_LIST = (process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org').split(',').map((u) => u.trim()).filter(Boolean);

// Ask the wallet to switch to Base mainnet; if it doesn't know the chain yet (4902), add it first.
async function ensureChain(eth: any): Promise<boolean> {
  const current = (await eth.request({method: 'eth_chainId'})) as string;
  if (parseInt(current, 16) === CHAIN_ID) return true;
  try {
    await eth.request({method: 'wallet_switchEthereumChain', params: [{chainId: CHAIN_HEX}]});
  } catch (e: any) {
    const code = e?.code ?? e?.data?.originalError?.code;
    if (code === 4902 || /Unrecognized chain|not been added/i.test(String(e?.message))) {
      await eth.request({method: 'wallet_addEthereumChain', params: [{chainId: CHAIN_HEX, chainName: CHAIN_NAME, nativeCurrency: {name: 'Ether', symbol: 'ETH', decimals: 18}, rpcUrls: RPC_LIST, blockExplorerUrls: EXPLORER ? [EXPLORER] : []}]});
    } else {
      throw e;
    }
  }
  const after = (await eth.request({method: 'eth_chainId'})) as string;
  return parseInt(after, 16) === CHAIN_ID;
}

export default function Mint() {
  const [sale, setSale] = useState<SaleConfig | null>(null);
  const [supply, setSupply] = useState(0);
  const [maxInv, setMaxInv] = useState(0);
  const [paused, setPaused] = useState(false);
  const [account, setAccount] = useState<string>('');
  const [page, setPage] = useState(0);
  const [tiles, setTiles] = useState<TokenMeta[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  // Presentation state: which token is featured in the hero, and whether it plays live.
  const [featured, setFeatured] = useState<TokenMeta | null>(null);
  const [live, setLive] = useState(true);   // live view first; the toggle switches to the still
  const [showMore, setShowMore] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [walletChain, setWalletChain] = useState<number | null>(null);
  // Generate: a random-hash render of the exact on-chain v3 script, shown in the hero frame.
  const [gen, setGen] = useState<string>('');
  const [genStill, setGenStill] = useState<string>('');
  const genFrame = useRef<HTMLIFrameElement | null>(null);

  // On load the hero shows a live random output (no static samples); Generate makes a new one.
  useEffect(() => {
    setGen(randomHash());
  }, []);

  // Forward the I key (verse on/off) to the generator frame when focus is on the page, not the frame.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!gen || !live || (e.key !== 'i' && e.key !== 'I')) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      genFrame.current?.contentWindow?.postMessage({type: 'garden:key', key: e.key}, window.location.origin);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gen, live]);

  function generate() {
    setGen(randomHash());
    setGenStill('');
    setLive(true);   // a generated output is always shown live
  }
  // Turning live view off on a generated output freezes the current canvas as the still.
  function setLiveView(on: boolean) {
    if (!on && gen) {
      try {
        const c = genFrame.current?.contentDocument?.querySelector('canvas') as HTMLCanvasElement | null;
        if (c) setGenStill(c.toDataURL('image/jpeg', 0.9));
      } catch (e) {
        /* cross-origin or not ready — fall back to the placeholder */
      }
    }
    setLive(on);
  }

  const refresh = useCallback(async () => {
    setSale(await readSaleConfig(publicClient, MINTER, TOKEN));
    const [ts, mx, pz] = await Promise.all([
      publicClient.readContract({address: TOKEN, abi: tokenAbi, functionName: 'totalSupply'}),
      publicClient.readContract({address: TOKEN, abi: tokenAbi, functionName: 'maxInvocations'}),
      publicClient.readContract({address: TOKEN, abi: tokenAbi, functionName: 'paused'}),
    ]);
    setSupply(Number(ts));
    setMaxInv(Number(mx));
    setPaused(Boolean(pz));
  }, []);

  useEffect(() => {
    refresh().catch((e) => setMsg(String(e)));
  }, [refresh]);

  // Load the visible page of minted tokens (newest first). Only this page's tokenURIs are fetched.
  useEffect(() => {
    let live = true;
    (async () => {
      const ids: number[] = [];
      const start = page * PAGE_SIZE;
      for (let i = 0; i < PAGE_SIZE; i++) {
        const id = supply - 1 - start - i;
        if (id < 0) break;
        ids.push(id);
      }
      const metas = await Promise.all(ids.map((id) => readTokenMeta(id).catch(() => ({id, name: '#' + id, image: ''}))));
      if (live) {
        setTiles(metas);
        // Feature the newest token by default (or keep the visitor's current pick).
        setFeatured((f) => (f && metas.some((m) => m.id === f.id) ? metas.find((m) => m.id === f.id)! : f || metas[0] || null));
      }
    })();
    return () => {
      live = false;
    };
  }, [page, supply]);

  useEffect(() => {
    const eth = (typeof window !== 'undefined' && (window as any).ethereum) || null;
    if (!eth || !eth.on) return;
    const onChain = (c: string) => setWalletChain(parseInt(c, 16));
    const onAccts = (a: string[]) => setAccount(a[0] || '');
    eth.on('chainChanged', onChain);
    eth.on('accountsChanged', onAccts);
    return () => {
      eth.removeListener?.('chainChanged', onChain);
      eth.removeListener?.('accountsChanged', onAccts);
    };
  }, []);

  async function connect(): Promise<boolean> {
    const eth = (window as any).ethereum;
    if (!eth) {
      setMsg('No browser wallet found — open this page in MetaMask, Rabby or Coinbase Wallet (desktop extension or the wallet app\'s built-in browser).');
      return false;
    }
    try {
      const accts = (await eth.request({method: 'eth_requestAccounts'})) as string[];
      setAccount(accts[0] || '');
      const ok = await ensureChain(eth);
      setWalletChain(parseInt((await eth.request({method: 'eth_chainId'})) as string, 16));
      if (!ok) setMsg(`Please switch your wallet to ${CHAIN_NAME} (chain ${CHAIN_ID}).`);
      return ok && !!accts[0];
    } catch (e: any) {
      setMsg(e?.code === 4001 ? 'Request rejected in the wallet.' : `Please switch your wallet to ${CHAIN_NAME} (chain ${CHAIN_ID}).`);
      return false;
    }
  }

  async function mint() {
    if (!sale) return;
    const eth = (window as any).ethereum;
    if (!eth || !account) {
      if (!(await connect())) return;
    }
    setBusy(true);
    setMsg('');
    try {
      // Never send on the wrong network: re-check (and switch) right before the purchase.
      if (!(await ensureChain(eth))) throw new Error(`Please switch your wallet to ${CHAIN_NAME} (chain ${CHAIN_ID}).`);
      const from = ((await eth.request({method: 'eth_requestAccounts'})) as string[])[0];
      setAccount(from || '');
      const wallet = createWalletClient({account: from as any, chain, transport: custom(eth)});
      // The buyer's terms guard: the tx commits to the terms this page is SHOWING
      // (paymentToken + price). If the owner re-configures the sale in between, the minter reverts
      // SaleTermsChanged instead of charging the new price / pulling a different token.
      const hash = await wallet.writeContract({address: MINTER, abi: minterAbi, functionName: 'purchase', args: [TOKEN, sale.paymentToken, sale.price], value: sale.price, account: from as any, chain});
      setMsg('Minting… tx ' + hash.slice(0, 10) + '…');
      setTxHash(hash);
      await publicClient.waitForTransactionReceipt({hash});
      setMsg('Minted! ✦');
      setPage(0);
      await refresh();
    } catch (e: any) {
      const text = e && e.shortMessage ? e.shortMessage : String(e && e.message ? e.message : e);
      // Refresh on EITHER stale-terms signal. SaleTermsChanged is the guard firing (the price rose,
      // or the payment token changed). WrongPayment is the ETH lane's exact-value check firing, which
      // is what a price CUT looks like: the guard is a ceiling so it passes, then the exact-value
      // equality fails because V1 has no refunds. Matching only the first left this page wedged after
      // a price cut — every retry failed until the buyer reloaded.
      if (/SaleTermsChanged|WrongPayment/.test(String(e && (e.message || e)))) {
        await refresh().catch(() => {});
        setMsg('The sale terms changed — nothing was charged. The price above is refreshed; review it and mint again.');
      } else {
        setMsg(text);
      }
    } finally {
      setBusy(false);
    }
  }

  const isEth = !sale || sale.paymentToken === ZERO;
  const soldOut = !!sale && (sale.sold >= sale.allocation || (maxInv > 0 && supply >= maxInv));
  const pages = Math.max(1, Math.ceil(supply / PAGE_SIZE));
  const canMint = !!sale && sale.configured && !paused && !soldOut && isEth && !busy;

  const short = (a: string) => a.slice(0, 6) + '…' + a.slice(-4);
  const priceText = sale ? (isEth ? (sale.price === BigInt(0) ? 'Free' : formatEther(sale.price) + ' ETH') : sale.price.toString() + ' units') : '…';
  const pct = maxInv > 0 ? Math.min(100, (supply / maxInv) * 100) : 0;
  const status = !sale ? 'Loading' : !sale.configured ? 'No sale' : soldOut ? 'Sold out' : paused ? 'Paused' : 'Live';
  const traits = (featured?.attributes || []).filter((a) => !['Verse', 'Verse (English)'].includes(a.trait_type));
  const verseFa = featured?.attributes?.find((a) => a.trait_type === 'Verse')?.value;
  const verseEn = featured?.attributes?.find((a) => a.trait_type === 'Verse (English)')?.value;
  const translator = featured?.attributes?.find((a) => a.trait_type === 'Translation')?.value;

  function pick(t: TokenMeta) {
    setGen('');
    setFeatured(t);
    if (typeof window !== 'undefined') window.scrollTo({top: 0, behavior: 'smooth'});
  }

  // Full-screen hero: the overlay fades out when the visitor is idle and returns on any movement.
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const wake = () => { setIdle(false); clearTimeout(t); t = setTimeout(() => setIdle(true), 3200); };
    const evs = ['mousemove', 'touchstart', 'keydown', 'scroll'];
    evs.forEach((e) => window.addEventListener(e, wake, {passive: true}));
    wake();
    // Movement over the artwork happens inside the (same-origin) frame, so listen there too.
    (window as any).__gardenWake = wake;
    return () => { clearTimeout(t); evs.forEach((e) => window.removeEventListener(e, wake)); };
  }, []);
  // R regenerates (when focus is on the page, not inside the artwork frame).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'r' && e.key !== 'R') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      generate();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="site">
      <main id="top">
        <section className={'hero' + (idle ? ' idle' : '')} aria-label="Artwork">
          <div className="stage">
            {gen ? (
              live ? (
                <iframe ref={genFrame} key={gen} className="art" src={GEN_URL(gen)} title="Random preview" tabIndex={0} sandbox="allow-scripts allow-same-origin" onLoad={(e) => { try { const w = (e.currentTarget as HTMLIFrameElement).contentWindow; ['mousemove', 'touchstart', 'keydown'].forEach((ev) => w?.addEventListener(ev, () => (window as any).__gardenWake?.(), {passive: true})); } catch { /* cross-origin */ } }} />
              ) : genStill ? (
                <img className="art" src={genStill} alt="Random preview (still)" />
              ) : (
                <div className="art placeholder" />
              )
            ) : featured ? (
              live && featured.animation ? (
                <iframe className="art" src={featured.animation} title={featured.name} sandbox="allow-scripts allow-same-origin" />
              ) : featured.image ? (
                <img className="art" src={featured.image} alt={featured.name} />
              ) : null
            ) : (
              <div className="art placeholder" />
            )}
          </div>

          <div className="ov ov-tl">
            <h1>{COLLECTION_NAME}</h1>
            <div className="fa-title" lang="fa" dir="rtl">{TITLE_FA}</div>
            <div className="cap">by {ARTIST}</div>
          </div>

          <div className="ov ov-tr">
            {account ? <span className="cap">{short(account)}{walletChain !== null && walletChain !== CHAIN_ID ? ' · wrong network' : ''}</span> : <button className="link-btn" onClick={connect}>Connect</button>}
            <a className="cap" href="#about">Info ↓</a>
          </div>

          <div className="ov ov-bl">
            <div className="cap">{gen ? <>Random preview · <span title={gen}>{gen.slice(0, 8)}…{gen.slice(-4)}</span></> : featured ? `#${featured.id}` : '\u00a0'}</div>
            <div className="ctrl">
              <button className="link-btn" onClick={generate} aria-label="Generate a random output" title="Generate (R)">↻ Generate</button>
              {gen || featured?.animation ? <button className="link-btn" onClick={() => setLiveView(!live)}>{live ? 'Live' : 'Still'}</button> : null}
              {gen ? <button className="link-btn" onClick={() => { navigator.clipboard?.writeText(gen).catch(() => {}); }} title="Copy hash">Hash</button> : null}
              <span className="cap dim keys">R new · I verse · Space pause</span>
            </div>
          </div>

          <div className="ov ov-br">
            <div className="cap">{priceText} · {supply}/{maxInv || '…'} minted · <span className={'dot ' + (status === 'Live' ? 'live' : 'off')} />{status}</div>
            <button className="mint-btn" onClick={mint} disabled={!canMint}>
              {busy ? 'Minting…' : soldOut ? 'Sold out' : paused ? 'Paused' : !isEth ? 'ERC-20 — see README' : account ? 'Mint' : 'Connect & mint'}
            </button>
            {msg ? <div className="cap msg">{msg}{txHash && EXPLORER ? <> · <a href={EXPLORER + '/tx/' + txHash} target="_blank" rel="noreferrer">view tx</a></> : null}</div> : null}
          </div>
        </section>

        <section id="about" className="sec info">
          <div className="col">
            <div className="label">01 — About</div>
            <h2>{COLLECTION_NAME} <span lang="fa" dir="rtl" className="fa-inline">{TITLE_FA}</span></h2>
            <p className="lead">{DESCRIPTION}</p>
            <p className="fine">Fixed edition of {maxInv || '…'} unique artworks · p5.js · {ASPECT_LABEL} · traits and randomness from the token seed. Every mint produces a unique, 1-of-1 garden, generated live from its token seed.</p>
            {verseFa ? (
              <figure className="verse">
                <blockquote lang="fa" dir="rtl">{verseFa.split(' / ').map((l, i) => <span key={i}>{l}</span>)}</blockquote>
                {verseEn ? <figcaption>{verseEn}{translator ? <cite>{translator}</cite> : null}</figcaption> : null}
              </figure>
            ) : (
              <figure className="verse">
                <blockquote lang="fa" dir="rtl"><span>{HAFEZ_FA}</span></blockquote>
                <figcaption>{HAFEZ_EN}<cite>Hafez, tr. H. Wilberforce Clarke (1891)</cite></figcaption>
              </figure>
            )}
          </div>
          <div className="col">
            <div className="label">02 — Sale</div>
            <dl className="traits">
              <div><dt>Price</dt><dd>{priceText}</dd></div>
              <div><dt>Minted</dt><dd>{supply} / {maxInv || '…'}</dd></div>
              <div><dt>Status</dt><dd>{status}{sale ? ` · ${sale.sold.toString()} of ${sale.allocation.toString()} sold through the minter` : ''}</dd></div>
            </dl>
            <div className="bar"><span style={{width: pct + '%'}} /></div>
            <button className="mint-btn wide" onClick={mint} disabled={!canMint}>
              {busy ? 'Minting…' : soldOut ? 'Sold out' : paused ? 'Paused' : !isEth ? 'ERC-20 — see README' : account ? 'Mint' : 'Connect & mint'}
            </button>
            {sale && !sale.configured ? <div className="fine">No sale configured yet for this collection.</div> : null}

            <div className="label mt">03 — Features{featured && !gen ? ` · #${featured.id}` : ''}</div>
            <dl className="traits">
              {traits.length && !gen ? traits.map((a) => (
                <div key={a.trait_type}><dt>{a.trait_type}</dt><dd dir="auto">{a.value}</dd></div>
              )) : <div><dt>—</dt><dd>{supply === 0 ? 'Revealed when each token is minted' : gen ? 'Pick a minted work below' : 'Rendering…'}</dd></div>}
            </dl>

            <div className="label mt">04 — Project</div>
            <dl className="traits">
              <div><dt>Contract</dt><dd>{EXPLORER ? <a href={EXPLORER + '/address/' + TOKEN} target="_blank" rel="noreferrer">{short(TOKEN)} ↗</a> : short(TOKEN)}</dd></div>
              <div><dt>Network</dt><dd>{CHAIN_NAME} ({CHAIN_ID})</dd></div>
              <div><dt>Minter</dt><dd>{EXPLORER ? <a href={EXPLORER + '/address/' + MINTER} target="_blank" rel="noreferrer">{short(MINTER)} ↗</a> : short(MINTER)}</dd></div>
              <div><dt>Script</dt><dd>On-chain, p5.js 1.9.0</dd></div>
              <div><dt>Fonts</dt><dd>Noto Nastaliq Urdu, EB Garamond (SIL OFL)</dd></div>
              <div><dt>Display</dt><dd>{ASPECT_LABEL === '3:2' ? 'Landscape 3:2, letterboxed' : 'Portrait 9:16'} · I verse · Space pause</dd></div>
            </dl>
          </div>
        </section>

        <section id="artworks" className="sec">
          <div className="sec-head">
            <div className="label">05 — Minted works</div>
            <span className="fine">{supply} minted · newest first</span>
          </div>
          <div className="grid">
            {tiles.map((t) => (
              <button className={'tile' + (!gen && featured?.id === t.id ? ' on' : '')} key={t.id} onClick={() => pick(t)}>
                <span className="tile-art">{t.image ? <img src={t.image} alt={t.name} loading="lazy" /> : <span className="art placeholder" />}</span>
                <span className="tile-label">#{t.id}</span>
              </button>
            ))}
          </div>
          {supply === 0 ? <p className="fine">No tokens minted yet — be the first.</p> : null}
          {pages > 1 ? (
            <div className="pager">
              <button className="link-btn" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>← Prev</button>
              <span className="fine">{page + 1} / {pages}</span>
              <button className="link-btn" onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}>Next →</button>
            </div>
          ) : null}
        </section>

        <section id="other-works" className="sec other">
          <div className="sec-head">
            <div className="label">06 — Also by {ARTIST} on Art Blocks</div>
            <a className="fine" href={AB_ARTIST_URL} target="_blank" rel="noopener noreferrer">View all ↗</a>
          </div>
          <div className="fine sub">{AB_WORKS.length} projects · {AB_WORKS_INFO}</div>
          <div className="grid">
            {AB_WORKS.map((w) => (
              <a className="tile" key={w.slug} href={w.url} target="_blank" rel="noopener noreferrer">
                <span className="tile-art soft"><img src={w.local} alt={w.title} loading="lazy" /></span>
                <span className="tile-label">{w.title}</span>
                <span className="tile-sub">{w.partner}</span>
              </a>
            ))}
          </div>
        </section>
      </main>

      <footer className="foot">
        <div>{COLLECTION_NAME} <span lang="fa" dir="rtl" className="fa-inline">{TITLE_FA}</span> · {ARTIST} · Built with ABX · {CHAIN_NAME} mainnet · <a href={EXPLORER + '/address/' + TOKEN} target="_blank" rel="noreferrer">Contract on Basescan</a></div>
        <div>Hafez translations: Gertrude Bell (1897), H. Wilberforce Clarke (1891), public domain.</div>
      </footer>
    </div>
  );
}
