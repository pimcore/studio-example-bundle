<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Portal\ScreamScore;

use Pimcore\Bundle\PortalEngineBundle\Model\DataObject\PortalUserInterface;
use Pimcore\Bundle\PortalEngineBundle\Service\Security\SecurityService;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore\ScreamScore;

/**
 * Who may see the park's scream scores and hide a comment: a signed-in portal user in the portal user group
 * ScreamScore::STAFF_GROUP ("Park staff", created by coaster-demo:setup). The check is by group, never by user name or
 * e-mail: a park adds staff by adding them to the group in Studio. Anonymous visitors, guests, public-share users and
 * every other portal user are refused.
 */
class StaffAccess
{
    public function __construct(private readonly SecurityService $portalSecurity)
    {
    }

    /** Whether the portal user of this request is park staff. */
    public function allows(): bool
    {
        return self::isStaff($this->portalUser());
    }

    /** Whether $user is a signed-in portal user in the park-staff group. */
    public static function isStaff(?PortalUserInterface $user): bool
    {
        if ($user === null || $user->getId() === null || $user->isGuestUser() || $user->isPortalShareUser()) {
            return false;
        }
        foreach ((array) $user->getGroups() as $group) {
            if (is_object($group) && method_exists($group, 'getKey') && $group->getKey() === ScreamScore::STAFF_GROUP) {
                return true;
            }
        }

        return false;
    }

    /** The portal user Portal Engine signed in for this request, or null. */
    protected function portalUser(): ?PortalUserInterface
    {
        return $this->portalSecurity->getPortalUser();
    }
}
