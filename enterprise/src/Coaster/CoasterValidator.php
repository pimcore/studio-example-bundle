<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Coaster;

/**
 * Validates a .coaster document against the shared coaster.schema.json, without dependencies: the PHP twin of
 * assets/shared/coaster/schema/validate.mjs, reading the same JSON Schema keywords and naming the same JSON Pointer
 * path for every problem. Any other keyword throws, so the schema can't silently rely on one this class ignores.
 */
class CoasterValidator
{
    public const SCHEMA_FILE = __DIR__ . '/../../assets/shared/coaster/schema/coaster.schema.json';

    private const ANNOTATIONS = ['$schema', '$id', 'title', 'description'];

    private const KEYWORDS = [
        '$ref', 'type', 'const', 'enum', 'pattern', 'minLength', 'minimum', 'maximum', 'exclusiveMinimum',
        'required', 'properties', 'additionalProperties', 'items', 'minItems', 'allOf', 'if', 'then', '$defs',
    ];

    private ?\stdClass $schema = null;

    /**
     * @param mixed $document the file decoded with json_decode() as objects (not associative arrays), so `{}` and `[]`
     *                        stay apart
     *
     * @return list<array{path: string, message: string}> every problem; empty for a valid document
     */
    public function validate(mixed $document): array
    {
        $this->schema ??= json_decode((string) file_get_contents(self::SCHEMA_FILE), false, 512, JSON_THROW_ON_ERROR);
        $errors = [];
        $this->check($this->schema, $document, '', $errors);

        return $errors;
    }

    /**
     * @param list<array{path: string, message: string}> $errors
     */
    private function check(\stdClass $node, mixed $value, string $path, array &$errors): void
    {
        foreach (array_keys(get_object_vars($node)) as $key) {
            if (!in_array($key, self::KEYWORDS, true) && !in_array($key, self::ANNOTATIONS, true)) {
                throw new \LogicException("Unsupported JSON Schema keyword: $key");
            }
        }
        if (isset($node->{'$ref'})) {
            $this->check($this->resolve($node->{'$ref'}), $value, $path, $errors);
        }

        if (isset($node->type) && !self::matchesType($value, $node->type)) {
            $errors[] = ['path' => $path, 'message' => sprintf('must be of type %s, is %s', $node->type, self::typeOf($value))];

            return;
        }
        if (property_exists($node, 'const') && !self::equals($value, $node->const)) {
            $errors[] = ['path' => $path, 'message' => sprintf('must be %s, is %s', self::show($node->const), self::show($value))];
        }
        if (isset($node->enum) && !array_filter($node->enum, static fn ($option) => self::equals($value, $option))) {
            $options = implode(', ', array_map(self::show(...), $node->enum));
            $errors[] = ['path' => $path, 'message' => sprintf('%s is not one of %s', self::show($value), $options)];
        }

        if (is_string($value)) {
            if (isset($node->pattern) && !preg_match('/' . str_replace('/', '\/', $node->pattern) . '/u', $value)) {
                $errors[] = ['path' => $path, 'message' => sprintf('%s does not match %s', self::show($value), $node->pattern)];
            }
            if (isset($node->minLength) && mb_strlen($value) < $node->minLength) {
                $errors[] = ['path' => $path, 'message' => sprintf('must be at least %d characters long', $node->minLength)];
            }
        }

        if (is_int($value) || is_float($value)) {
            if (isset($node->minimum) && $value < $node->minimum) {
                $errors[] = ['path' => $path, 'message' => sprintf('must be at least %s, is %s', $node->minimum, $value)];
            }
            if (isset($node->exclusiveMinimum) && $value <= $node->exclusiveMinimum) {
                $errors[] = ['path' => $path, 'message' => sprintf('must be greater than %s, is %s', $node->exclusiveMinimum, $value)];
            }
            if (isset($node->maximum) && $value > $node->maximum) {
                $errors[] = ['path' => $path, 'message' => sprintf('must be at most %s, is %s', $node->maximum, $value)];
            }
        }

        if ($value instanceof \stdClass) {
            foreach ($node->required ?? [] as $key) {
                if (!property_exists($value, $key)) {
                    $errors[] = ['path' => self::pointer($path, $key), 'message' => 'required field is missing'];
                }
            }
            foreach (get_object_vars($value) as $key => $child) {
                if (isset($node->properties) && property_exists($node->properties, (string) $key)) {
                    $this->check($node->properties->{$key}, $child, self::pointer($path, $key), $errors);
                } elseif (($node->additionalProperties ?? true) === false) {
                    $errors[] = ['path' => self::pointer($path, $key), 'message' => sprintf('unknown field %s', self::show((string) $key))];
                }
            }
        }

        if (is_array($value)) {
            if (isset($node->minItems) && count($value) < $node->minItems) {
                $errors[] = ['path' => $path, 'message' => sprintf('must have at least %d item(s), has %d', $node->minItems, count($value))];
            }
            if (isset($node->items)) {
                foreach ($value as $index => $item) {
                    $this->check($node->items, $item, self::pointer($path, $index), $errors);
                }
            }
        }

        foreach ($node->allOf ?? [] as $sub) {
            $this->check($sub, $value, $path, $errors);
        }

        if (isset($node->if)) {
            $ifErrors = [];
            $this->check($node->if, $value, $path, $ifErrors);
            if ($ifErrors === [] && isset($node->then)) {
                $this->check($node->then, $value, $path, $errors);
            }
        }
    }

    private function resolve(string $ref): \stdClass
    {
        if (!str_starts_with($ref, '#/')) {
            throw new \LogicException("Only local \$ref is supported: $ref");
        }
        $node = $this->schema;
        foreach (explode('/', substr($ref, 2)) as $key) {
            $node = $node->{$key};
        }

        return $node;
    }

    /** The JSON type of a decoded value; a whole float such as 45.0 counts as an integer, as in JavaScript. */
    private static function typeOf(mixed $value): string
    {
        return match (true) {
            $value === null => 'null',
            is_array($value) => 'array',
            $value instanceof \stdClass => 'object',
            is_int($value), is_float($value) && is_finite($value) && floor($value) === $value => 'integer',
            is_float($value) => 'number',
            is_bool($value) => 'boolean',
            default => 'string',
        };
    }

    private static function matchesType(mixed $value, string $type): bool
    {
        $actual = self::typeOf($value);

        return $actual === $type || ($type === 'number' && $actual === 'integer');
    }

    private static function equals(mixed $value, mixed $expected): bool
    {
        if ((is_int($value) || is_float($value)) && (is_int($expected) || is_float($expected))) {
            return $value == $expected;
        }

        return $value === $expected;
    }

    private static function pointer(string $path, int|string $key): string
    {
        return $path . '/' . str_replace(['~', '/'], ['~0', '~1'], (string) $key);
    }

    private static function show(mixed $value): string
    {
        return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: '?';
    }
}
