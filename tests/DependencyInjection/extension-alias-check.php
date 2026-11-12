<?php
// F91: boots the bundle's container extension next to Studio Dashboards' one, as a kernel with both bundles does.
// Run by enterprise/tests/f91-extension-alias.test.mjs: php extension-alias-check.php <vendor/autoload.php> <config dir>
// Prints one JSON object; the test asserts on it.

use Pimcore\Bundle\StudioDashboardsBundle\DependencyInjection\PimcoreStudioDashboardsExtension;
use Pimcore\Bundle\StudioExampleBundle\DependencyInjection\Configuration;
use Pimcore\Bundle\StudioExampleBundle\PimcoreStudioExampleBundle;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Compiler\MergeExtensionConfigurationPass;

[$script, $autoload, $configDir] = $argv;
$loader = require $autoload;
// This worktree's classes win over the installed copy of the bundle (whose classmap would come first otherwise).
$src = dirname(__DIR__, 2) . '/src/';
spl_autoload_register(static function (string $class) use ($src): void {
    $prefix = 'Pimcore\\Bundle\\StudioExampleBundle\\';
    if (str_starts_with($class, $prefix)) {
        $file = $src . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
        if (is_file($file)) {
            require $file;
        }
    }
}, true, true);
defined('PIMCORE_PROJECT_ROOT') || define('PIMCORE_PROJECT_ROOT', $configDir);
defined('PIMCORE_CONFIGURATION_DIRECTORY') || define('PIMCORE_CONFIGURATION_DIRECTORY', $configDir . '/config');

$result = ['rootNode' => Configuration::ROOT_NODE];
try {
    $bundle = new PimcoreStudioExampleBundle();
    $extension = $bundle->getContainerExtension();
    $result['alias'] = $extension?->getAlias();

    $container = new ContainerBuilder();
    $container->setParameter('kernel.bundles', [
        'PimcoreStudioExampleBundle' => PimcoreStudioExampleBundle::class,
        'PimcoreStudioDashboardsBundle' => 'Pimcore\\Bundle\\StudioDashboardsBundle\\PimcoreStudioDashboardsBundle',
    ]);
    $container->setParameter('kernel.debug', false);
    $container->setParameter('kernel.environment', 'test');
    $container->setParameter('kernel.project_dir', $configDir);
    // Studio Backend's config is written by both bundles; a stand-in takes it (its own load needs a whole Pimcore).
    $container->registerExtension(new class extends \Symfony\Component\DependencyInjection\Extension\Extension {
        public function load(array $configs, ContainerBuilder $container): void {}
        public function getAlias(): string { return 'pimcore_studio_backend'; }
    });
    $container->registerExtension(new PimcoreStudioDashboardsExtension());
    $container->registerExtension($extension);
    // The config a user writes, under the documented key.
    $container->loadFromExtension(Configuration::ROOT_NODE, [
        Configuration::TOP_ASSETS_WIDGETS_NODE => [
            'talk' => ['name' => 'Talk', 'color' => '#FFFFFF', 'icon' => ['type' => 'name', 'value' => 'star'], 'visualization' => 'list'],
        ],
    ]);

    $extension->prepend($container);
    $result['prepended'] = true;
    $result['dashboardsWidgetTypes'] = array_merge(...array_map(
        static fn (array $c): array => $c['widget_types'] ?? [],
        $container->getExtensionConfig('pimcore_studio_dashboards')
    ));

    // What the kernel does next: load every extension with its merged config.
    (new MergeExtensionConfigurationPass())->process($container);
    $result['loaded'] = true;
    $result['widgets'] = array_keys($container->getParameter(
        Configuration::ROOT_NODE . '.' . Configuration::TOP_ASSETS_WIDGETS_NODE
    ));
} catch (\Throwable $e) {
    $result['error'] = get_class($e) . ': ' . $e->getMessage();
}
echo json_encode($result), "\n";
