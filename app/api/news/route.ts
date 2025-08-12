
import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

export const runtime = 'nodejs';

const FEEDS = [
  'https://www.coindesk.com/arc/outboundfeeds/rss/',
  'https://cointelegraph.com/rss',
  'https://decrypt.co/feed',
,
  'https://www.theblock.co/rss',
  'https://blockworks.co/feed',
  'https://blog.intotheblock.com/feed',
  'https://research.binance.com/feed'
];

const UA = 'Mozilla/5.0 (compatible; CryptoVerseBot/1.0; +https://example.com)';

async function fetchXML(url: string): Promise<string> {
  // Try direct
  try {
    const res = await fetch(url, { cache: 'no-store', headers: { 'user-agent': UA, 'accept': 'application/rss+xml, application/xml;q=0.9, */*;q=0.8' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    if (xml && xml.trim().length > 0) return xml;
    throw new Error('Empty body');
  } catch (e) {
    // Fallback to r.jina.ai proxy (simple passthrough)
    const proxied = `https://r.jina.ai/${url}`;
    const res2 = await fetch(proxied, { cache: 'no-store', headers: { 'user-agent': UA } });
    if (!res2.ok) throw new Error(`Proxy HTTP ${res2.status}`);
    return await res2.text();
  }
}

function first<T>(x: any): T | undefined {
  if (x == null) return undefined;
  return Array.isArray(x) ? x[0] : x;
}

function normalizeItems(obj: any, sourceTitle: string) {
  // RSS 2.0 path
  const rssChannel = obj?.rss?.channel || obj?.channel;
  let items: any[] = [];
  if (rssChannel?.item) {
    items = Array.isArray(rssChannel.item) ? rssChannel.item : [rssChannel.item];
    return items.map((it: any) => ({
      title: first<string>(it.title) || '(no title)',
      url: typeof it.link === 'string' ? it.link : first<string>(it.link) || '#',
      time: first<string>(it.pubDate) || first<string>(it.date) || new Date().toUTCString(),
      source: sourceTitle,
    }));
  }
  // Atom path
  const feed = obj?.feed;
  if (feed?.entry) {
    items = Array.isArray(feed.entry) ? feed.entry : [feed.entry];
    return items.map((it: any) => {
      const link = Array.isArray(it.link) ? it.link.find((l: any) => l.href)?.href : (it.link?.href || '#');
      return {
        title: first<string>(it.title) || '(no title)',
        url: link || '#',
        time: first<string>(it.published) || first<string>(it.updated) || new Date().toUTCString(),
        source: sourceTitle,
      };
    });
  }
  return [];
}

export async function GET() {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
  try {
    const results = await Promise.all(FEEDS.map(async (url) => {
      const xml = await fetchXML(url);
      const data = parser.parse(xml);
      const sourceTitle =
        (data?.rss?.channel && first<string>(data.rss.channel.title)) ||
        (data?.channel && first<string>(data.channel.title)) ||
        (data?.feed && (first<string>(data.feed.title) || new URL(url).host)) ||
        new URL(url).host;
      return normalizeItems(data, sourceTitle);
    }));
    const merged = results
      .flat()
      .filter(Boolean)
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
      .reverse()
      .slice(0, 50);
    return NextResponse.json({ items: merged });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed to load feeds', items: [] }, { status: 500 });
  }
}
