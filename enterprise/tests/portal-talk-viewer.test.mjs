// F106: the Talk page says the slide viewer is not installed instead of framing a 404 (which Portal Engine turns into
// a 500 inside the frame). Needs the php CLI (8.1+); Pimcore's FrontendController, Symfony's Response and the PSR
// logger are stubbed below, so no Pimcore install is needed. Run: node --test enterprise/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const talkSrc = join(enterpriseDir, 'src/Portal/Talk');
const read = (path) => readFileSync(path, 'utf8');

const DEFAULT_URL_PARAM = 'pimcore_studio_example_enterprise.talk.default_viewer_url';
const defaultViewerUrl = () => {
  const match = read(join(enterpriseDir, 'config/portal-talk.yaml')).match(new RegExp(`${DEFAULT_URL_PARAM.replace(/\./g, '\\.')}:\\s*'([^']+)'`));
  assert.ok(match, 'portal-talk.yaml sets the default viewer URL');
  return match[1];
};

const bootstrap = `
namespace Psr\\Log {
    interface LoggerInterface { public function warning(string|\\Stringable $message, array $context = []): void; }
}
namespace Symfony\\Component\\HttpFoundation {
    class Response { public function __construct(public string $content = '', public int $status = 200) {} }
}
namespace Pimcore\\Controller {
    class FrontendController {
        public function render(string $view, array $parameters = [], ?\\Symfony\\Component\\HttpFoundation\\Response $response = null): \\Symfony\\Component\\HttpFoundation\\Response {
            return new \\Symfony\\Component\\HttpFoundation\\Response(json_encode(['view' => $view, 'parameters' => $parameters]));
        }
    }
}
namespace {
    require ${JSON.stringify(join(talkSrc, 'TalkPage.php'))};
    require ${JSON.stringify(join(talkSrc, 'TalkViewer.php'))};
    require ${JSON.stringify(join(talkSrc, 'TalkController.php'))};
    class TestLogger implements \\Psr\\Log\\LoggerInterface {
        public array $warnings = [];
        public function warning(string|\\Stringable $message, array $context = []): void { $this->warnings[] = (string) $message; }
    }
}
`;

const php = (body) => {
  const script = `${bootstrap}\nnamespace {\n${body}\n}\n`;
  return JSON.parse(execFileSync('php', ['-d', 'display_errors=stderr', '-r', script], { encoding: 'utf8' }));
};

// The controller with this viewer URL, the configured default and a public dir: { status, view, parameters, warnings }.
const renderPage = (viewerUrl, publicDir) =>
  php(`
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Portal\\Talk\\{TalkController, TalkViewer};
    $logger = new TestLogger();
    $viewer = new TalkViewer(${JSON.stringify(viewerUrl)}, ${JSON.stringify(defaultViewerUrl())}, ${JSON.stringify(publicDir)});
    $response = (new TalkController($viewer, $logger))();
    echo json_encode(json_decode($response->content, true) + ['status' => $response->status, 'warnings' => $logger->warnings]);
  `);

// A public dir of the bundle, with or without the viewer file at the path the default URL maps to.
const publicDir = (withViewer) => {
  const dir = mkdtempSync(join(tmpdir(), 'f106-public-'));
  if (withViewer) {
    const relative = defaultViewerUrl().replace('/bundles/pimcorestudioexampleenterprise/', '');
    mkdirSync(dirname(join(dir, relative)), { recursive: true });
    writeFileSync(join(dir, relative), '<!doctype html><title>viewer</title>');
  }
  return dir;
};

