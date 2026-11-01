import { useEffect, useState } from 'react';
import { categoryColor } from '../lib';
import { domainFor, logoSrc } from '../logos';

const failed = new Set<string>();

function initials(name: string) {
  const w = name.trim().split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] ?? '') + (w[1]?.[0] ?? w[0]?.[1] ?? '')).toUpperCase();
}

/** Brand logo for a subscription, resolved from its website or name. Falls back to initials. */
export function Logo({ name, url, category, size = 40 }: { name: string; url?: string; category?: string; size?: number }) {
  const domain = domainFor(name, url);
  const [ok, setOk] = useState(() => !!domain && !failed.has(domain));
  useEffect(() => setOk(!!domain && !failed.has(domain)), [domain]);

  return (
    <span className={`avatar${ok ? ' has-logo' : ''}`} style={{ width: size, height: size, borderRadius: size * 0.28 }} aria-hidden="true">
      {ok && domain ? (
        <img
          key={domain}
          src={logoSrc(domain)}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={(e) => {
            // the favicon service answers unknown domains with a tiny generic globe
            if (e.currentTarget.naturalWidth <= 16) { failed.add(domain); setOk(false); }
          }}
          onError={() => { failed.add(domain); setOk(false); }}
        />
      ) : (
        <span className="avatar-text" style={{ fontSize: Math.round(size * 0.33) }}>{initials(name) || '·'}</span>
      )}
      {category && <i style={{ background: categoryColor(category) }} />}
    </span>
  );
}
