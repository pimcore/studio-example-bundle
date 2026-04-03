<?php

declare(strict_types=1);

namespace Pimcore\Bundle\StudioExampleBundle\Grid\Column\Resolver;

use Pimcore\Bundle\StudioBackendBundle\Grid\Column\ColumnResolverInterface;
use Pimcore\Bundle\StudioBackendBundle\Grid\Column\CoreElementColumnResolverInterface;
use Pimcore\Bundle\StudioBackendBundle\Grid\Schema\Column;
use Pimcore\Bundle\StudioBackendBundle\Grid\Schema\ColumnData;
use Pimcore\Bundle\StudioBackendBundle\Util\Constant\ElementTypes;
use Pimcore\Model\Element\ElementInterface;

final readonly class ProgressBarResolver implements ColumnResolverInterface, CoreElementColumnResolverInterface
{
    public function getType(): string
    {
        return 'example.progressBar';
    }

    public function supportedElementTypes(): array
    {
        return [ElementTypes::TYPE_OBJECT];
    }

    public function resolveForCoreElement(Column $column, ElementInterface $element): ColumnData
    {
        return new ColumnData(
            $column->getKey(),
            $column->getLocale(),
            $element->getId() % 101,
            'progressBar'
        );
    }
}
