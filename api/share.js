const { POST_META, CASE_META } = require('../data/content-meta.js');

const esc = s => String(s)
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

module.exports = (req, res) => {
  const { slug, type } = req.query;
  const isWork = type === 'work';

  const meta = isWork
    ? CASE_META.find(c => c.slug === slug)
    : POST_META.find(p => p.slug === slug);

  const site     = 'https://ldlr.design';
  const title    = meta ? meta.title   : 'Design Outcomes — Leonardo De La Rocha';
  const desc     = meta ? (meta.excerpt || meta.summary || '') : 'Weekly design leadership writing by Leonardo De La Rocha, VP Product Design.';
  const image    = meta?.ogImage ? `${site}${meta.ogImage}` : `${site}/images/work-header.png`;
  const hashPath = isWork ? `#/work/${slug}` : `#/post/${slug}`;
  const url      = `${site}/${hashPath}`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${esc(title)}</title>
<meta property="og:site_name" content="Design Outcomes \u2014 Leonardo De La Rocha"/>
<meta property="og:type" content="article"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(desc)}"/>
<meta property="og:image" content="${esc(image)}"/>
<meta property="og:url" content="${esc(url)}"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(title)}"/>
<meta name="twitter:description" content="${esc(desc)}"/>
<meta name="twitter:image" content="${esc(image)}"/>
<meta http-equiv="refresh" content="0;url=${esc(url)}"/>
</head>
<body>
<script>window.location.replace(${JSON.stringify(url)});</script>
</body>
</html>`);
};
