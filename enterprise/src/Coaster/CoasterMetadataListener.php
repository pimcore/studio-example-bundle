<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Coaster;

use Pimcore\Event\Model\AssetEvent;
use Psr\Log\LoggerInterface;

/**
 * Fills the metadata of a .coaster asset when it is uploaded or saved: max height, length, inversions, top speed and
 * duration, one input entry each (named as in CoasterMetadataExtractor::UNITS), so the portal shows them in the
 * asset's General card. Runs before the asset is written (pimcore.asset.preAdd and preUpdate, see config/coaster.yaml),
 * so the values are saved with it, without a second save. An invalid file gets no metadata, and a warning says why.
 */
class CoasterMetadataListener
{
    public const EXTENSION = 'coaster';

    public function __construct(
        private readonly CoasterValidator $validator,
        private readonly CoasterMetadataExtractor $extractor,
        private readonly LoggerInterface $logger,
    ) {
    }

    public function onAssetSave(AssetEvent $event): void
    {
        $asset = $event->getAsset();
        if (strtolower(pathinfo((string) $asset->getFilename(), PATHINFO_EXTENSION)) !== self::EXTENSION) {
            return;
        }

        try {
            $design = json_decode((string) $asset->getData(), false, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException $exception) {
            $this->logger->warning('Coaster metadata not set: {path} is not valid JSON ({reason}).', [
                'path' => $asset->getRealFullPath(),
                'reason' => $exception->getMessage(),
            ]);

            return;
        }

        $errors = $this->validator->validate($design);
        if ($errors !== []) {
            $this->logger->warning('Coaster metadata not set: {path} is not a valid .coaster file: {reason}', [
                'path' => $asset->getRealFullPath(),
                'reason' => implode('; ', array_map(static fn (array $error) => "{$error['path']}: {$error['message']}", $errors)),
                'errors' => $errors,
            ]);

            return;
        }

        foreach ($this->extractor->extract($design) as $name => $value) {
            $asset->addMetadata($name, 'input', (string) $value);
        }
    }
}
