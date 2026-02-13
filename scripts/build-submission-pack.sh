#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${OUT_DIR:-./submission-pack}"
REPO_LINK="${REPO_LINK:-https://github.com/gabrieltemtsen/clenja-agent}"
DEMO_LINK="${DEMO_LINK:-<DEMO_LINK>}"
KARMA_LINK="${KARMA_LINK:-<KARMA_LINK>}"
TWEET_LINK="${TWEET_LINK:-<TWEET_LINK>}"

mkdir -p "$OUT_DIR"

cp docs/hackathon-submission.md "$OUT_DIR/"
cp docs/karma-template.md "$OUT_DIR/"
cp docs/tweet-template.txt "$OUT_DIR/"
cp docs/demo-video-checklist.md "$OUT_DIR/"
cp docs/demo-terminal-commands.md "$OUT_DIR/"
cp docs/architecture-diagram.md "$OUT_DIR/"

cat > "$OUT_DIR/README.md" <<EOF
# CLENJA Submission Bundle

Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")

## Fill these links before submit
- Repo: $REPO_LINK
- Demo: $DEMO_LINK
- Karma: $KARMA_LINK
- Tweet: $TWEET_LINK

## Included files
- hackathon-submission.md
- karma-template.md
- tweet-template.txt
- demo-video-checklist.md
- demo-terminal-commands.md
- architecture-diagram.md

## Next steps
1) Fill placeholders in karma/tweet templates
2) Attach Self unsupported-region screenshot
3) Record demo using checklist
4) Submit on Karma + post tweet
EOF

# helpful prefilled variants
sed "s|<REPO_LINK>|$REPO_LINK|g; s|<DEMO_LINK>|$DEMO_LINK|g; s|<KARMA_LINK>|$KARMA_LINK|g; s|<TWEET_LINK>|$TWEET_LINK|g" docs/karma-template.md > "$OUT_DIR/karma-template.prefilled.md"
sed "s|<REPO_LINK>|$REPO_LINK|g; s|<DEMO_LINK>|$DEMO_LINK|g; s|<KARMA_LINK>|$KARMA_LINK|g" docs/tweet-template.txt > "$OUT_DIR/tweet-template.prefilled.txt"

echo "Submission pack generated at: $OUT_DIR"
ls -la "$OUT_DIR"
