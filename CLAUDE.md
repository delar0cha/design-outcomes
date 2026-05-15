## Field Notes weekly review

When running `npm run field-notes:search`, respond with a ranked top 10 in a single markdown table. No prose preamble, no per-source grouping, no engineering detail.

Apply the rubric (5 dimensions × 0–5, total 0–25) to all surviving candidates and rank by total score.

Table format:

| # | Title | Author | Publisher | Date | Abstract | Score |
|---|---|---|---|---|---|---|
| 1 | ... | ... | ... | YYYY-MM-DD | ~25-word summary | 21/25 |

Column rules:

- Author: byline or "—" if unknown
- Date: YYYY-MM-DD
- Abstract: feed/search summary trimmed to ~25 words. If missing, write "No abstract available."
- Score: total out of 25, e.g., "21/25"

After the table, one tally line:

Raw: N · After filter: N · Top 10 shown.

If 5+ feed sources fail in a single run, add a one-line "Source health:" note after the tally.

Default count is 10. If Leonardo asks for a different count ("top 5", "top 20"), use that.

Engineering-detail exceptions: "smoke test," "debug the run," or "verify" mean show the full engineering output.

For `npm run field-notes:new`: scaffolded file path, extracted frontmatter values, stop.

### The Field Notes rubric

Five dimensions, scored 0–5 each (total 0–25). Use the full range — 3 is genuinely middling, not the default.

1. **Process visibility** — does the piece show *how* the work was done? Methods, named techniques, sequence, artifacts (sketches, prototypes, research notes). "We did extensive research" scores low; walked-through narrative scores high.
2. **Decision visibility** — tradeoffs, alternatives considered, constraints, paths not taken. Final-decision-as-obvious scores low; "we almost chose X, here's why we didn't" scores high.
3. **Specificity** — named projects, features, numbers, before-and-after artifacts vs generic advice. "Great teams do X" scores low; named project + specific move scores high.
4. **Originality** — fresh take, counterintuitive claim, unusual constraint, cross-domain synthesis. Standard-issue posts score low; arguing against received wisdom with evidence scores high. For pieces older than ~18 months, judge originality by freshness *today*, not at publication.
5. **Audience fit** — design leaders, product leaders, senior ICs. Substance assumes the reader has shipped real work, faces organizational complexity, or holds strategic stakes. Beginner-aimed pieces score low even if well-written.

Verdict thresholds (different bars because feeds are pre-curated by sources.json and web search isn't):

- **Feed candidates**: total ≥17 = strong fit, 12–16 = borderline, ≤11 = drop.
- **Web search candidates**: total ≥18 = strong fit, 13–17 = borderline, ≤12 = drop.

**Hard drops regardless of score:** primarily promotional content, job postings, low-effort AI-generated content, transcribed threads with no added substance, republishes of pieces already covered by another monitored source.

First-pass scoring from title + publisher + date + abstract is directional, not precise — you can't tell process visibility from a one-line summary. Break ties on publisher track record and abstract specificity; vague abstracts usually map to vague pieces.
