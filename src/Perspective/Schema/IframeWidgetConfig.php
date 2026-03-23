<?php
declare(strict_types=1);

namespace Pimcore\Bundle\StudioExampleBundle\Perspective\Schema;

use OpenApi\Attributes\Property;
use OpenApi\Attributes\Schema;
use Pimcore\Bundle\StudioBackendBundle\Perspective\Schema\WidgetConfig;
use Pimcore\Bundle\StudioBackendBundle\Response\ElementIcon;

#[Schema(
    title: 'Iframe Widget Config',
    required: ['id', 'name', 'widgetType', 'icon', 'url'],
    type: 'object'
)]
class IframeWidgetConfig extends WidgetConfig
{
    public function __construct(
        string $id,
        string $name,
        ElementIcon $icon,
        #[Property(description: 'Iframe URL', type: 'string', example: 'https://pimcore.com')]
        private readonly string $url,
        #[Property(description: 'Iframe height in pixels', type: 'integer', example: 600)]
        private readonly ?int $height = null,
        #[Property(description: 'If configuration is writeable', type: 'bool', example: true)]
        private readonly bool $isWriteable = false,
    ) {
        parent::__construct($id, $name, 'example_iframe', $icon);
    }

    public function getUrl(): string
    {
        return $this->url;
    }

    public function getHeight(): ?int
    {
        return $this->height;
    }

    public function isWriteable(): bool
    {
        return $this->isWriteable;
    }
}
