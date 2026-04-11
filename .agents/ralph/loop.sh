#!/bin/bash
# Ralph loop — simple, portable, single-agent
# Usage:
#   ./.agents/ralph/loop.sh                 # build mode, default iterations
#   ./.agents/ralph/loop.sh build           # build mode
#   ./.agents/ralph/loop.sh prd "request"   # generate PRD via agent
#   ./.agents/ralph/loop.sh 10              # build mode, 10 iterations
#   ./.agents/ralph/loop.sh build 1 --no-commit

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${RALPH_ROOT:-${SCRIPT_DIR}/../..}" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/config.sh"

DEFAULT_PRD_PATH=".agents/tasks/prd.json"
DEFAULT_PROGRESS_PATH=".ralph/progress.md"
DEFAULT_AGENTS_PATH="AGENTS.md"
DEFAULT_PROMPT_BUILD=".agents/ralph/PROMPT_build.md"
DEFAULT_GUARDRAILS_PATH=".ralph/guardrails.md"
DEFAULT_ERRORS_LOG_PATH=".ralph/errors.log"
DEFAULT_ACTIVITY_LOG_PATH=".ralph/activity.log"
DEFAULT_TMP_DIR=".ralph/.tmp"
DEFAULT_RUNS_DIR=".ralph/runs"
DEFAULT_GUARDRAILS_REF=".agents/ralph/references/GUARDRAILS.md"
DEFAULT_CONTEXT_REF=".agents/ralph/references/CONTEXT_ENGINEERING.md"
DEFAULT_ACTIVITY_CMD=".agents/ralph/log-activity.sh"
if [[ -n "${RALPH_ROOT:-}" ]]; then
  agents_path="$RALPH_ROOT/.agents/ralph/agents.sh"
else
  agents_path="$SCRIPT_DIR/agents.sh"
fi
if [[ -f "$agents_path" ]]; then
  # shellcheck source=/dev/null
  source "$agents_path"
fi

DEFAULT_MAX_ITERATIONS=25
DEFAULT_NO_COMMIT=false
DEFAULT_STALE_SECONDS=0
PRD_REQUEST_PATH=""
PRD_INLINE=""

if [ -f "$CONFIG_FILE" ]; then
  # shellcheck source=/dev/null
  . "$CONFIG_FILE"
fi

DEFAULT_AGENT_NAME="${DEFAULT_AGENT:-codex}"
resolve_agent_cmd() {
  local name="$1"
  case "$name" in
    claude)
      echo "${AGENT_CLAUDE_CMD:-claude -p --dangerously-skip-permissions \"\$(cat {prompt})\"}"
      ;;
    droid)
      echo "${AGENT_DROID_CMD:-droid exec --skip-permissions-unsafe -f {prompt}}"
      ;;
    codex|"")
      echo "${AGENT_CODEX_CMD:-codex exec --yolo --skip-git-repo-check -}"
      ;;
    *)
      echo "${AGENT_CODEX_CMD:-codex exec --yolo --skip-git-repo-check -}"
      ;;
  esac
}
DEFAULT_AGENT_CMD="$(resolve_agent_cmd "$DEFAULT_AGENT_NAME")"

PRD_PATH="${PRD_PATH:-$DEFAULT_PRD_PATH}"
PROGRESS_PATH="${PROGRESS_PATH:-$DEFAULT_PROGRESS_PATH}"
AGENTS_PATH="${AGENTS_PATH:-$DEFAULT_AGENTS_PATH}"
PROMPT_BUILD="${PROMPT_BUILD:-$DEFAULT_PROMPT_BUILD}"
GUARDRAILS_PATH="${GUARDRAILS_PATH:-$DEFAULT_GUARDRAILS_PATH}"
ERRORS_LOG_PATH="${ERRORS_LOG_PATH:-$DEFAULT_ERRORS_LOG_PATH}"
ACTIVITY_LOG_PATH="${ACTIVITY_LOG_PATH:-$DEFAULT_ACTIVITY_LOG_PATH}"
TMP_DIR="${TMP_DIR:-$DEFAULT_TMP_DIR}"
RUNS_DIR="${RUNS_DIR:-$DEFAULT_RUNS_DIR}"
GUARDRAILS_REF="${GUARDRAILS_REF:-$DEFAULT_GUARDRAILS_REF}"
CONTEXT_REF="${CONTEXT_REF:-$DEFAULT_CONTEXT_REF}"
ACTIVITY_CMD="${ACTIVITY_CMD:-$DEFAULT_ACTIVITY_CMD}"
AGENT_CMD="${AGENT_CMD:-$DEFAULT_AGENT_CMD}"
MAX_ITERATIONS="${MAX_ITERATIONS:-$DEFAULT_MAX_ITERATIONS}"
NO_COMMIT="${NO_COMMIT:-$DEFAULT_NO_COMMIT}"
STALE_SECONDS="${STALE_SECONDS:-$DEFAULT_STALE_SECONDS}"

