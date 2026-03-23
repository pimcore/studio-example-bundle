<?php

declare(strict_types=1);

namespace Pimcore\Bundle\StudioExampleBundle\Grid\Column\Definition;

use Pimcore\Bundle\StudioBackendBundle\Grid\Column\ColumnDefinitionInterface;

final readonly class SimpleTextDefinition implements ColumnDefinitionInterface
{
    public function getType(): string
    {
        return 'data-object.simpleText';
    }

    public function getConfig(mixed $config): array
    {
        return [];
    }

    public function isSortable(): bool
    {
        return true;
    }

    public function isFilterable(): bool
    {
        return true;
    }

    public function getFrontendType(): string
    {
        return 'input';
    }

    public function isExportable(): bool
    {
        return true;
    }
}