// The two branches of the template's studioContent block.
const contentBranches = () => {
  const twig = read(join(enterpriseDir, 'templates/portal/talk.html.twig'));
  const block = twig.match(/\{%\s*block studioContent\s*%\}([\s\S]*?)\{%\s*endblock\s*%\}/);
  assert.ok(block, 'the template has a studioContent block');
  const branches = block[1].match(/\{%\s*if viewerMissing\s*%\}([\s\S]*?)\{%\s*else\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/);
  assert.ok(branches, 'studioContent branches on viewerMissing');
  return { missing: branches[1], frame: branches[2], twig };
};

test('AC1: the default viewer URL without its file renders the notice, status 200, and logs a warning', () => {
  const dir = publicDir(false);
  try {
    const page = renderPage(defaultViewerUrl(), dir);
    assert.equal(page.status, 200);
    assert.equal(page.view, '@PimcoreStudioExampleEnterprise/portal/talk.html.twig');
    assert.equal(page.parameters.viewerMissing, true);
    assert.equal(page.parameters.pageTitleOverride, 'Talk');
    assert.equal(page.warnings.length, 1, 'one warning is logged');
    assert.match(page.warnings[0], /slide viewer is not installed/i);
    assert.match(page.parameters.installStep, /assets:install/);
    assert.ok(!page.parameters.installStep.includes('\n'), 'the install step is one line');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('AC1: the notice is an h1 inside main with the install step and a link home, and no iframe', () => {
  const { missing, frame, twig } = contentBranches();
  // studioContent sits inside the layout's <main class="pe-main">; the notice is its own element there
  assert.match(missing, /<h1[^>]*>\s*The slide viewer is not installed\s*<\/h1>/);
  assert.match(missing, /\{\{\s*installStep\s*\}\}/, 'shows the install step');
  assert.match(missing, /<a [^>]*href="\{\{[^}]*portalDocument[^}]*\}\}"/, 'links back to the portal home');
  assert.doesNotMatch(missing, /<iframe/i, 'no frame when the viewer is missing');
  assert.doesNotMatch(missing, /pe-talk-frame/, 'not styled by the frame rule');
  assert.match(frame, /<iframe[^>]*class="pe-talk-frame"/);
  // the notice is styled with the kit's tokens, not own colours
  const notice = twig.match(/\.pe-talk-missing[^{]*\{[^}]*\}/g) ?? [];
  assert.ok(notice.length > 0, 'the notice has its own rule');
  for (const rule of notice) assert.doesNotMatch(rule, /#[0-9a-f]{3,6}\b|rgb/i, `uses --p-* tokens: ${rule}`);
});

test('AC2: the viewer file present, or another URL configured, renders the frame without a warning', () => {
  const withFile = publicDir(true);
  const empty = publicDir(false);
  try {
    for (const [url, dir] of [[defaultViewerUrl(), withFile], ['https://slides.example/talk.html', empty], ['/talk/talk.html', empty]]) {
      const page = renderPage(url, dir);
      assert.equal(page.status, 200);
      assert.equal(page.parameters.viewerMissing, false, `${url} frames the viewer`);
      assert.equal(page.parameters.viewerUrl, url);
      assert.deepEqual(page.warnings, []);
    }
  } finally {
    rmSync(withFile, { recursive: true, force: true });
    rmSync(empty, { recursive: true, force: true });
  }
});

test('AC3: the default viewer URL in portal-talk.yaml maps to the file the check looks for', () => {
  const result = php(`
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Portal\\Talk\\TalkViewer;
    $url = ${JSON.stringify(defaultViewerUrl())};
    $viewer = new TalkViewer($url, $url);
    echo json_encode(['file' => $viewer->defaultViewerFile()]);
  `);
  // the bundle's public dir is what assets:install publishes as /bundles/pimcorestudioexampleenterprise/
  assert.equal(result.file, join(enterpriseDir, 'public/talk/talk.html'));
});

test("AC3: the README's How to run names the install step", () => {
  const readme = read(join(enterpriseDir, 'assets/portal/talk/README.md'));
  const howTo = readme.match(/## How to run\n([\s\S]*?)\n## /);
  assert.ok(howTo, 'the README has a How to run section');
  const step = php(`echo json_encode(\\Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Portal\\Talk\\TalkViewer::INSTALL_STEP);`);
  assert.ok(howTo[1].replace(/`/g, '').replace(/\s+/g, ' ').includes(step), `How to run names the install step: ${step}`);
  assert.match(howTo[1], /The slide viewer is not installed/, 'and says what the page shows without it');
});
