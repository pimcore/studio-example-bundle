<?php
declare(strict_types=1);

/**
 * This source file is available under the terms of the
 * Pimcore Open Core License (POCL)
 * Full copyright and license information is available in
 * LICENSE.md which is distributed with this source code.
 *
 *  @copyright  Copyright (c) Pimcore GmbH (https://www.pimcore.com)
 *  @license    Pimcore Open Core License (POCL)
 */

namespace Pimcore\Bundle\StudioExampleBundle\EventSubscriber;

use Pimcore\Bundle\StudioBackendBundle\Asset\Event\PreResponse\AssetEvent;
use Pimcore\Bundle\StudioBackendBundle\Response\ElementIcon;
use Pimcore\Bundle\StudioBackendBundle\Util\Constant\ElementIconTypes;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

class CustomAssetStyleSubscriber implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        return [
            AssetEvent::EVENT_NAME => 'handleAsset',
        ];
    }

    public function handleAsset(AssetEvent $event): void
    {
        $asset = $event->getAsset();

        if (!str_starts_with($asset->getFilename(), 'important_')) {
            return;
        }

        $customAttributes = $event->getCustomAttributes();

        $customAttributes->setIcon(
            new ElementIcon(
                ElementIconTypes::NAME->value,
                'body-style'
            )
        );

        $customAttributes->setTooltip(
            '<h3>' . htmlspecialchars($asset->getFilename()) . '</h3>'
            . '<br>Type: ' . $asset->getType()
        );

        $event->setCustomAttributes($customAttributes);
    }
}
