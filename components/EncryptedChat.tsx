
'use client';

import React from 'react';

export default function EncryptedChat() {
  const [passphrase, setPassphrase] = React.useState('');
  const [localSDP, setLocalSDP] = React.useState('');
  const [remoteSDP, setRemoteSDP] = React.useState('');
  const [status, setStatus] = React.useState('Idle');
  const [messages, setMessages] = React.useState<{ from: 'me' | 'peer'; text: string }[]>([]);
  const [outgoing, setOutgoing] = React.useState('');

  const pcRef = React.useRef<RTCPeerConnection | null>(null);
  const dcRef = React.useRef<RTCDataChannel | null>(null);
  const keyRef = React.useRef<CryptoKey | null>(null);
  const saltRef = React.useRef<Uint8Array | null>(null);

  async function deriveKey(pp: string, salt: Uint8Array) {
    const enc = new TextEncoder();
    const baseKey = await crypto.subtle.importKey('raw', enc.encode(pp), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function encrypt(text: string) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const key = keyRef.current!;
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text));
    return { iv: Array.from(iv), data: Array.from(new Uint8Array(ct)) };
  }
  async function decrypt(payload: any) {
    const key = keyRef.current!;
    const iv = new Uint8Array(payload.iv);
    const data = new Uint8Array(payload.data);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return new TextDecoder().decode(pt);
  }

  function setupPC() {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pc.onicegatheringstatechange = () => setStatus(`ICE: ${pc.iceGatheringState}`);
    pc.onconnectionstatechange = () => setStatus(`Peer: ${pc.connectionState}`);
    pc.onicecandidate = async (e) => {
      if (!e.candidate && pc.localDescription) {
        const sdpExport = btoa(JSON.stringify(pc.localDescription));
        setLocalSDP(sdpExport);
      }
    };
    pc.ondatachannel = (ev) => {
      dcRef.current = ev.channel;
      wireChannel();
    };
    pcRef.current = pc;
  }

  function wireChannel() {
    const dc = dcRef.current!;
    dc.onopen = () => setStatus('Channel open');
    dc.onmessage = async (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        if (payload.salt) {
          saltRef.current = new Uint8Array(payload.salt);
          keyRef.current = await deriveKey(passphrase, saltRef.current);
          return;
        }
        const text = await decrypt(payload);
        setMessages((m) => [...m, { from: 'peer', text }]);
      } catch {
        setMessages((m) => [...m, { from: 'peer', text: String(ev.data) }]);
      }
    };
  }

  async function createOffer() {
    setupPC();
    const pc = pcRef.current!;
    const dc = pc.createDataChannel('chat', { ordered: true });
    dcRef.current = dc;
    wireChannel();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    saltRef.current = crypto.getRandomValues(new Uint8Array(16));
  }

  async function acceptOffer() {
    setupPC();
    const pc = pcRef.current!;
    const desc = JSON.parse(atob(remoteSDP));
    await pc.setRemoteDescription(desc);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
  }

  async function submitAnswer() {
    const pc = pcRef.current!;
    const desc = JSON.parse(atob(remoteSDP));
    await pc.setRemoteDescription(desc);
    const check = setInterval(() => {
      if (dcRef.current?.readyState === 'open' && saltRef.current) {
        dcRef.current!.send(JSON.stringify({ salt: Array.from(saltRef.current) }));
        clearInterval(check);
      }
    }, 300);
  }

  async function send() {
    if (!dcRef.current || dcRef.current.readyState !== 'open') return;
    if (!keyRef.current) {
      if (!saltRef.current) return;
      keyRef.current = await deriveKey(passphrase, saltRef.current);
    }
    const payload = await encrypt(outgoing);
    dcRef.current.send(JSON.stringify(payload));
    setMessages((m) => [...m, { from: 'me', text: outgoing }]);
    setOutgoing('');
  }

  return (
    <div className="\1 hover-scale">
      <p className="text-sm text-vibrant-emerald">
        One‑to‑one chat using WebRTC data channels. Messages are end‑to‑end encrypted (AES‑GCM 256) with a key derived
        from your shared passphrase. Copy‑paste SDPs to connect—no server required.
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-vibrant-emerald">Passphrase</label>
          <input
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            type="password"
            className="mt-1 w-full rounded-xl bg-slate-900 border border-vibrant-rose p-2"
            placeholder="Enter a shared secret"
          />
        </div>
        <div className="flex items-end gap-2">
          <button onClick={createOffer} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold">
            Create Offer
          </button>
          <button onClick={acceptOffer} className="rounded-xl bg-slate-700 px-3 py-2 text-sm font-semibold">
            Accept Offer → Make Answer
          </button>
          <button onClick={submitAnswer} className="rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold">
            Submit Answer
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-vibrant-emerald">Your SDP (share this)</label>
          <textarea
            readOnly
            value={localSDP}
            className="mt-1 w-full h-32 rounded-xl bg-slate-900 border border-vibrant-rose p-2 text-xs break-all"
          />
        </div>
        <div>
          <label className="text-xs text-vibrant-emerald">Peer SDP (paste here)</label>
          <textarea
            value={remoteSDP}
            onChange={(e) => setRemoteSDP(e.target.value)}
            className="mt-1 w-full h-32 rounded-xl bg-slate-900 border border-vibrant-rose p-2 text-xs"
            placeholder="Paste the other side's offer/answer here"
          />
        </div>
      </div>

      <div className="text-xs text-vibrant-emerald">Status: {status}</div>

      <div className="h-48 overflow-auto rounded-xl border border-vibrant-cyan p-3 bg-animated-gradient/60 space-y-1">
        {messages.map((m, i) => (
          <div key={i} className={m.from === 'me' ? 'text-right' : 'text-left'}>
            <span className={'inline-block rounded-xl px-3 py-1 text-sm ' + (m.from === 'me' ? 'bg-emerald-600/30' : 'bg-slate-700/50')}>
              {m.text}
            </span>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={outgoing}
          onChange={(e) => setOutgoing(e.target.value)}
          className="flex-1 rounded-xl bg-slate-900 border border-vibrant-rose p-2"
          placeholder="Write a message…"
        />
        <button onClick={send} className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold">
          Send
        </button>
      </div>
    </div>
  );
}
