<?php
declare(strict_types=1);

namespace Pimcore\Bundle\StudioExampleBundle\Gdpr;

use Pimcore\Bundle\StudioBackendBundle\Filter\MappedParameter\FilterParameter;
use Pimcore\Bundle\StudioBackendBundle\Gdpr\Provider\DataProviderInterface;
use Pimcore\Bundle\StudioBackendBundle\Gdpr\Schema\GdprDataRow;
use Pimcore\Bundle\StudioBackendBundle\Response\Collection;
use Symfony\Component\HttpFoundation\Response;

class MyDataProvider implements DataProviderInterface
{
    public function __construct(
        array $gdprConfig = []
    ) {
    }

    public function findData(FilterParameter $filter): Collection
    {
        return new Collection(
            totalItems: 1,
            items: [
                new GdprDataRow([
                    'id' => 123,
                    'name' => 'foobar',
                    'lastname' => 'lastname foobar'
                ])
            ]
        );
    }

    public function getName(): string
    {
        return "MyDataProvider";
    }

    public function getKey(): string
    {
        return "my_data_provider";
    }

    public function getSortPriority(): int
    {
        return -10;
    }

    public function getRequiredPermissions(): array
    {
        return [];
    }

    public function getSingleItemForDownload(int $id): array|Response
    {
        return [];
    }
}
