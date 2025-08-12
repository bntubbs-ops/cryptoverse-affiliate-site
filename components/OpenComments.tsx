
'use client';

import React from 'react';
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';

type Comment = {
  id: string;
  created_at: string;
  author: string | null;
  body: string;
  parent_id: string | null;
  user_id: string | null;
};

type Vote = { id: string; comment_id: string; user_id: string; };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;
const supabase: SupabaseClient | null = supabaseUrl && supabaseAnon ? createClient(supabaseUrl, supabaseAnon) : null;

export default function OpenComments() {
  const [author, setAuthor] = React.useState('');
  const [body, setBody] = React.useState('');
  const [replyTo, setReplyTo] = React.useState<string | null>(null);
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [votes, setVotes] = React.useState<Vote[]>([]);
  const [error, setError] = React.useState<string>('');
  const [loading, setLoading] = React.useState<boolean>(true);
  const [session, setSession] = React.useState<Session | null>(null);
  const [email, setEmail] = React.useState('');

  const votesMap = React.useMemo(() => {
    const m = new Map<string, number>();
    votes.forEach(v => m.set(v.comment_id, (m.get(v.comment_id) || 0) + 1));
    return m;
  }, [votes]);

  const myVotes = React.useMemo(() => {
    const uid = session?.user?.id;
    const set = new Set<string>();
    if (!uid) return set;
    votes.filter(v => v.user_id === uid).forEach(v => set.add(v.comment_id));
    return set;
  }, [votes, session]);

  async function loadAll() {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    setError('');
    const [{ data: commentsData, error: cErr }, { data: votesData, error: vErr }] = await Promise.all([
      supabase.from('comments').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('comment_votes').select('id, comment_id, user_id').limit(2000),
    ]);
    if (cErr) setError(cErr.message);
    if (vErr) setError((prev) => prev ? prev + ' | ' + vErr.message : vErr.message);
    setComments((commentsData as Comment[]) || []);
    setVotes((votesData as Vote[]) || []);
    setLoading(false);
  }

  async function post(parent_id: string | null = null) {
    if (!supabase) return;
    const who = author.trim() || session?.user?.email || 'anon';
    const text = body.trim();
    if (!text) return;
    setBody('');
    const { error } = await supabase.from('comments').insert({ author: who.slice(0,60), body: text.slice(0,4000), parent_id, user_id: session?.user?.id || null });
    if (error) setError(error.message);
    setReplyTo(null);
  }

  async function upvote(comment_id: string) {
    if (!supabase) { return; }
    if (!session?.user) { setError('Please sign in to upvote.'); return; }
    const user_id = session.user.id;
    // Prevent duplicate votes by inserting; rely on unique constraint on (comment_id, user_id)
    const { error } = await supabase.from('comment_votes').insert({ comment_id, user_id });
    if (error && !String(error.message).includes('duplicate')) setError(error.message);
  }

  async function signInMagic() {
    if (!supabase) return;
    const emailClean = email.trim();
    if (!emailClean) return;
    const { error } = await supabase.auth.signInWithOtp({ email: emailClean, options: { emailRedirectTo: (typeof window !== 'undefined' ? window.location.origin : '') } });
    if (error) setError(error.message);
    else alert('Check your email for the magic link.');
  }

  async function signInOAuth(provider: 'github' | 'google') {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: (typeof window !== 'undefined' ? window.location.href : undefined) } });
    if (error) setError(error.message);
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  React.useEffect(() => {
    (async () => {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
      return () => { listener.subscription.unsubscribe(); };
    })();
  }, []);

  React.useEffect(() => {
    loadAll();
    if (!supabase) return;
    const ch1 = supabase.channel('room-comments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, loadAll)
      .subscribe();
    const ch2 = supabase.channel('room-votes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comment_votes' }, loadAll)
      .subscribe();
    return () => { supabase?.removeChannel(ch1); supabase?.removeChannel(ch2); };
  }, []);

  if (!supabase) {
    return (
      <div className="rounded-2xl border border-vibrant-cyan p-4 space-y-3">
        <div className="text-vibrant-rose text-sm">Backend not configured</div>
        <p className="text-sm">To enable open comments with replies, upvotes, and auth:</p>
        <ol className="list-decimal list-inside text-sm space-y-1">
          <li>Create a <b>Supabase</b> project.</li>
          <li>Tables:
            <ul className="list-disc list-inside">
              <li><code>comments</code>: <code>id uuid pk default uuid_generate_v4()</code>, <code>created_at timestamp default now()</code>, <code>author text</code>, <code>body text</code>, <code>parent_id uuid nullable</code>, <code>user_id uuid nullable</code></li>
              <li><code>comment_votes</code>: <code>id uuid pk default uuid_generate_v4()</code>, <code>created_at timestamp default now()</code>, <code>comment_id uuid</code>, <code>user_id uuid</code>, unique(comment_id,user_id)</li>
            </ul>
          </li>
          <li>Enable RLS and add policies allowing <em>select</em> to all, and <em>insert</em> for authenticated users (for votes) and optionally anon (for comments).</li>
          <li>Set env: <code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.</li>
        </ol>
      </div>
    );
  }

  // Build a nested tree (1-level replies shown nested; deeper nesting also supported)
  const tree = React.useMemo(() => {
    const byParent = new Map<string | null, Comment[]>();
    comments.forEach(c => {
      const key = c.parent_id;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(c);
    });
    const sortFn = (a: Comment, b: Comment) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    byParent.forEach(arr => arr.sort(sortFn));
    return byParent;
  }, [comments]);

  function Children({ parentId }: { parentId: string | null }) {
    const kids = tree.get(parentId) || [];
    return (
      <div className={parentId ? 'pl-4 border-l border-vibrant-cyan/50 space-y-3' : 'space-y-3'}>
        {kids.map(c => (
          <div key={c.id} className="rounded-xl border border-vibrant-cyan p-3">
            <div className="text-xs text-vibrant-emerald flex items-center justify-between">
              <span>{c.author || 'anon'} • {new Date(c.created_at).toLocaleString()}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setReplyTo(prev => prev === c.id ? null : c.id)}
                  className="text-xs underline underline-offset-4 hover:lift"
                >Reply</button>
                <button
                  onClick={() => upvote(c.id)}
                  disabled={!session}
                  className={'text-xs px-2 py-0.5 rounded-full border ' + (myVotes.has(c.id) ? 'border-vibrant-emerald' : 'border-vibrant-cyan')}
                  title={session ? 'Upvote' : 'Sign in to upvote'}
                >
                  ▲ {votesMap.get(c.id) || 0}
                </button>
              </div>
            </div>
            <div className="mt-1 whitespace-pre-wrap">{c.body}</div>
            {replyTo === c.id && (
              <div className="mt-3 flex gap-2">
                <input
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onKeyDown={(e) => (e.key==='Enter' && (e.ctrlKey || e.metaKey)) ? post(c.id) : null}
                  className="flex-1 rounded-xl bg-black/30 border border-vibrant-cyan p-2 text-sm"
                  placeholder="Write a reply… (Cmd/Ctrl+Enter to post)"
                />
                <button onClick={() => post(c.id)} className="rounded-xl bg-vibrant-emerald px-3 py-2 text-xs font-semibold hover:lift">Reply</button>
              </div>
            )}
            {/* Render children recursively */}
            <div className="mt-3">
              <Children parentId={c.id} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-vibrant-cyan p-4 space-y-4">
      {/* Auth Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        {session ? (
          <>
            <span className="text-xs text-vibrant-emerald">Signed in as {session.user.email}</span>
            <button onClick={signOut} className="rounded-xl border border-vibrant-rose px-3 py-1 text-xs hover:lift">Sign out</button>
          </>
        ) : (
          <>
            <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" className="rounded-xl bg-black/30 border border-vibrant-cyan p-2 text-xs" />
            <button onClick={signInMagic} className="rounded-xl bg-vibrant-emerald px-3 py-2 text-xs font-semibold hover:lift">Magic link</button>
            <button onClick={() => signInOAuth('github')} className="rounded-xl border border-vibrant-cyan px-3 py-2 text-xs hover:lift">GitHub</button>
            <button onClick={() => signInOAuth('google')} className="rounded-xl border border-vibrant-cyan px-3 py-2 text-xs hover:lift">Google</button>
          </>
        )}
      </div>

      {/* New comment composer */}
      <div className="flex flex-col md:flex-row gap-3">
        <input value={author} onChange={(e) => setAuthor(e.target.value)} className="rounded-xl bg-black/30 border border-vibrant-cyan p-2 text-sm md:w-56" placeholder="Display name (optional)" />
        <input value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => (e.key==='Enter' && (e.ctrlKey || e.metaKey)) ? post(null) : null} className="flex-1 rounded-xl bg-black/30 border border-vibrant-cyan p-2 text-sm" placeholder="Write a comment… (Cmd/Ctrl+Enter to post)" />
        <button onClick={() => post(null)} className="rounded-xl bg-vibrant-emerald px-4 py-2 text-sm font-semibold hover:lift">Post</button>
      </div>

      {error && <div className="text-sm text-vibrant-rose">{error}</div>}
      {loading && <div className="text-sm text-vibrant-emerald">Loading…</div>}

      {/* Comments tree */}
      <Children parentId={null} />
    </div>
  );
}
