<?php

declare(strict_types=1);

namespace Pimcore\Bundle\StudioExampleBundle\Grid\Column\Collector;

use function array_key_exists;
use Pimcore\Bundle\StudioBackendBundle\Grid\Column\ColumnCollectorInterface;
use Pimcore\Bundle\StudioBackendBundle\Grid\Schema\ColumnConfiguration;
use Pimcore\Bundle\StudioBackendBundle\Util\Constant\ElementTypes;

final readonly class ProgressBarCollector implements ColumnCollectorInterface
{
    public function getCollectorName(): string
    {
        return 'example.progressBar';
    }

    public function getColumnConfigurations(array $availableColumnDefinitions): array
    {
        $type = 'example.progressBar';

        if (!array_key_exists($type, $availableColumnDefinitions)) {
            return [];
        }

        $definition = $availableColumnDefinitions[$type];

        return [
            new ColumnConfiguration(
                key: 'progress',
                group: ['example'],
                sortable: $definition->isSortable(),
                editable: false,
                exportable: $definition->isExportable(),
                filterable: $definition->isFilterable(),
                localizable: false,
                locale: null,
                type: $type,
                frontendType: $definition->getFrontendType(),
                config: $definition->getConfig([]),
            ),
        ];
    }

    public function supportedElementTypes(): array
    {
        return [ElementTypes::TYPE_DATA_OBJECT];
    }
}