abs_path() {
  local p="$1"
  if [[ "$p" = /* ]]; then
    echo "$p"
  else
    echo "$ROOT_DIR/$p"
  fi
}

PRD_PATH="$(abs_path "$PRD_PATH")"
PROGRESS_PATH="$(abs_path "$PROGRESS_PATH")"
AGENTS_PATH="$(abs_path "$AGENTS_PATH")"
PROMPT_BUILD="$(abs_path "$PROMPT_BUILD")"
GUARDRAILS_PATH="$(abs_path "$GUARDRAILS_PATH")"
ERRORS_LOG_PATH="$(abs_path "$ERRORS_LOG_PATH")"
ACTIVITY_LOG_PATH="$(abs_path "$ACTIVITY_LOG_PATH")"
TMP_DIR="$(abs_path "$TMP_DIR")"
RUNS_DIR="$(abs_path "$RUNS_DIR")"
GUARDRAILS_REF="$(abs_path "$GUARDRAILS_REF")"
CONTEXT_REF="$(abs_path "$CONTEXT_REF")"
ACTIVITY_CMD="$(abs_path "$ACTIVITY_CMD")"

require_agent() {
  local agent_cmd="${1:-$AGENT_CMD}"
  local agent_bin
  agent_bin="${agent_cmd%% *}"
  if [ -z "$agent_bin" ]; then
    echo "AGENT_CMD is empty. Set it in config.sh."
    exit 1
  fi
  if ! command -v "$agent_bin" >/dev/null 2>&1; then
    echo "Agent command not found: $agent_bin"
    case "$agent_bin" in
      codex)
        echo "Install: npm i -g @openai/codex"
        ;;
      claude)
        echo "Install: curl -fsSL https://claude.ai/install.sh | bash"
        ;;
      droid)
        echo "Install: curl -fsSL https://app.factory.ai/cli | sh"
        ;;
      opencode)
        echo "Install: curl -fsSL https://opencode.ai/install.sh | bash"
        ;;
    esac
    echo "Then authenticate per the CLI's instructions."
    exit 1
  fi
}

run_agent() {
  local prompt_file="$1"
  if [[ "$AGENT_CMD" == *"{prompt}"* ]]; then
    local escaped
    escaped=$(printf '%q' "$prompt_file")
    local cmd="${AGENT_CMD//\{prompt\}/$escaped}"
    eval "$cmd"
  else
    cat "$prompt_file" | eval "$AGENT_CMD"
  fi
}

run_agent_inline() {
  local prompt_file="$1"
  local prompt_content
  prompt_content="$(cat "$prompt_file")"
  local escaped
  escaped=$(printf "%s" "$prompt_content" | sed "s/'/'\\\\''/g")
  local cmd="${PRD_AGENT_CMD:-$AGENT_CMD}"
  if [[ "$cmd" == *"{prompt}"* ]]; then
    cmd="${cmd//\{prompt\}/'$escaped'}"
  else
    cmd="$cmd '$escaped'"
  fi
  eval "$cmd"
}

MODE="build"
while [ $# -gt 0 ]; do
  case "$1" in
    build|prd)
      MODE="$1"
      shift
      ;;
    --prompt)
      PRD_REQUEST_PATH="$2"
      shift 2
      ;;
    --no-commit)
      NO_COMMIT=true
      shift
      ;;
    *)
      if [ "$MODE" = "prd" ]; then
        PRD_INLINE="${PRD_INLINE:+$PRD_INLINE }$1"
        shift
      elif [[ "$1" =~ ^[0-9]+$ ]]; then
        MAX_ITERATIONS="$1"
        shift
      else
        echo "Unknown arg: $1"
        exit 1
      fi
      ;;
  esac
done

PROMPT_FILE="$PROMPT_BUILD"

if [ "$MODE" = "prd" ]; then
  PRD_USE_INLINE=1
  if [ -z "${PRD_AGENT_CMD:-}" ]; then
    PRD_AGENT_CMD="$AGENT_CMD"
    PRD_USE_INLINE=0
  fi
  if [ "${RALPH_DRY_RUN:-}" != "1" ]; then
    require_agent "${PRD_AGENT_CMD:-$AGENT_CMD}"
  fi

  if [[ "$PRD_PATH" == *.json ]]; then
    mkdir -p "$(dirname "$PRD_PATH")" "$TMP_DIR"
  else
    mkdir -p "$PRD_PATH" "$TMP_DIR"
  fi

  if [ -z "$PRD_REQUEST_PATH" ] && [ -n "$PRD_INLINE" ]; then
    PRD_REQUEST_PATH="$TMP_DIR/prd-request-$(date +%Y%m%d-%H%M%S)-$$.txt"
    printf '%s\n' "$PRD_INLINE" > "$PRD_REQUEST_PATH"
  fi

  if [ -z "$PRD_REQUEST_PATH" ] || [ ! -f "$PRD_REQUEST_PATH" ]; then
    echo "PRD request missing. Provide a prompt string or --prompt <file>."
    exit 1
  fi

  REQUEST_CONTENT="$(cat "$PRD_REQUEST_PATH")"
  AGENT_NAME="${DEFAULT_AGENT_NAME}"
  if [ -n "${PRD_AGENT_NAME:-}" ]; then
    AGENT_NAME="$PRD_AGENT_NAME"
  fi
  if [ -z "$REQUEST_CONTENT" ]; then
    echo "PRD request is empty: $PRD_REQUEST_PATH"
    exit 1
  fi

  if [[ "$PRD_PATH" == *.json ]]; then
    OUT_PATH="$PRD_PATH"
  else
    SLUG=$(printf "%s" "$REQUEST_CONTENT" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9][^a-z0-9]*/-/g; s/^-//; s/-$//' | cut -c1-24)
    SHORT="${SLUG:-task}"
    OUT_PATH="$PRD_PATH/prd-${SHORT}.json"
    n=1
    while [ -e "$OUT_PATH" ]; do
      n=$((n + 1))
      OUT_PATH="$PRD_PATH/prd-${SHORT}-${n}.json"
    done
  fi

  PROMPT_TMP="$TMP_DIR/prd-prompt-$(date +%Y%m%d-%H%M%S)-$$.md"
  cat > "$PROMPT_TMP" <<EOF
Create a JSON PRD for the following software project request.

Requirements:
- Output valid JSON only.
- Include a top-level "title" and "stories" array.
- Each story must have:
  - "id": short sequential ID like "S1"
  - "title": concise title
  - "status": "open"
  - "details": array of concrete implementation tasks
  - "verification": array of exact commands or checks
- Keep stories small and shippable in sequence.
- Prefer 3-10 stories depending on scope.
- Include global quality gates at top-level as "qualityGates" array if helpful.

Project request:
$REQUEST_CONTENT
EOF

  if [ "${RALPH_DRY_RUN:-}" = "1" ]; then
    cat > "$OUT_PATH" <<EOF
{
  "title": "Dry Run PRD",
  "qualityGates": [
    "dry-run"
  ],
  "stories": [
    {
      "id": "S1",
      "title": "Example story",
      "status": "open",
      "details": [
        "Replace this with a real PRD by running without RALPH_DRY_RUN"
      ],
      "verification": [
        "echo dry-run"
      ]
    }
  ]
}
EOF
  else
    if [ "$PRD_USE_INLINE" = "1" ]; then
      RAW_OUTPUT="$(run_agent_inline "$PROMPT_TMP")"
    else
      RAW_OUTPUT="$(run_agent "$PROMPT_TMP")"
    fi
    printf '%s\n' "$RAW_OUTPUT" > "$OUT_PATH"
  fi

  echo "Wrote PRD: $OUT_PATH"
  exit 0
fi

if [ "${RALPH_DRY_RUN:-}" != "1" ]; then
  require_agent "$AGENT_CMD"
fi

mkdir -p "$TMP_DIR" "$RUNS_DIR" "$(dirname "$PROGRESS_PATH")" "$(dirname "$GUARDRAILS_PATH")" "$(dirname "$ERRORS_LOG_PATH")" "$(dirname "$ACTIVITY_LOG_PATH")"
[ -f "$PROGRESS_PATH" ] || touch "$PROGRESS_PATH"
[ -f "$GUARDRAILS_PATH" ] || touch "$GUARDRAILS_PATH"
[ -f "$ERRORS_LOG_PATH" ] || touch "$ERRORS_LOG_PATH"
[ -f "$ACTIVITY_LOG_PATH" ] || touch "$ACTIVITY_LOG_PATH"

if [ ! -f "$PRD_PATH" ]; then
  echo "Missing PRD file: $PRD_PATH"
  exit 1
fi

select_story() {
  node - "$PRD_PATH" "$STALE_SECONDS" <<'EOF'
const fs = require('fs');
const prdPath = process.argv[2];
const staleSeconds = Number(process.argv[3] || '0');
const now = Date.now();

const prd = JSON.parse(fs.readFileSync(prdPath, 'utf8'));
const stories = Array.isArray(prd.stories) ? prd.stories : [];

for (const story of stories) {
  if (!story || typeof story !== 'object') continue;
  if (story.status === 'in_progress' && staleSeconds > 0 && story.startedAt) {
    const started = new Date(story.startedAt).getTime();
    if (!Number.isNaN(started) && now - started > staleSeconds * 1000) {
      story.status = 'open';
      delete story.startedAt;
    }
  }
}

const story = stories.find((s) => s && s.status === 'open');
if (!story) {
  fs.writeFileSync(prdPath, JSON.stringify(prd, null, 2) + '\n');
  process.exit(2);
}

story.status = 'in_progress';
story.startedAt = new Date().toISOString();
fs.writeFileSync(prdPath, JSON.stringify(prd, null, 2) + '\n');
process.stdout.write(JSON.stringify({ story, qualityGates: prd.qualityGates || [] }));
EOF
}

complete_story() {
  local story_id="$1"
  node - "$PRD_PATH" "$story_id" <<'EOF'
const fs = require('fs');
const prdPath = process.argv[2];
const storyId = process.argv[3];
const prd = JSON.parse(fs.readFileSync(prdPath, 'utf8'));
const stories = Array.isArray(prd.stories) ? prd.stories : [];
const story = stories.find((s) => s && s.id === storyId);
if (!story) process.exit(1);
story.status = 'done';
story.completedAt = new Date().toISOString();
delete story.startedAt;
fs.writeFileSync(prdPath, JSON.stringify(prd, null, 2) + '\n');
EOF
}

reopen_story() {
  local story_id="$1"
  node - "$PRD_PATH" "$story_id" <<'EOF'
const fs = require('fs');
const prdPath = process.argv[2];
const storyId = process.argv[3];
const prd = JSON.parse(fs.readFileSync(prdPath, 'utf8'));
const stories = Array.isArray(prd.stories) ? prd.stories : [];
const story = stories.find((s) => s && s.id === storyId);
if (!story) process.exit(1);
story.status = 'open';
delete story.startedAt;
fs.writeFileSync(prdPath, JSON.stringify(prd, null, 2) + '\n');
EOF
}

for ((i = 1; i <= MAX_ITERATIONS; i++)); do
  selection="$(select_story)" || rc=$?
  rc=${rc:-0}
  if [ "$rc" -eq 2 ]; then
    echo "No open stories remaining."
    exit 0
  elif [ "$rc" -ne 0 ]; then
    echo "Failed to select story."
    exit "$rc"
  fi

  STORY_ID="$(printf '%s' "$selection" | node -e 'let data=""; process.stdin.on("data", d => data += d); process.stdin.on("end", () => { const obj = JSON.parse(data); process.stdout.write(obj.story.id); });')"
  STORY_TITLE="$(printf '%s' "$selection" | node -e 'let data=""; process.stdin.on("data", d => data += d); process.stdin.on("end", () => { const obj = JSON.parse(data); process.stdout.write(obj.story.title || ""); });')"
  STORY_BLOCK="$(printf '%s' "$selection" | node -e 'let data=""; process.stdin.on("data", d => data += d); process.stdin.on("end", () => { const obj = JSON.parse(data); process.stdout.write(JSON.stringify(obj.story, null, 2)); });')"
  QUALITY_GATES="$(printf '%s' "$selection" | node -e 'let data=""; process.stdin.on("data", d => data += d); process.stdin.on("end", () => { const obj = JSON.parse(data); const gates = Array.isArray(obj.qualityGates) ? obj.qualityGates : []; process.stdout.write(gates.map((g) => "- " + g).join("\n")); });')"

  RUN_ID="$(date +%Y%m%d-%H%M%S)-$$-$i"
  RUN_DIR="$RUNS_DIR/$RUN_ID"
  mkdir -p "$RUN_DIR"
  RUN_LOG_PATH="$RUN_DIR/run.log"
  RUN_META_PATH="$RUN_DIR/summary.md"
  PROMPT_TMP="$TMP_DIR/build-prompt-$RUN_ID.md"

  sed \
    -e "s|{{PRD_PATH}}|$PRD_PATH|g" \
    -e "s|{{AGENTS_PATH}}|$AGENTS_PATH|g" \
    -e "s|{{PROGRESS_PATH}}|$PROGRESS_PATH|g" \
    -e "s|{{GUARDRAILS_PATH}}|$GUARDRAILS_PATH|g" \
    -e "s|{{GUARDRAILS_REF}}|$GUARDRAILS_REF|g" \
    -e "s|{{CONTEXT_REF}}|$CONTEXT_REF|g" \
    -e "s|{{ERRORS_LOG_PATH}}|$ERRORS_LOG_PATH|g" \
    -e "s|{{ACTIVITY_LOG_PATH}}|$ACTIVITY_LOG_PATH|g" \
    -e "s|{{ACTIVITY_CMD}}|$ACTIVITY_CMD|g" \
    -e "s|{{NO_COMMIT}}|$NO_COMMIT|g" \
    -e "s|{{REPO_ROOT}}|$ROOT_DIR|g" \
    -e "s|{{RUN_ID}}|$RUN_ID|g" \
    -e "s|{{ITERATION}}|$i|g" \
    -e "s|{{RUN_LOG_PATH}}|$RUN_LOG_PATH|g" \
    -e "s|{{RUN_META_PATH}}|$RUN_META_PATH|g" \
    -e "s|{{STORY_ID}}|$STORY_ID|g" \
    -e "s|{{STORY_TITLE}}|$STORY_TITLE|g" \
    -e "s|{{QUALITY_GATES}}|$QUALITY_GATES|g" \
    -e "/{{STORY_BLOCK}}/{
r /dev/stdin
d
}" \
    "$PROMPT_BUILD" > "$PROMPT_TMP" <<<"$STORY_BLOCK"

  if run_agent "$PROMPT_TMP" | tee "$RUN_LOG_PATH"; then
    :
  else
    reopen_story "$STORY_ID"
    echo "Iteration failed for $STORY_ID"
    exit 1
  fi

  if grep -q '<promise>COMPLETE</promise>' "$RUN_LOG_PATH"; then
    complete_story "$STORY_ID"
    printf '# %s\n\nStory: %s %s\n\nStatus: complete\n' "$RUN_ID" "$STORY_ID" "$STORY_TITLE" > "$RUN_META_PATH"
  else
    reopen_story "$STORY_ID"
    printf '# %s\n\nStory: %s %s\n\nStatus: incomplete\n' "$RUN_ID" "$STORY_ID" "$STORY_TITLE" > "$RUN_META_PATH"
    echo "Story not completed in iteration $i."
    exit 1
  fi
done

echo "Reached MAX_ITERATIONS=$MAX_ITERATIONS."
