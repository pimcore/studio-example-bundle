<?php
declare(strict_types=1);

namespace Pimcore\Bundle\StudioExampleBundle\Dashboards\Schema;

use OpenApi\Attributes\Property;
use OpenApi\Attributes\Schema;
use Pimcore\Bundle\StudioBackendBundle\Response\ElementIcon;
use Pimcore\Bundle\StudioDashboardsBundle\Schema\Widget\SaveWidgetConfig;
use Pimcore\Bundle\StudioDashboardsBundle\Util\Constant\VisualizationOptions;

#[Schema(
    schema: 'StudioExampleSaveTopAssetsWidgetConfig',
    title: 'Save Top Assets Widget Config',
    type: 'object'
)]
final readonly class SaveTopAssetsWidgetConfig extends SaveWidgetConfig
{
    public function __construct(
        string $id,
        string $name,
        ?ElementIcon $icon,
        #[Property(description: 'Maximum number of assets to display', type: 'integer', example: 10)]
        private int $limit = 10,
        string $color = '#FFFFFF',
        string $visualization = VisualizationOptions::TABLE->value,
    ) {
        parent::__construct($id, $name, $icon, $color, $visualization);
    }

    public function getLimit(): int
    {
        return $this->limit;
    }
}
