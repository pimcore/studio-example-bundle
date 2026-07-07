<?php
declare(strict_types=1);

namespace Pimcore\Bundle\StudioExampleBundle\Dashboards\Resolver;

use Pimcore\Bundle\StudioDashboardsBundle\Resolver\Widget\DataResolverInterface;
use Pimcore\Bundle\StudioDashboardsBundle\Schema\Widget\WidgetConfig;
use Pimcore\Bundle\StudioDashboardsBundle\Service\Loader\Widget\TaggedIteratorDataResolver;
use Pimcore\Bundle\StudioExampleBundle\Dashboards\Schema\TopAssetsWidgetConfig;
use Pimcore\Model\Asset;
use Symfony\Component\DependencyInjection\Attribute\AutoconfigureTag;
use function array_map;

/**
 * Supplies the data displayed inside a `top_assets` widget: the most recently
 * modified assets, limited by the configured row count.
 */
#[AutoconfigureTag(TaggedIteratorDataResolver::RESOLVER_TAG)]
final readonly class TopAssetsResolver implements DataResolverInterface
{
    public function getSupportedWidgetType(): string
    {
        return 'top_assets';
    }

    public function resolveData(WidgetConfig $widget): array
    {
        if (!$widget instanceof TopAssetsWidgetConfig) {
            return [];
        }

        $list = new Asset\Listing();
        $list->setCondition("`type` != 'folder'");
        $list->setOrderKey('modificationDate');
        $list->setOrder('DESC');
        $list->setLimit($widget->getLimit());

        return [
            'items' => array_map(
                static fn (Asset $asset): array => [
                    'id' => $asset->getId(),
                    'filename' => $asset->getFilename(),
                    'fullPath' => $asset->getFullPath(),
                    'modificationDate' => $asset->getModificationDate(),
                ],
                $list->load()
            ),
        ];
    }
}
