<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Agent;

/**
 * KingdomBriefTools refuses a write: there is no portal user (a Studio-only caller, the shared fallback user, nobody
 * signed in), or the portal user may not see the revision. The message is safe to show to the agent and the user.
 */
class NoPortalUserException extends \RuntimeException
{
}
