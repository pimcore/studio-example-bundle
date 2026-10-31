#!/usr/bin/env bash
# Builds every demo frontend of the talk once, on the build machine, so the laptop installs prebuilt files only:
#   studio                  the enterprise Studio build (enterprise/assets/studio) -> build-<id>.zip
#   portal-plugin           the Portal Engine plugin (enterprise/assets/portal)     -> portal-plugin.zip
#   portal-engine-frontend  portal_engine's portal frontend (assets/portal)          -> portal-engine-frontend.zip
# and enterprise/dist/manifest.json: per zip its part, source repo, commit SHA, size and gzip size.
#
# Sources are taken from commits, never from a working tree: this repo's HEAD (git archive) and the portal_engine
# clone's PORTAL_ENGINE_REF, both read only and unpacked into a staging folder outside the repos, so the SHAs in the
# manifest are exactly what was built. Each build step runs through the tooling queue (bin/heavy.sh), one at a time.
# Exits non-zero naming the part that failed, and when the plugin's entry chunk is over 150 KB gzip.
#
# Usage: enterprise/bin/build-all.sh
# Environment (all optional):
#   PORTAL_ENGINE_REPO  portal_engine clone      (default $ORCH_WORK/portal-talk/repos/portal_engine)
#   PORTAL_ENGINE_REF   its commit or branch     (default integration)
#   PORTAL_UI_KIT       the PortalUiKit bundle with a built frontend/portal-ui-kit/dist
#                                                (default $ORCH_WORK/portal-talk/repos/enterprise_monorepo/bundles/PortalUiKit)
#   BUILD_ALL_OUT       where zips and manifest go (default enterprise/dist)
#   BUILD_ALL_WORK      staging folder; node_modules are kept there between runs
#                                                (default ${XDG_CACHE_HOME:-~/.cache}/portal-talk-build-all)
#   HEAVY               the queue runner          (default $ORCH_ROOT/bin/heavy.sh)
#   BUILD_ALL_STUDIO_CMD, BUILD_ALL_PLUGIN_CMD, BUILD_ALL_ENGINE_CMD
#                       replace a part's build command line (run in the part's staged folder)
set -euo pipefail

ENTRY_LIMIT_BYTES=$((150 * 1024))   # the plugin's entry chunk, gzip

ENTERPRISE=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
REPO=$(git -C "$ENTERPRISE" rev-parse --show-toplevel)
WORK_ROOT=${ORCH_WORK:-$HOME/.local/share/agentic-orchestration}
PORTAL_ENGINE_REPO=${PORTAL_ENGINE_REPO:-$WORK_ROOT/portal-talk/repos/portal_engine}
PORTAL_ENGINE_REF=${PORTAL_ENGINE_REF:-integration}
PORTAL_UI_KIT=${PORTAL_UI_KIT:-$WORK_ROOT/portal-talk/repos/enterprise_monorepo/bundles/PortalUiKit}
OUT=${BUILD_ALL_OUT:-$ENTERPRISE/dist}
WORK=${BUILD_ALL_WORK:-${XDG_CACHE_HOME:-$HOME/.cache}/portal-talk-build-all}
HEAVY=${HEAVY:-${ORCH_ROOT:+$ORCH_ROOT/bin/heavy.sh}}

NPM_FLAGS='--no-audit --no-fund'
STUDIO_CMD=${BUILD_ALL_STUDIO_CMD:-"(cd ../shared/coaster/viewer && npm ci $NPM_FLAGS) && npm install $NPM_FLAGS && npm run build && npm run package-build"}
# --install-links copies the kit into node_modules (instead of a symlink to the monorepo), so npm installs its peers
# (antd, dayjs, ...) next to it and the bundler resolves the kit's imports from the plugin's own node_modules
PLUGIN_CMD=${BUILD_ALL_PLUGIN_CMD:-"npm install --install-links $NPM_FLAGS && npm run build"}
ENGINE_CMD=${BUILD_ALL_ENGINE_CMD:-"npm ci $NPM_FLAGS && npm run build"}

say() { printf 'build-all: %s\n' "$*" >&2; }
# fail <part> <reason>: the one way out on an error, naming the part
fail() { say "FAILED: $1: $2"; exit 1; }

[ -n "$HEAVY" ] && [ -x "$HEAVY" ] || fail setup "no queue runner: set ORCH_ROOT (bin/heavy.sh) or HEAVY"
command -v python3 >/dev/null || fail setup "python3 is needed to write the zips"
command -v node >/dev/null || fail setup "node is needed to write the manifest"
git -C "$PORTAL_ENGINE_REPO" rev-parse --git-dir >/dev/null 2>&1 \
  || fail portal-engine-frontend "no portal_engine clone at $PORTAL_ENGINE_REPO (set PORTAL_ENGINE_REPO)"
