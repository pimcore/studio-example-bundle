<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\ChangeControl;

use Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo\CoasterDemoResetEvent;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;

/**
 * coaster-demo:reset (and reset --all) discards the demo's open change set before it resets the asset, so the next
 * run of Demo 2 starts from no change set at all.
 */
#[AsEventListener(event: CoasterDemoResetEvent::class)]
class CoasterChangeSetResetListener
{
    public function __construct(private readonly CoasterChangeSet $changeSet)
    {
    }

    public function __invoke(CoasterDemoResetEvent $event): void
    {
        $this->changeSet->discard();
    }
}
