
'use client';

import React from 'react';
import NewsList from '@/components/NewsList';
import EncryptedChat from '@/components/EncryptedChat';
import MotionToggle from '@/components/MotionToggle';
import OpenComments from '@/components/OpenComments';

export default function Page() {
  const [prices, setPrices] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    const controller = new AbortController();
    async function fetchPrices() {
      try {
        setLoading(true);
        setError('');
        const url =
          'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,cardano,chainlink,polkadot&vs_currencies=usd&include_24hr_change=true';
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setPrices(data);
      } catch (e: any) {
        if (e?.name !== 'AbortError') setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchPrices();
    const id = setInterval(fetchPrices, 60_000);
    return () => { controller.abort(); clearInterval(id); };
  }, []);

  const coins = [
    { id: 'bitcoin', label: 'Bitcoin' },
    { id: 'ethereum', label: 'Ethereum' },
    { id: 'solana', label: 'Solana' },
    { id: 'cardano', label: 'Cardano' },
    { id: 'chainlink', label: 'Chainlink' },
    { id: 'polkadot', label: 'Polkadot' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-vibrant-emerald to-vibrant-cyan animate-gradient">
      <header className="sticky top-0 z-50 backdrop-blur bg-animated-gradient/70 border-b border-vibrant-cyan">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400" />
            <span className="font-semibold tracking-tight">CryptoVerse</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-vibrant-cyan">
            <a href="#prices" className="hover:text-white">Live Prices</a>
            <a href="#news" className="hover:text-white">News</a>
            <a href="#chat" className="hover:text-white">Chat</a>
            <a href="#earn" className="hover:text-white">Earn</a>
          </nav>
          <div className="hidden md:flex items-center gap-3"><MotionToggle /></div>
          <div className="md:hidden"><MotionToggle /></div>
          <a
            href="https://coinbase.com/join/YE4WZQQ?src=referral-link"
            target="_blank"
            rel="noreferrer"
            className="\1 hover-scale"
          >
            Start on Coinbase
          </a>
        </div>
      </header>

      <section className="relative isolate overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 py-16 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
              Real‑time crypto prices, curated news & encrypted chat.
            </h1>
            <p className="mt-4 text-vibrant-cyan max-w-prose">
              Live market data, signal‑packed headlines aggregated from top publishers, and a peer‑to‑peer encrypted chatroom.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="https://coinbase.com/join/YE4WZQQ?src=referral-link"
                target="_blank"
                rel="noreferrer"
                className="\1 hover-scale"
              >
                Claim your Coinbase bonus →
              </a>
              <a href="#news" className="\1 hover-scale">
                See the latest news
              </a>
            </div>
            <div className="mt-6">
              <AffiliateBanner />
            </div>
          </div>
          <div className="lg:justify-self-end w-full">
            <LiveTicker prices={prices} loading={loading} error={error} coins={coins} />
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 grid lg:grid-cols-3 gap-8 pb-24">
        <section id="prices" className="lg:col-span-2">
          <h2 className="text-xl font-bold mb-4">Top coins</h2>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {coins.map((c) => (
              <PriceCard key={c.id} id={c.id} label={c.label} data={prices?.[c.id]} loading={loading} />
            ))}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="\1 hover-scale">
            <h3 className="font-semibold mb-3">Sponsored</h3>
            <AffiliateTile />
          </div>
          <div className="\1 hover-scale">
            <h3 className="font-semibold mb-3">Another partner</h3>
            <p className="text-sm text-vibrant-cyan">Reserve space for another affiliate or your own product.</p>
          </div>
        </aside>

        <section id="news" className="lg:col-span-2">
          <h2 className="text-xl font-bold mb-4">Latest crypto headlines</h2>
          <NewsList />
        </section>

        <section id="earn" className="lg:col-span-1">
          <h2 className="text-xl font-bold mb-4">Earn & Learn</h2>
          <ul className="space-y-3 text-sm text-vibrant-cyan">
            <li>• Coinbase sign‑up bonus (affiliate)</li>
            <li>• Refer‑a‑friend campaigns</li>
            <li>• On‑chain quests + airdrops</li>
          </ul>
        </section>

        <section id="chat" className="lg:col-span-3">
          <h2 className="text-xl font-bold mb-4">Open Comments (Disqus‑style)</h2>
          <OpenComments />
          <h2 className="text-xl font-bold my-4">Private Encrypted Chat (P2P)</h2>
          <h2 className="text-xl font-bold mb-4">Encrypted Chatroom (Peer‑to‑Peer)</h2>
          <EncryptedChat />
        </section>
      </main>

      <footer className="border-t border-vibrant-cyan">
        <div className="mx-auto max-w-7xl px-4 py-8 text-xs text-vibrant-emerald flex items-center justify-between">
          <span>© {new Date().getFullYear()} CryptoVerse</span>
          <a href="https://coinbase.com/join/YE4WZQQ?src=referral-link" target="_blank" rel="noreferrer" className="hover:text-white">Coinbase affiliate</a>
        </div>
      </footer>
    </div>
  );
}

function LiveTicker({ prices, loading, error, coins }: any) {
  return (
    <div className="\1 hover-scale">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Live Ticker</h3>
        {loading && <span className="text-xs text-vibrant-emerald">refreshing…</span>}
      </div>
      {error && <div className="text-sm text-rose-400 mb-2">Couldn’t load prices: {error}</div>}
      <div className="flex flex-col gap-2 max-h-64 overflow-auto pr-2">
        {coins.map((c: any) => {
          const d = prices?.[c.id];
          const change = d?.usd_24h_change ?? 0;
          const sign = Math.sign(change);
          return (
            <div key={c.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-600" />
                <span className="text-vibrant-cyan">{c.label}</span>
              </div>
              <div className="tabular-nums">
                {d ? (
                  <>
                    <span className="font-semibold">${d.usd.toLocaleString()}</span>
                    <span className={`ml-3 ${sign >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {sign >= 0 ? '+' : ''}{change.toFixed(2)}%
                    </span>
                  </>
                ) : (
                  <span className="text-vibrant-orange">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PriceCard({ id, label, data, loading }: any) {
  return (
    <div className="\1 hover-scale">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{label}</h3>
        <span className="text-xs text-vibrant-emerald">{loading ? '…' : '24h'}</span>
      </div>
      <div className="mt-2 text-2xl font-extrabold tabular-nums">{data ? `$${data.usd.toLocaleString()}` : '—'}</div>
      <div className={`mt-1 text-sm ${data && data.usd_24h_change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
        {data ? `${data.usd_24h_change.toFixed(2)}%` : ''}
      </div>
      <a
        href={`https://www.coingecko.com/en/coins/${id}`}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-block text-xs text-sky-400 hover:underline"
      >
        View on CoinGecko
      </a>
    </div>
  );
}

function AffiliateBanner() {
  return (
    <a
      href="https://coinbase.com/join/YE4WZQQ?src=referral-link"
      target="_blank"
      rel="noreferrer"
      className="\1 hover-scale"
    >
      <div className="text-sm text-emerald-300">Sponsored</div>
      <div className="mt-1 text-lg font-semibold">Get started on Coinbase</div>
      <div className="text-sm text-vibrant-cyan">Buy crypto in minutes. Bonus for new users.</div>
    </a>
  );
}

function AffiliateTile() {
  return (
    <a
      href="https://coinbase.com/join/YE4WZQQ?src=referral-link"
      target="_blank"
      rel="noreferrer"
      className="block rounded-xl border border-vibrant-rose p-3 hover:bg-slate-900"
    >
      <div className="text-xs text-vibrant-emerald">Sponsored</div>
      <div className="font-semibold">Coinbase</div>
      <div className="text-xs text-vibrant-emerald">Buy • Sell • Earn</div>
    </a>
  );
}