[ -d "$PORTAL_UI_KIT/frontend/portal-ui-kit/dist" ] \
  || fail portal-ui-kit "no built kit at $PORTAL_UI_KIT/frontend/portal-ui-kit/dist (set PORTAL_UI_KIT)"

SB_SHA=$(git -C "$REPO" rev-parse HEAD)
PE_SHA=$(git -C "$PORTAL_ENGINE_REPO" rev-parse --verify "$PORTAL_ENGINE_REF^{commit}" 2>/dev/null) \
  || fail portal-engine-frontend "$PORTAL_ENGINE_REF is no commit in $PORTAL_ENGINE_REPO"
KIT_SHA=$(git -C "$PORTAL_UI_KIT" rev-parse HEAD 2>/dev/null || true)
if [ -n "$(git -C "$REPO" status --porcelain -- enterprise)" ]; then
  say "note: uncommitted changes under enterprise/ are not built (sources come from HEAD $SB_SHA)"
fi

# --- stage the sources: fresh from the commits, node_modules kept from the last run ---
NODE_DIRS=(sb/enterprise/assets/studio/node_modules sb/enterprise/assets/portal/node_modules
           sb/enterprise/assets/shared/coaster/viewer/node_modules pe/assets/portal/node_modules)
mkdir -p "$WORK"
KEEP="$WORK/.keep.$$"
rm -rf "$WORK"/.keep.*
mkdir -p "$KEEP"
for d in "${NODE_DIRS[@]}"; do
  if [ -d "$WORK/$d" ]; then mkdir -p "$KEEP/$(dirname "$d")"; mv "$WORK/$d" "$KEEP/$d"; fi
done
rm -rf "$WORK/sb" "$WORK/pe"
mkdir -p "$WORK/sb" "$WORK/pe/vendor/pimcore"
git -C "$REPO" archive --format=tar HEAD enterprise | tar -x -C "$WORK/sb"
git -C "$PORTAL_ENGINE_REPO" archive --format=tar "$PE_SHA" assets/portal | tar -x -C "$WORK/pe"
for d in "${NODE_DIRS[@]}"; do
  if [ -d "$KEEP/$d" ]; then mkdir -p "$WORK/$(dirname "$d")"; mv "$KEEP/$d" "$WORK/$d"; fi
done
rm -rf "$KEEP"
# where each package.json's file: dependency on the kit points
ln -s "$PORTAL_UI_KIT" "$WORK/sb/portal-ui-kit"                      # enterprise/assets/portal: ../../../portal-ui-kit
ln -s "$PORTAL_UI_KIT" "$WORK/pe/vendor/pimcore/portal-ui-kit"       # assets/portal: ../../vendor/pimcore/portal-ui-kit

# --- build, one part after the other, each through the queue ---
# step <part> <dir> <command line>
step() {
  local part=$1 dir=$2 cmd=$3 rc=0
  say "building $part (in $dir)"
  (cd "$dir" && "$HEAVY" -c "$cmd") || rc=$?
  [ "$rc" -eq 0 ] || fail "$part" "build exited $rc"
}

STAGE_STUDIO=$WORK/sb/enterprise
rm -rf "$STAGE_STUDIO"/build-dist/build-*.zip "$STAGE_STUDIO/public/portal" "$WORK/pe/assets/portal/dist"
step studio "$STAGE_STUDIO/assets/studio" "$STUDIO_CMD"
step portal-plugin "$STAGE_STUDIO/assets/portal" "$PLUGIN_CMD"
step portal-engine-frontend "$WORK/pe/assets/portal" "$ENGINE_CMD"

# --- the zips ---
rm -rf "$OUT"
mkdir -p "$OUT"

