<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\DependencyInjection;

use Pimcore\Bundle\StudioExampleEnterpriseBundle\Portal\ScreamScore\GuestController;
use Symfony\Component\Config\FileLocator;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Extension\PrependExtensionInterface;
use Symfony\Component\DependencyInjection\Loader;
use Symfony\Component\HttpKernel\DependencyInjection\Extension;

class PimcoreStudioExampleEnterpriseExtension extends Extension implements PrependExtensionInterface
{
    /** Portal Engine's config key. */
    private const PORTAL_ENGINE = 'pimcore_portal_engine';

    /**
     * Makes the scream score's guest page public in Portal Engine, which asks for a portal login on every other page
     * of a portal site: exactly this one route name joins `custom_public_routes`. Symfony merges the list with the
     * app's own, so an app's public routes stay.
     */
    public function prepend(ContainerBuilder $container): void
    {
        if ($container->hasExtension(self::PORTAL_ENGINE)) {
            $container->prependExtensionConfig(self::PORTAL_ENGINE, ['custom_public_routes' => [GuestController::ROUTE]]);
        }
    }

    /**
     * Loads every config/*.yaml of the sub-bundle, so an enterprise example only has to add its own file there.
     */
    public function load(array $configs, ContainerBuilder $container): void
    {
        $configDir = __DIR__ . '/../../config';
        $loader = new Loader\YamlFileLoader($container, new FileLocator($configDir));
        // import() expands the glob; load() would take '*.yaml' as a file name and fail to boot (F91).
        $loader->import($configDir . '/*.yaml');
    }
}
