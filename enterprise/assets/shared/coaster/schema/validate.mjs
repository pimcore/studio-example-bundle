// Validates a .coaster document against coaster.schema.json, without dependencies, in the browser and in Node.
// It reads the JSON Schema keywords that schema uses; any other keyword throws, so the schema can't silently
// rely on one this file ignores. Any full JSON Schema 2020-12 validator (e.g. Ajv) accepts the same files.
import schema from './coaster.schema.json' with { type: 'json' };

const ANNOTATIONS = new Set(['$schema', '$id', 'title', 'description']);
const KEYWORDS = new Set([
  '$ref', 'type', 'const', 'enum', 'pattern', 'minLength', 'minimum', 'maximum', 'exclusiveMinimum',
  'required', 'properties', 'additionalProperties', 'items', 'minItems', 'allOf', 'if', 'then', '$defs',
]);

const typeOf = (value) => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number' && Number.isInteger(value)) return 'integer';
  return typeof value;
};
const matchesType = (value, type) => typeOf(value) === type || (type === 'number' && typeOf(value) === 'integer');
const pointer = (path, key) => `${path}/${String(key).replaceAll('~', '~0').replaceAll('/', '~1')}`;
const show = (value) => JSON.stringify(value);

const resolve = (root, ref) => {
  if (!ref.startsWith('#/')) throw new Error(`Only local $ref is supported: ${ref}`);
  return ref.slice(2).split('/').reduce((node, key) => node[key], root);
};

// Collects { path, message } for every problem; path is a JSON Pointer into the document ('' = the whole document).
function check(root, node, value, path, errors) {
  for (const key of Object.keys(node)) {
    if (!KEYWORDS.has(key) && !ANNOTATIONS.has(key)) throw new Error(`Unsupported JSON Schema keyword: ${key}`);
  }
  if (node.$ref) check(root, resolve(root, node.$ref), value, path, errors);

  if (node.type && !matchesType(value, node.type)) {
    errors.push({ path, message: `must be of type ${node.type}, is ${typeOf(value)}` });
    return;
  }
  if ('const' in node && value !== node.const) {
    errors.push({ path, message: `must be ${show(node.const)}, is ${show(value)}` });
  }
  if (node.enum && !node.enum.includes(value)) {
    errors.push({ path, message: `${show(value)} is not one of ${node.enum.map(show).join(', ')}` });
  }

  if (typeof value === 'string') {
    if (node.pattern && !new RegExp(node.pattern, 'u').test(value)) {
      errors.push({ path, message: `${show(value)} does not match ${node.pattern}` });
    }
    if (node.minLength !== undefined && value.length < node.minLength) {
      errors.push({ path, message: `must be at least ${node.minLength} characters long` });
    }
  }

  if (typeof value === 'number') {
    if (node.minimum !== undefined && value < node.minimum) {
      errors.push({ path, message: `must be at least ${node.minimum}, is ${value}` });
    }
    if (node.exclusiveMinimum !== undefined && value <= node.exclusiveMinimum) {
      errors.push({ path, message: `must be greater than ${node.exclusiveMinimum}, is ${value}` });
    }
    if (node.maximum !== undefined && value > node.maximum) {
      errors.push({ path, message: `must be at most ${node.maximum}, is ${value}` });
    }
  }

  if (typeOf(value) === 'object') {
    for (const key of node.required ?? []) {
      if (!(key in value)) errors.push({ path: pointer(path, key), message: 'required field is missing' });
    }
    for (const [key, child] of Object.entries(value)) {
      if (node.properties && key in node.properties) {
        check(root, node.properties[key], child, pointer(path, key), errors);
      } else if (node.additionalProperties === false) {
        errors.push({ path: pointer(path, key), message: `unknown field ${show(key)}` });
      }
    }
  }

  if (Array.isArray(value)) {
    if (node.minItems !== undefined && value.length < node.minItems) {
      errors.push({ path, message: `must have at least ${node.minItems} item(s), has ${value.length}` });
    }
    if (node.items) value.forEach((item, index) => check(root, node.items, item, pointer(path, index), errors));
  }

  for (const sub of node.allOf ?? []) check(root, sub, value, path, errors);

  if (node.if) {
    const ifErrors = [];
    check(root, node.if, value, path, ifErrors);
    if (ifErrors.length === 0 && node.then) check(root, node.then, value, path, errors);
  }
}

/** Validates any value against any schema in the subset above: { valid, errors: [{ path, message }] }. */
export function validate(rootSchema, value) {
  const errors = [];
  check(rootSchema, rootSchema, value, '', errors);
  return { valid: errors.length === 0, errors };
}

/** Validates a parsed .coaster document against coaster.schema.json. */
export function validateCoaster(document) {
  return validate(schema, document);
}

export { schema as coasterSchema };