# zip_dir <part> <source dir> <zip path>: the folder's contents at the zip's root
zip_dir() {
  local part=$1 src=$2 zip=$3
  [ -d "$src" ] && [ -n "$(find "$src" -type f -size +0c -print -quit)" ] || fail "$part" "the build wrote nothing to $src"
  (cd "$src" && python3 -I - "$zip" <<'PY'
import os, sys, zipfile
with zipfile.ZipFile(sys.argv[1], 'w', zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk('.'):
        dirs.sort()
        for f in sorted(files):
            p = os.path.join(root, f)
            z.write(p, os.path.relpath(p, '.'))
PY
  ) || fail "$part" "could not write $zip"
}

shopt -s nullglob
studio_zips=("$STAGE_STUDIO"/build-dist/build-*.zip)
shopt -u nullglob
[ "${#studio_zips[@]}" -eq 1 ] || fail studio "expected one build-dist/build-<id>.zip, found ${#studio_zips[@]}"
STUDIO_ZIP=$(basename "${studio_zips[0]}")
cp "${studio_zips[0]}" "$OUT/$STUDIO_ZIP"
zip_dir portal-plugin "$STAGE_STUDIO/public/portal" "$OUT/portal-plugin.zip"
zip_dir portal-engine-frontend "$WORK/pe/assets/portal/dist" "$OUT/portal-engine-frontend.zip"

# --- the manifest, and the checks on it ---
PARTS=$(printf '%s\n' \
  "studio	$STUDIO_ZIP	studio_example_bundle	$SB_SHA" \
  "portal-plugin	portal-plugin.zip	studio_example_bundle	$SB_SHA" \
  "portal-engine-frontend	portal-engine-frontend.zip	portal_engine	$PE_SHA")
rc=0
node --input-type=module - "$OUT" "$STAGE_STUDIO/public/portal" "$ENTRY_LIMIT_BYTES" "$SB_SHA" "$PE_SHA" "$KIT_SHA" \
  "$PORTAL_ENGINE_REF" "$PARTS" <<'JS' || rc=$?
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const [out, pluginDir, limitArg, sbSha, peSha, kitSha, peRef, partsArg] = process.argv.slice(2)
const limit = Number(limitArg)
const gz = (buf) => gzipSync(buf, { level: 9 }).length
const fail = (part, why) => { console.error(`build-all: FAILED: ${part}: ${why}`); process.exit(1) }

// every file of a zip, gzip'ed one by one: what a browser fetches
const zipGzip = (zip) => {
  const names = execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8' }).split('\n').filter((n) => n && !n.endsWith('/'))
  let total = 0
  for (const n of names) total += gz(execFileSync('unzip', ['-p', zip, n], { maxBuffer: 1 << 30 }))
  return { files: names.length, total }
}

// the plugin's entry chunk: remoteEntry.js and the sync chunks of the module it exposes ('.'), as the
// Module Federation manifest lists them; the portal loads all of them before the plugin starts
const entryChunk = () => {
  const remote = join(pluginDir, 'static/js/remoteEntry.js')
  if (!existsSync(remote)) fail('portal-plugin', 'no static/js/remoteEntry.js in the build')
  const files = ['static/js/remoteEntry.js']
  const mfPath = join(pluginDir, 'mf-manifest.json')
  if (existsSync(mfPath)) {
    const mf = JSON.parse(readFileSync(mfPath, 'utf8'))
    const exposed = (mf.exposes ?? []).find((e) => e.path === '.' || e.name === '.') ?? (mf.exposes ?? [])[0]
    for (const f of exposed?.assets?.js?.sync ?? []) if (!files.includes(f)) files.push(f)
  }
  let total = 0
  for (const f of files) {
    const p = join(pluginDir, f)
    if (existsSync(p)) total += gz(readFileSync(p))
  }
  return { files, gzipBytes: total }
}

const zips = []
for (const line of partsArg.split('\n').filter(Boolean)) {
  const [part, zip, repo, sha] = line.split('\t')
  const path = join(out, zip)
  const bytes = existsSync(path) ? statSync(path).size : 0
  if (bytes === 0) fail(part, `${zip} is empty`)
  const { files, total } = zipGzip(path)
  if (files === 0 || total === 0) fail(part, `${zip} has no files`)
  const entry = { part, zip, repo, sha, bytes, files, gzipBytes: total }
  if (part === 'portal-plugin') {
    const chunk = entryChunk()
    entry.entryChunk = chunk
    entry.entryChunkLimitGzipBytes = limit
  }
  zips.push(entry)
}

const manifest = {
  builtAt: new Date().toISOString(),
  repos: {
    studio_example_bundle: sbSha,
    portal_engine: peSha,
    portal_engine_ref: peRef,
    ...(kitSha ? { enterprise_monorepo: kitSha } : {})
  },
  install: {
    studio: 'copy the build-<id>.zip into the enterprise bundle\'s build-dist/, then bin/console cache:warmup',
    'portal-plugin': 'unzip into the enterprise bundle\'s public/portal/, then bin/console assets:install',
    'portal-engine-frontend': 'empty the portal engine bundle\'s src/Resources/public/portal-frontend/, unzip into it, then bin/console assets:install'
  },
  zips
}
for (const z of zips) console.error(`build-all: ${z.part}: ${z.zip} (${z.bytes} bytes, ${z.gzipBytes} gzip)`)

// no manifest for a build that fails a check: the laptop installs only what passed
const plugin = zips.find((z) => z.part === 'portal-plugin')
if (plugin.entryChunk.gzipBytes > limit) {
  fail('portal-plugin', `entry chunk is ${plugin.entryChunk.gzipBytes} bytes gzip, over the ${limit} limit (${plugin.entryChunk.files.join(', ')})`)
}
writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
JS
[ "$rc" -eq 0 ] || exit 1
say "done: $OUT/manifest.json"
