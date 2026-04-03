<?php
declare(strict_types=1);

namespace Pimcore\Bundle\StudioExampleBundle\Perspective\Hydrator;

use Pimcore\Bundle\StudioBackendBundle\Icon\Service\IconServiceInterface;
use Pimcore\Bundle\StudioBackendBundle\Perspective\Hydrator\WidgetConfigHydratorInterface;
use Pimcore\Bundle\StudioBackendBundle\Perspective\Schema\WidgetConfig;
use Pimcore\Bundle\StudioExampleBundle\Perspective\Schema\IframeWidgetConfig;

final readonly class IframeWidgetConfigHydrator implements WidgetConfigHydratorInterface
{
    public function __construct(
        private IconServiceInterface $iconService,
    ) {
    }

    public function getSupportedWidgetType(): string
    {
        return 'example_iframe';
    }

    public function hydrate(array $widgetData): WidgetConfig
    {
        return new IframeWidgetConfig(
            $widgetData['id'],
            $widgetData['name'],
            $this->iconService->getIconForValue($widgetData['icon'] ?? null),
            $widgetData['url'] ?? '',
            $widgetData['height'] ?? null,
            $widgetData['isWriteable'] ?? false,
        );
    }
}
