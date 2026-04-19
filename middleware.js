// Vercel Edge Middleware — intercepts crawler requests to /post/* and /work/*
// and returns OG-correct HTML. Human visitors pass through to the SPA.

const POST_META = [
  { slug: 'translating-the-boardroom',
    title: 'Translating the Boardroom for the People Who Do the Work',
    excerpt: 'Every Monday morning I rewrite the CEO update for my design org. Here is why, how I do it, and the template you can steal.' },
  { slug: 'building-design-outcomes',
    title: 'Building Design Outcomes: From Conversation to Live Site in Two Hours',
    excerpt: 'I built a portfolio site for my design leadership work using Claude Design, Claude Code, and Vercel. The full process, the walls I hit, and what the publishing workflow looks like now.' },
  { slug: 'when-building-gets-cheap',
    title: 'When Building Gets Cheap, Carrying Gets Expensive',
    excerpt: 'AI is making it faster to ship features. That is not the hard part anymore. The hard part is deciding what deserves to exist.' },
  { slug: 'verbosity-in-an-interview',
    title: 'What Verbosity in an Interview Actually Tells You',
    excerpt: 'A candidate gave strong answers with real substance. Every single one took twice as long as it needed to. How I evaluated that signal and what I recommended.' },
  { slug: 'structure-is-the-problem',
    title: 'When the Structure Is the Problem, Not the Person',
    excerpt: 'We had the right designer doing the right work. We had an engaged PM partner. We had momentum. And the coordination was still breaking down.' },
  { slug: 'the-feedback-that-stopped',
    title: 'The Feedback That Stopped the Room',
    excerpt: 'A senior designer got quiet after a crit. Not defensive — quiet. Here is what I learned when I followed up, and how it changed how I run reviews.' },
  { slug: 'leverage-as-a-leadership-posture',
    title: 'Leverage as a Leadership Posture',
    excerpt: 'The best design leaders I know are not the ones doing the most work. They are the ones whose inputs produce the most output. That is leverage — and it is learnable.' },
  { slug: 'when-the-launch-is-real-and-the-team-is-thin',
    title: 'When the Launch Is Real and the Team Is Thin',
    excerpt: 'We had a hard deadline, a reduced team, and a scope that had not moved. Here is how I made the call, communicated it, and what I would do the same — and differently — next time.' },
];

const CASE_META = [
  { slug: 'sp-design-vision',
    title: '2026 Design Vision \u2014 SimplePractice',
    excerpt: 'Setting the strategic direction for product design at SimplePractice \u2014 defining what craft, quality, and outcomes mean for a platform serving 185k+ practitioners.' },
];

const BOT_UA = /linkedinbot|facebookexternalhit|facebot|twitterbot|bsky|bluesky|threadbot|meta-externalagent|applebot|googlebot|bingbot|slackbot|discordbot|whatsapp|telegrambot|embedly/i;

const esc = s => String(s)
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

export default function middleware(request) {
  const ua = request.headers.get('user-agent') || '';
  if (!BOT_UA.test(ua)) return; // not a crawler — pass through to SPA

  const url    = new URL(request.url);
  const p      = url.pathname;
  const postM  = p.match(/^\/post\/([^/]+)$/);
  const workM  = p.match(/^\/work\/([^/]+)$/);
  if (!postM && !workM) return;

  const slug   = (postM || workM)[1];
  const isWork = !!workM;
  const meta   = isWork ? CASE_META.find(c => c.slug === slug) : POST_META.find(m => m.slug === slug);

  const site   = 'https://ldlr.design';
  const title  = meta?.title   || 'Design Outcomes \u2014 Leonardo De La Rocha';
  const desc   = meta?.excerpt || 'Weekly design leadership writing by Leonardo De La Rocha, VP Product Design.';
  const image  = `${site}/og-images/${slug}.png`;
  const ogUrl  = `${site}${p}`;

  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${esc(title)}</title>
<meta property="og:site_name" content="Design Outcomes \u2014 Leonardo De La Rocha" />
<meta property="og:type" content="article" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:image" content="${esc(image)}" />
<meta property="og:url" content="${esc(ogUrl)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(desc)}" />
<meta name="twitter:image" content="${esc(image)}" />
</head>
<body></body>
</html>`,
    { headers: { 'content-type': 'text/html; charset=utf-8' } }
  );
}

export const config = {
  matcher: ['/post/:path*', '/work/:path*'],
};
