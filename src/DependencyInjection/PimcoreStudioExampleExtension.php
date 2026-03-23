<?php

namespace Pimcore\Bundle\StudioExampleBundle\DependencyInjection;

use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Extension\PrependExtensionInterface;
use Symfony\Component\Config\FileLocator;
use Symfony\Component\HttpKernel\DependencyInjection\Extension;
use Symfony\Component\DependencyInjection\Loader;

class PimcoreStudioExampleExtension extends Extension implements PrependExtensionInterface
{
    public function load(array $configs, ContainerBuilder $container): void
    {
        $configuration = new Configuration();
        $config = $this->processConfiguration($configuration, $configs);
        $loader = new Loader\YamlFileLoader($container, new FileLocator(__DIR__.'/../../config'));
        $loader->load('services.yaml');
        $loader->load('generic-data-index.yaml');
    }

    public function prepend(ContainerBuilder $container): void
    {
        if ($container->hasExtension('pimcore_studio_backend')) {
            $loader = new Loader\YamlFileLoader(
                $container,
                new FileLocator(__DIR__ . '/../../config')
            );

            $loader->load('pimcore/studio_backend.yaml');
        }
    }
}
