// F65 (DR-F65-13): the enterprise bundle's portal routes name their controller as Class::__invoke. Portal Engine's
// SecuritySubscriber::onKernelController reads getController()[0]; a route naming only the invokable class resolves to
// the object itself, so every request to it answered 500 ("Cannot use object of type ... as array") and the coaster
// tile and preview stage never got their file.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const routing = readFileSync(join(enterpriseDir, 'config/pimcore/routing.yaml'), 'utf8');

function routes () {
  return [...routing.matchAll(/^([a-z0-9_]+):\n((?: {4}.*\n?|\s*#.*\n?)+)/gm)].map(([, name, body]) => ({
    name,
    controller: body.match(/^ {4}controller: (.+)$/m)?.[1].trim()
  }));
}

test('AC1: every portal route names its controller as Class::method, so Portal Engine\'s SecuritySubscriber can read it', () => {
  const declared = routes();
  assert.ok(declared.length >= 2, 'the coaster file and the agent routes are declared');
  for (const { name, controller } of declared) {
    assert.ok(controller, `${name} names a controller`);
    assert.match(controller, /^Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\[\w\\]+::\w+$/, `${name}: ${controller} is Class::method`);
  }
});

test('AC1: the coaster file route calls CoasterFileController::__invoke', () => {
  const route = routes().find((r) => r.name === 'pimcore_studio_example_enterprise_coaster_file');
  assert.equal(route?.controller, 'Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Portal\\Coaster\\CoasterFileController::__invoke');
});
