<?php
declare(strict_types=1);

namespace Pimcore\Bundle\StudioExampleBundle\Dashboards\Schema;

use OpenApi\Attributes\Property;
use OpenApi\Attributes\Schema;
use Pimcore\Bundle\StudioBackendBundle\Response\ElementIcon;
use Pimcore\Bundle\StudioDashboardsBundle\Schema\Widget\WidgetConfig;

#[Schema(
    schema: 'StudioExampleTopAssetsWidgetConfig',
    title: 'Top Assets Widget Config',
    required: ['color', 'limit', 'isWriteable'],
    type: 'object'
)]
final class TopAssetsWidgetConfig extends WidgetConfig
{
    public function __construct(
        string $id,
        string $name,
        ?ElementIcon $icon,
        #[Property(description: 'Color', type: 'string', example: '#FF5733')]
        private readonly string $color,
        #[Property(description: 'Maximum number of assets to display', type: 'integer', example: 10)]
        private readonly int $limit,
        ?string $visualization = null,
        #[Property(description: 'Is Writeable', type: 'bool', example: true)]
        private readonly bool $isWriteable = true,
    ) {
        parent::__construct($id, $name, 'top_assets', $icon, $visualization);
    }

    public function getColor(): string
    {
        return $this->color;
    }

    public function getLimit(): int
    {
        return $this->limit;
    }

    public function isWriteable(): bool
    {
        return $this->isWriteable;
    }
}
