/**
 * sanitize-narration.ts — convert MDX body into ElevenLabs-ready narration text.
 *
 * Preamble structure before the body:
 *   title → 0.8s → byline → 0.8s → [ "why it matters" label → 0.6s → why ] → 1.0s → body
 *
 * If the `why` field is absent, the label+content pair is skipped and the
 * 0.8s post-byline pause is replaced with a 1.0s pause straight into the body.
 *
 * Within the body, structural boundaries (paragraphs, H2, H3, list items,
 * horizontal rules) get SSML-style <break time="Xs"/> tags for pacing.
 * Mid-paragraph punctuation is left untouched so the author's deliberate
 * rhythm is preserved.
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import type { Root, Content, PhrasingContent, Heading, List, ListItem, Paragraph, Blockquote } from 'mdast';

// ── Tunable copy (exported for wording adjustments) ─────────────────────────

/** Spoken after the title and a pause. Announces the narrator. */
export const NARRATION_BYLINE = "Narrated by the author, Leonardo De La Rocha.";

/** Spoken before the `why` field content, when present. */
export const WHY_LABEL = "Why it matters.";

// ── Pause durations (seconds) ───────────────────────────────────────────────

// Preamble pauses.
const PAUSE_AFTER_TITLE    = 0.8;
const PAUSE_AFTER_BYLINE   = 0.8;
const PAUSE_AFTER_WHY_LBL  = 0.6;
const PAUSE_BEFORE_BODY    = 1.0;

// Body pauses.
const PAUSE_PARAGRAPH = 0.6;
const PAUSE_H2_BEFORE = 1.2;
const PAUSE_H2_AFTER  = 0.8;
const PAUSE_H3_BEFORE = 0.8;
const PAUSE_H3_AFTER  = 0.8;
const PAUSE_LIST_ITEM = 0.4;
const PAUSE_HR        = 1.5;

// ── Number words for ordered list prefixes ──────────────────────────────────

const NUMBER_WORDS = [
  'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight',
  'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen',
  'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty',
];

function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

function breakTag(seconds: number): string {
  return `<break time="${seconds}s"/>`;
}

/**
 * Collapse runs of adjacent <break/> tags (separated only by whitespace) into
 * a single break using the longest duration. Prevents stacked pauses when a
 * block's trailing pause meets the next block's leading pause.
 */
function collapseAdjacentBreaks(text: string): string {
  const RUN = /<break time="([\d.]+)s"\/>(?:\s*<break time="([\d.]+)s"\/>)+/g;
  return text.replace(RUN, (match) => {
    const durations = [...match.matchAll(/<break time="([\d.]+)s"\/>/g)]
      .map(m => parseFloat(m[1]));
    return `<break time="${Math.max(...durations)}s"/>`;
  });
}

