<?php

namespace Pimcore\Bundle\StudioExampleBundle\DependencyInjection;

use Pimcore\Bundle\CoreBundle\DependencyInjection\ConfigurationHelper;
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

        $bundles = $container->getParameter('kernel.bundles');
        if (isset($bundles['PimcoreStudioDashboardsBundle'])) {
            $loader->load('studio_dashboards.yaml');

            $container->setParameter(
                Configuration::ROOT_NODE . '.' . Configuration::TOP_ASSETS_WIDGETS_NODE,
                $config[Configuration::TOP_ASSETS_WIDGETS_NODE]
            );
            $container->setParameter(
                Configuration::ROOT_NODE . '.config_location.' . Configuration::TOP_ASSETS_WIDGETS_NODE,
                $config['config_location'][Configuration::TOP_ASSETS_WIDGETS_NODE]
            );
        }
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

        if ($container->hasExtension('pimcore_studio_dashboards')) {
            // Make the custom widget type available in the add-widget dialog.
            $container->prependExtensionConfig('pimcore_studio_dashboards', [
                'widget_types' => [
                    'top_assets',
                ],
            ]);

            $this->prependWidgetConfigs($container);
        }
    }

    /**
     * Loads the persisted widget configurations (symfony-config write target) from the configured
     * directory back into this bundle's container configuration so the LocationAwareConfigRepository
     * can read them. No-op when the settings-store write target is used.
     */
    private function prependWidgetConfigs(ContainerBuilder $container): void
    {
        $containerConfig = ConfigurationHelper::getConfigNodeFromSymfonyTree($container, Configuration::ROOT_NODE);

        $configDir = $containerConfig['config_location'][Configuration::TOP_ASSETS_WIDGETS_NODE]['write_target']['options']['directory'];

        $configLoader = new Loader\YamlFileLoader($container, new FileLocator($configDir));
        foreach (ConfigurationHelper::getSymfonyConfigFiles($configDir) as $config) {
            $configLoader->load($config);
        }
    }
}
