<?php
declare(strict_types=1);

namespace Pimcore\Bundle\StudioExampleBundle\Webpack;

use Pimcore\Bundle\StudioUiBundle\Webpack\WebpackEntryPointProviderInterface;

/**
 * @internal
 */
final class WebpackEntryPointProvider implements WebpackEntryPointProviderInterface
{
    public function getEntryPointsJsonLocations(): array
    {
        return [__DIR__ . '/../../public/build/entrypoints.json'];
    }

    public function getEntryPoints(): array
    {
        return ['main'];
    }

    public function getOptionalEntryPoints(): array
    {
        return [];
    }

}
