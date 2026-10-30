<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo;

use Symfony\Contracts\EventDispatcher\Event;

/**
 * Dispatched by coaster-demo:reset before it resets the demo, so other parts of the demo can drop their own state
 * first (an open Change Control change set, for example). Listen with
 * #[AsEventListener(event: CoasterDemoResetEvent::class)].
 */
final class CoasterDemoResetEvent extends Event
{
    public function __construct(private readonly bool $removeAll)
    {
    }

    /** True for a reset to the state before setup, false for a reset to revision 1. */
    public function isRemoveAll(): bool
    {
        return $this->removeAll;
    }
}
