<?php

declare(strict_types=1);

namespace Pimcore\Bundle\StudioExampleBundle\DataIndex\Filter;

use Pimcore\Bundle\StudioBackendBundle\DataIndex\Filter\FilterInterface;
use Pimcore\Bundle\StudioBackendBundle\DataIndex\Query\QueryInterface;
use Pimcore\Bundle\StudioBackendBundle\MappedParameter\Filter\ColumnFiltersParameterInterface;

final class SimpleTextFilter implements FilterInterface
{
    private const COLUMN_TYPE = 'dataobject.adapter';

    public function apply(mixed $parameters, QueryInterface $query): QueryInterface
    {
        if (!$parameters instanceof ColumnFiltersParameterInterface) {
            return $query;
        }

        foreach ($parameters->getColumnFilterByType(self::COLUMN_TYPE) as $column) {
            $filterValue = $column->getFilterValue();

            if (!is_string($filterValue)) {
                continue;
            }

            $query->wildcardSearch($column->getKey(), $filterValue);
        }

        return $query;
    }
}
