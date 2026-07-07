<?php

namespace Pimcore\Bundle\StudioExampleBundle\DependencyInjection;

use Pimcore\Bundle\CoreBundle\DependencyInjection\ConfigurationHelper;
use Pimcore\Bundle\StudioBackendBundle\Util\Constant\ElementIconTypes;
use Symfony\Component\Config\Definition\Builder\ArrayNodeDefinition;
use Symfony\Component\Config\Definition\Builder\TreeBuilder;
use Symfony\Component\Config\Definition\ConfigurationInterface;

/**
 * This is the class that validates and merges configuration from your app/config files.
 *
 * To learn more see {@link http://symfony.com/doc/current/cookbook/bundles/configuration.html}
 */
class Configuration implements ConfigurationInterface
{
    public const string ROOT_NODE = 'pimcore_studio_example_bundle';

    public const string TOP_ASSETS_WIDGETS_NODE = 'top_assets_widgets';

    private const string WIDGET_CONFIGURATION_DIRECTORY = 'studio_example_widgets';

    /**
     * {@inheritdoc}
     */
    public function getConfigTreeBuilder(): TreeBuilder
    {
        $treeBuilder = new TreeBuilder(self::ROOT_NODE);
        $rootNode = $treeBuilder->getRootNode();

        $this->addTopAssetsWidgetConfigurationNode($rootNode);

        ConfigurationHelper::addConfigLocationWithWriteTargetNodes(
            $rootNode,
            [
                self::TOP_ASSETS_WIDGETS_NODE =>
                    PIMCORE_CONFIGURATION_DIRECTORY . '/' . self::WIDGET_CONFIGURATION_DIRECTORY
                    . '/' . self::TOP_ASSETS_WIDGETS_NODE,
            ],
            ['read_target']
        );

        return $treeBuilder;
    }

    /**
     * Configuration node for pre-configuring `top_assets` dashboard widget instances via YAML.
     * The same node is used by the TopAssetsConfigRepository to persist widgets created in
     * the Studio UI (see config_location above for the storage target).
     */
    private function addTopAssetsWidgetConfigurationNode(ArrayNodeDefinition $node): void
    {
        $prototype = $node->children()
            ->arrayNode(self::TOP_ASSETS_WIDGETS_NODE)
                ->defaultValue([])
                ->useAttributeAsKey('id')
                ->arrayPrototype()
                    ->children();

        $prototype->integerNode('limit')
            ->defaultValue(10)
            ->min(1);

        $prototype->scalarNode('name')
            ->isRequired()
            ->cannotBeEmpty();

        $prototype->scalarNode('color')
            ->defaultValue('#FFFFFF')
            ->isRequired()
            ->cannotBeEmpty();

        $icon = $prototype->arrayNode('icon');
        $icon->isRequired();
        $icon->validate()
            ->ifTrue(static fn ($value): bool => is_array($value) &&
                (isset($value['type']) xor isset($value['value'])))
            ->thenInvalid('Both "type" and "value" must be defined together in "icon".')
            ->end();

        $iconChildren = $icon->children();
        $iconChildren->enumNode('type')->values(ElementIconTypes::values());
        $iconChildren->scalarNode('value');

        $prototype->scalarNode('visualization')
            ->defaultNull()
            ->isRequired();
    }
}
