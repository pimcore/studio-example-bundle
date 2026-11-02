<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\DependencyInjection;

use Pimcore\Bundle\StudioExampleEnterpriseBundle\Agent\Tools\ListRevisionsTool;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\Agent\Tools\ProposeSupplierNoteTool;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\Agent\Tools\ReadBriefTool;
use Symfony\Component\Config\FileLocator;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Definition;
use Symfony\Component\DependencyInjection\Extension\PrependExtensionInterface;
use Symfony\Component\DependencyInjection\Loader;
use Symfony\Component\HttpKernel\DependencyInjection\Extension;

class PimcoreStudioExampleEnterpriseExtension extends Extension implements PrependExtensionInterface
{
    // PimcoreAgentBundle is optional (composer "suggest"): its tool group and preset are added only when it is enabled.
    public const AGENT_BUNDLE = 'Pimcore\\Bundle\\PimcoreAgentBundle\\PimcoreAgentBundle';

    public const AGENT_TOOL_GROUP = 'kingdom-portal';

    public const AGENT_TOOLS = [ReadBriefTool::class, ListRevisionsTool::class, ProposeSupplierNoteTool::class];

    /**
     * Loads every config/*.yaml of the sub-bundle, so an enterprise example only has to add its own file there.
     */
    public function load(array $configs, ContainerBuilder $container): void
    {
        $configDir = __DIR__ . '/../../config';
        $loader = new Loader\YamlFileLoader($container, new FileLocator($configDir));
        // import() expands the glob; load() would take '*.yaml' as a file name and fail to boot (F91).
        $loader->import($configDir . '/*.yaml');

        if (self::agentBundleEnabled($container)) {
            foreach (self::AGENT_TOOLS as $class) {
                $container->setDefinition($class, (new Definition($class))->setAutowired(true)->addTag('pimcore.mcp_tool', [
                    'group' => self::AGENT_TOOL_GROUP,
                    'description' => 'Pimcore Kingdom portal: the brief and the revisions the portal user may view, one Supplier-note proposal',
                ]));
            }
        }
    }

    /** With PimcoreAgentBundle: the tool bundle `kingdom-portal` and the preset `kingdom-brief-check`. */
    public function prepend(ContainerBuilder $container): void
    {
        if (!self::agentBundleEnabled($container) || !$container->hasExtension('pimcore_agent')) {
            return;
        }
        $container->prependExtensionConfig('pimcore_agent', [
            'agents' => ['paths' => [dirname(__DIR__, 2) . '/config/pimcore/agents']],
            'tool_bundles' => [self::AGENT_TOOL_GROUP => [
                'displayName' => 'Kingdom portal',
                'description' => 'The Thunder Loop brief, the revisions the portal user may view and a Supplier-note proposal.',
                'pimcoreMcpServers' => [self::AGENT_TOOL_GROUP],
            ]],
        ]);
    }

    private static function agentBundleEnabled(ContainerBuilder $container): bool
    {
        $bundles = $container->hasParameter('kernel.bundles') ? (array) $container->getParameter('kernel.bundles') : [];

        return in_array(self::AGENT_BUNDLE, $bundles, true) && class_exists(self::AGENT_BUNDLE);
    }
}
