<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\DependencyInjection\Compiler;

use Symfony\Component\DependencyInjection\Compiler\CompilerPassInterface;
use Symfony\Component\DependencyInjection\ContainerBuilder;

/**
 * Lets a wysiwyg editable keep a picture with its caption (F160, DR-F160-1 A). Pimcore saves every wysiwyg through its
 * HTML sanitizer, which allows no <figure> or <figcaption> (it drops them with the image inside) and keeps only class,
 * id, alt, style and src on <img>. This adds exactly <figure class>, <figcaption class> and width, height and loading
 * on <img>; everything else Pimcore allows stays as it is, nothing else is let through.
 *
 * A compiler pass, not framework config: config from another bundle would replace Pimcore's whole img list or be
 * replaced by it, depending on the order the bundles are loaded in.
 */
final class WysiwygFigurePass implements CompilerPassInterface
{
    public const SANITIZER_CONFIG = 'html_sanitizer.config.pimcore.wysiwyg_sanitizer';

    /** [element => attributes added to what Pimcore allows on it] */
    public const ALLOWED = [
        'figure' => ['class'],
        'figcaption' => ['class'],
        'img' => ['width', 'height', 'loading'],
    ];

    public function process(ContainerBuilder $container): void
    {
        if (!$container->hasDefinition(self::SANITIZER_CONFIG)) {
            return;
        }
        $definition = $container->getDefinition(self::SANITIZER_CONFIG);
        $allowed = [];
        foreach ($definition->getMethodCalls() as [$method, $arguments]) {
            if ($method === 'allowElement' && isset(self::ALLOWED[$arguments[0] ?? null])) {
                $allowed[$arguments[0]] = $arguments[1] ?? [];
            }
        }
        foreach (self::ALLOWED as $element => $attributes) {
            $there = $allowed[$element] ?? [];
            if ($there === '*') {
                continue; // every attribute is allowed already
            }
            // allowElement() replaces the element's attributes, so the ones Pimcore allows are passed again
            $definition->addMethodCall('allowElement', [$element, array_values(array_unique([...(array) $there, ...$attributes]))], true);
        }
    }
}
