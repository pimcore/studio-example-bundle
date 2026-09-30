<?php
declare(strict_types=1);

namespace Pimcore\Bundle\StudioExampleBundle\Webpack;

use Pimcore\Bundle\StudioUiBundle\Build\BuildArchive;
use Pimcore\Bundle\StudioUiBundle\Build\BuildArchiveExtractionTrait;
use Pimcore\Bundle\StudioUiBundle\Build\BuildArchiveProviderInterface;

/**
 * The frontend build is shipped as a single archive (build-dist/build-<id>.zip) instead of a
 * committed public/build/ directory. BuildArchiveExtractionTrait extracts it into targetDir
 * during cache warmup - see the Studio UI Bundle docs, "Shipping the Frontend Build as an
 * Archive".
 *
 * @internal
 */
final class WebpackEntryPointProvider implements BuildArchiveProviderInterface
{
    use BuildArchiveExtractionTrait;

    /**
     * @return string[]
     */
    public function getEntryPoints(): array
    {
        return ['exposeRemote'];
    }

    /**
     * @return string[]
     */
    public function getOptionalEntryPoints(): array
    {
        return [];
    }

    protected function buildArchive(): BuildArchive
    {
        return new BuildArchive(
            archiveGlob: __DIR__ . '/../../build-dist/build*.zip',
            targetDir: __DIR__ . '/../../public/build',
        );
    }
}
