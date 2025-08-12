
'use client';

import React from 'react';

type NewsItem = { title: string; url: string; time: string; source: string };
type SortMode = 'Latest' | 'Oldest' | 'A→Z' | 'Z→A';

const TOPIC_CHIPS: { label: string; keywords: string[] }[] = [
  { label: 'BTC', keywords: ['bitcoin', 'btc', 'satoshi'] },
  { label: 'ETH', keywords: ['ethereum', 'eth', 'vitalik'] },
  { label: 'SOL', keywords: ['solana', 'sol'] },
  { label: 'DeFi', keywords: ['defi', 'dex', 'lending', 'yield', 'amm'] },
  { label: 'NFTs', keywords: ['nft', 'opensea', 'ordinals', 'mint'] },
  { label: 'Regulation', keywords: ['sec', 'cftc', 'lawsuit', 'regulation', 'court', 'eu'] },
  { label: 'Institutions', keywords: ['etf', 'blackrock', 'fidelity', 'institutional', 'custody'] },
];

const STOP = new Set(['the','a','an','and','or','but','to','of','for','in','on','at','by','with','from','as','is','are','was','were','be','been','it','this','that','these','those','new','usd','up','down','vs','into','over','under','about','after','before','how','why','what']);
function tokenize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w) && w.length > 2);
}
function computeTrending(items: NewsItem[], k = 10): string[] {
  const docs = items.map(i => tokenize(i.title));
  const df = new Map<string, number>();
  docs.forEach(set => {
    const uniq = new Set(set);
    uniq.forEach(w => df.set(w, (df.get(w) || 0) + 1));
  });
  const N = Math.max(1, docs.length);
  const scores = new Map<string, number>();
  docs.forEach(tokens => {
    const tf = new Map<string, number>();
    tokens.forEach(w => tf.set(w, (tf.get(w) || 0) + 1));
    tf.forEach((t, w) => {
      const idf = Math.log(N / (1 + (df.get(w) || 1)));
      scores.set(w, (scores.get(w) || 0) + t * idf);
    });
  });
  return Array.from(scores.entries()).sort((a,b) => b[1]-a[1]).slice(0, k).map(e => e[0]);
}

export default function NewsList() {
  const [items, setItems] = React.useState<NewsItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string>('');
  const [query, setQuery] = React.useState<string>('');
  const [source, setSource] = React.useState<string>('All');
  const [sort, setSort] = React.useState<SortMode>('Latest');
  const [activeTopics, setActiveTopics] = React.useState<string[]>([]);

  const trending = React.useMemo(() => computeTrending(items, 10), [items]);

  const sources = React.useMemo(() => {
    const s = Array.from(new Set(items.map(i => i.source))).sort();
    return ['All', ...s];
  }, [items]);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError('');
        const res = await fetch('/api/news');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setItems(data.items);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'News failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const topics = activeTopics.slice();
    return items.filter(i => {
      const matchSource = source === 'All' || i.source === source;
      const matchQuery = !q || i.title.toLowerCase().includes(q);
      const matchTopics = topics.length === 0 || topics.some(t => {
        const chip = TOPIC_CHIPS.find(c => c.label === t);
        return chip ? chip.keywords.some(k => i.title.toLowerCase().includes(k)) : false;
      });
      return matchSource && matchQuery && matchTopics;
    });
  }, [items, query, source, activeTopics]);

  const sorted = React.useMemo(() => {
    const arr = [...filtered];
    switch (sort) {
      case 'Oldest':
        arr.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
        break;
      case 'A→Z':
        arr.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'Z→A':
        arr.sort((a, b) => b.title.localeCompare(a.title));
        break;
      default: // Latest
        arr.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    }
    return arr;
  }, [filtered, sort]);

  function toggleTopic(label: string) {
    setActiveTopics(prev => prev.includes(label) ? prev.filter(t => t !== label) : [...prev, label]);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search headlines…"
          className="flex-1 rounded-xl bg-black/30 border border-vibrant-cyan p-2 text-sm"
        />
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="rounded-xl bg-black/30 border border-vibrant-cyan p-2 text-sm md:w-56"
        >
          {sources.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          className="rounded-xl bg-black/30 border border-vibrant-cyan p-2 text-sm md:w-40"
        >
          {(['Latest','Oldest','A→Z','Z→A'] as SortMode[]).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="text-xs opacity-80 mr-1">Trending:</span>
        {trending.map(term => (
          <button key={term} onClick={() => setQuery(term)} className="px-2 py-0.5 rounded-full border border-vibrant-emerald text-xs hover:lift">
            {term}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {TOPIC_CHIPS.map(chip => {
          const active = activeTopics.includes(chip.label);
          return (
            <button
              key={chip.label}
              onClick={() => toggleTopic(chip.label)}
              className={
                'px-3 py-1 rounded-full border text-xs transition-all hover:lift ' +
                (active ? 'border-vibrant-emerald bg-black/40' : 'border-vibrant-cyan bg-black/20')
              }
            >
              {chip.label}
            </button>
          );
        })}
        {activeTopics.length > 0 && (
          <button onClick={() => setActiveTopics([])} className="px-3 py-1 rounded-full border border-vibrant-rose text-xs">
            Clear
          </button>
        )}
      </div>

      {loading && <div className="text-sm text-vibrant-emerald">Loading news…</div>}
      {error && <div className="text-sm text-vibrant-rose">{error}</div>}

      <div className="space-y-3">
        {sorted.map((n, i) => (
          <a key={i} href={n.url} target="_blank" rel="noreferrer" className="block rounded-2xl border border-vibrant-cyan p-4 hover:bg-black/20 transition-colors duration-200 hover:lift">
            <div className="text-sm text-vibrant-emerald">{n.source} • {new Date(n.time).toLocaleString()}</div>
            <div className="font-semibold">{n.title}</div>
          </a>
        ))}
        {!loading && sorted.length === 0 && (
          <div className="text-sm text-vibrant-orange">No results. Try a different term, source, or topic.</div>
        )}
      </div>
    </div>
  );
}
