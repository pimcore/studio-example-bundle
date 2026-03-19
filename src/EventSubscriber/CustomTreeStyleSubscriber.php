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

use Pimcore\Bundle\StudioBackendBundle\DataObject\Event\PreResponse\DataObjectDetailEvent;
use Pimcore\Bundle\StudioBackendBundle\DataObject\Event\PreResponse\DataObjectEvent;
use Pimcore\Bundle\StudioBackendBundle\Element\Schema\CustomAttributes;
use Pimcore\Bundle\StudioBackendBundle\Response\ElementIcon;
use Pimcore\Bundle\StudioBackendBundle\Util\Constant\ElementIconTypes;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

class CustomTreeStyleSubscriber implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        return [
            DataObjectEvent::EVENT_NAME => 'handleDataObject',
            DataObjectDetailEvent::EVENT_NAME => 'handleDataObjectDetail',
        ];
    }

    public function handleDataObject(DataObjectEvent $event): void
    {
        $dataObject = $event->getDataObject();

        if ($dataObject->getClassName() !== 'Demo') {
            return;
        }

        $this->applyDemoStyle($event->getCustomAttributes(), $dataObject->getId());
        $event->setCustomAttributes($event->getCustomAttributes());
    }

    public function handleDataObjectDetail(DataObjectDetailEvent $event): void
    {
        $dataObject = $event->getDataObject();

        if ($dataObject->getClassName() !== 'Demo') {
            return;
        }

        $this->applyDemoStyle($event->getCustomAttributes(), $dataObject->getId());
        $event->setCustomAttributes($event->getCustomAttributes());
    }

    private function applyDemoStyle(CustomAttributes $customAttributes, int $id): void
    {
        $customAttributes->setIcon(
            new ElementIcon(
                ElementIconTypes::NAME->value,
                'flag'
            )
        );

        $customAttributes->setTooltip(
            '<b>Demo Object</b><br>ID: ' . $id
        );
    }
}
