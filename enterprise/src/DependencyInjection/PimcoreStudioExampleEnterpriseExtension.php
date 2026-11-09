<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\DependencyInjection;

use Symfony\Component\Config\FileLocator;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Loader;
use Symfony\Component\HttpKernel\DependencyInjection\Extension;

class PimcoreStudioExampleEnterpriseExtension extends Extension
{
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
