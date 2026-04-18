const fs   = require('fs');
const path = require('path');
const { POST_META, CASE_META } = require('../data/content-meta.js');

const BOT_UA = /linkedinbot|twitterbot|facebookexternalhit|facebot|slackbot|whatsapp|telegrambot|discordbot|googlebot|bingbot|yandexbot|duckduckbot|applebot|rogerbot|embedly|quora|outbrain|w3c_validator/i;

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

  const site  = 'https://ldlr.design';
  const title = meta ? meta.title : 'Design Outcomes \u2014 Leonardo De La Rocha';
  const desc  = meta ? (meta.excerpt || meta.summary || '') : 'Weekly design leadership writing by Leonardo De La Rocha, VP Product Design.';
  const image = meta?.ogImage ? `${site}${meta.ogImage}` : `${site}/images/work-header.png`;
  const url   = `${site}${isWork ? '/work/' : '/post/'}${slug}`;

  const ua     = req.headers['user-agent'] || '';
  const isBot  = BOT_UA.test(ua);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (isBot) {
    // Return minimal HTML — bots see OG tags, no JS needed
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
</head>
<body>${esc(title)}</body>
</html>`);
    return;
  }

  // For browsers: serve index.html with OG tags replaced in-place
  try {
    let html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');

    // Replace content="..." for a specific og/twitter tag (handles both attribute orders)
    const replaceProp = (tag, val) => {
      // Match: <meta property="tag" content="OLD"/> or <meta name="tag" content="OLD"/>
      html = html.replace(
        new RegExp(`(<meta\\s[^>]*(?:property|name)="${tag.replace(/:/g,'\\:')}[^>]*content=")[^"]*(")`),
        `$1${esc(val)}$2`
      );
    };

    replaceProp('og:title',            title);
    replaceProp('og:description',      desc);
    replaceProp('og:image',            image);
    replaceProp('og:url',              url);
    replaceProp('twitter:title',       title);
    replaceProp('twitter:description', desc);
    replaceProp('twitter:image',       image);

    res.end(html);
  } catch (e) {
    res.statusCode = 500;
    res.end('Error loading page');
  }
};
