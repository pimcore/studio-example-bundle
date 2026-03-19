<?php

declare(strict_types=1);

namespace Pimcore\Bundle\StudioExampleBundle\Grid\Column\Definition;

use Pimcore\Bundle\StudioBackendBundle\Grid\Column\ColumnDefinitionInterface;

final readonly class ProgressBarDefinition implements ColumnDefinitionInterface
{
    public function getType(): string
    {
        return 'example.progressBar';
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
        return false;
    }

    public function getFrontendType(): string
    {
        return 'progressBar';
    }

    public function isExportable(): bool
    {
        return true;
    }
}
