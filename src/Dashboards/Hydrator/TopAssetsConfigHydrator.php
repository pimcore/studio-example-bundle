<?php
declare(strict_types=1);

namespace Pimcore\Bundle\StudioExampleBundle\Dashboards\Hydrator;

use Pimcore\Bundle\StudioBackendBundle\Icon\Service\IconServiceInterface;
use Pimcore\Bundle\StudioDashboardsBundle\Hydrator\Widget\ConfigHydratorInterface;
use Pimcore\Bundle\StudioDashboardsBundle\Schema\Widget\WidgetConfig;
use Pimcore\Bundle\StudioDashboardsBundle\Service\Loader\Widget\TaggedIteratorHydrator;
use Pimcore\Bundle\StudioExampleBundle\Dashboards\Schema\TopAssetsWidgetConfig;
use Symfony\Component\DependencyInjection\Attribute\AutoconfigureTag;

#[AutoconfigureTag(TaggedIteratorHydrator::HYDRATOR_TAG)]
final readonly class TopAssetsConfigHydrator implements ConfigHydratorInterface
{
    public function __construct(
        private IconServiceInterface $iconService,
    ) {
    }

    public function getSupportedWidgetType(): string
    {
        return 'top_assets';
    }

    public function hydrate(array $widgetData): WidgetConfig
    {
        return new TopAssetsWidgetConfig(
            id: $widgetData['id'],
            name: $widgetData['name'],
            icon: empty($widgetData['icon']) ? null : $this->iconService->getIconForValue($widgetData['icon']),
            color: $widgetData['color'],
            limit: (int) ($widgetData['limit'] ?? 10),
            visualization: $widgetData['visualization'] ?? null,
            isWriteable: $widgetData['isWriteable'],
        );
    }
}