function endWithPeriod(s: string): string {
  const t = s.trim();
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

// ── Inline text extraction ──────────────────────────────────────────────────

function extractInlineText(nodes: readonly PhrasingContent[]): string {
  return nodes.map(inlineText).join('');
}

function inlineText(node: PhrasingContent | any): string {
  switch (node.type) {
    case 'text':
    case 'inlineCode':
      return String(node.value ?? '');
    case 'emphasis':
    case 'strong':
    case 'delete':
    case 'link':
      return extractInlineText(node.children ?? []);
    case 'break':
      return ' ';
    // Skipped inline nodes — images (read as nothing) and any MDX/HTML inline.
    case 'image':
    case 'html':
    case 'mdxJsxTextElement':
    case 'mdxTextExpression':
      return '';
    default:
      if (Array.isArray(node.children)) return extractInlineText(node.children);
      return '';
  }
}

// ── Block walker ────────────────────────────────────────────────────────────

function walkBlocks(nodes: readonly Content[]): string[] {
  const parts: string[] = [];

  for (const node of nodes) {
    switch (node.type) {
      case 'heading': {
        const h = node as Heading;
        const text = extractInlineText(h.children).trim();
        if (!text) break;
        const withPeriod = endWithPeriod(text);
        if (h.depth === 2) {
          parts.push(breakTag(PAUSE_H2_BEFORE), withPeriod, breakTag(PAUSE_H2_AFTER));
        } else if (h.depth === 3) {
          parts.push(breakTag(PAUSE_H3_BEFORE), withPeriod, breakTag(PAUSE_H3_AFTER));
        } else {
          parts.push(withPeriod, breakTag(PAUSE_PARAGRAPH));
        }
        break;
      }

      case 'paragraph': {
        const p = node as Paragraph;
        const text = extractInlineText(p.children).trim();
        if (text) parts.push(text, breakTag(PAUSE_PARAGRAPH));
        break;
      }

      case 'blockquote': {
        // Read inner blocks as plain prose; let prosody carry the tonal shift.
        const bq = node as Blockquote;
        parts.push(...walkBlocks(bq.children as Content[]));
        break;
      }

      case 'list': {
        const list = node as List;
        const ordered = list.ordered === true;
        const items = (list.children ?? []) as ListItem[];
        items.forEach((item, i) => {
          const itemParts = walkBlocks(item.children as Content[]);
          while (
            itemParts.length > 0 &&
            /^<break /.test(itemParts[itemParts.length - 1])
          ) {
            itemParts.pop();
          }
          const itemText = itemParts.join(' ').trim();
          if (!itemText) return;
          const prefix = ordered ? `${numberWord(i + 1)}. ` : '';
          parts.push(`${prefix}${itemText}`, breakTag(PAUSE_LIST_ITEM));
        });
        parts.push(breakTag(PAUSE_PARAGRAPH));
        break;
      }

      case 'code': {
        // Fenced code blocks: silently skip, insert a paragraph break only.
        parts.push(breakTag(PAUSE_PARAGRAPH));
        break;
      }

      case 'thematicBreak': {
        parts.push(breakTag(PAUSE_HR));
        break;
      }

      case 'html':
      case 'mdxjsEsm':
      case 'mdxFlowExpression':
      case 'mdxJsxFlowElement':
        break;

      default:
        break;
    }
  }

  return parts;
}

// ── Public API ──────────────────────────────────────────────────────────────

export interface NarrationInput {
  /** Post title — spoken first, as plain text. */
  title: string;
  /** Optional "why this matters" lede from frontmatter. */
  why?: string;
  /** Raw MDX body. */
  body: string;
}

/**
 * Produce ElevenLabs-ready narration text for a post.
 *
 * Order: title → 0.8s → byline → [0.8s → "Why it matters." → 0.6s → why →] 1.0s → body.
 * If `why` is absent, the label+content pair is skipped and the post-byline
 * pause is replaced with the pre-body pause.
 */
export function sanitizeMdxToNarration(input: NarrationInput): string {
  const { title, why, body } = input;

  const preamble: string[] = [];
  preamble.push(endWithPeriod(title));
  preamble.push(breakTag(PAUSE_AFTER_TITLE));
  preamble.push(NARRATION_BYLINE);

  const hasWhy = Boolean(why && why.trim());
  if (hasWhy) {
    preamble.push(breakTag(PAUSE_AFTER_BYLINE));
    preamble.push(WHY_LABEL);
    preamble.push(breakTag(PAUSE_AFTER_WHY_LBL));
    preamble.push(endWithPeriod(why!.trim()));
    preamble.push(breakTag(PAUSE_BEFORE_BODY));
  } else {
    preamble.push(breakTag(PAUSE_BEFORE_BODY));
  }

  const tree = unified().use(remarkParse).use(remarkMdx).parse(body) as Root;
  const blockParts = walkBlocks(tree.children as Content[]);

  const joined = [...preamble, ...blockParts].join(' ');
  // Collapse whitespace runs first — keeps break tags tidy without touching
  // intentional punctuation inside paragraphs. Then merge any adjacent breaks.
  const normalized = joined.replace(/\s+/g, ' ').trim();
  return collapseAdjacentBreaks(normalized);
}
