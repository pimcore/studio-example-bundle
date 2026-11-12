<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Portal\Agent;

use Pimcore\Bundle\PortalEngineBundle\Model\DataObject\PortalUserInterface;

/**
 * Who may talk to the portal's agent: a signed-in portal user (not a guest, a public-share user or the Portal Engine's
 * stand-in admin) with PORTAL_ACCESS, from a page of the portal itself. The order is the HTTP one: 401 before 403.
 */
final class ChatAccess
{
    /**
     * Null when the request may go on, else [HTTP status, message].
     *
     * @param bool        $portalAccess  whether PORTAL_ACCESS is granted
     * @param string|null $origin        the request's Origin header
     * @param string      $portalOrigin  the portal's own scheme://host[:port]
     *
     * @return array{0: int, 1: string}|null
     */
    public static function deny(?PortalUserInterface $user, bool $portalAccess, ?string $origin, string $portalOrigin): ?array
    {
        if ($user === null || $user->getId() === null || $user->isGuestUser() || $user->isPortalShareUser()) {
            return [401, 'Sign in to the portal to talk to the agent.'];
        }
        if (!$portalAccess) {
            return [403, 'This portal user has no access to the portal.'];
        }
        // A browser sends Origin on every POST from a script; another site's page (or none) may not drive the agent.
        if ($origin === null || $origin !== $portalOrigin) {
            return [403, 'The agent answers the portal\'s own pages only.'];
        }

        return null;
    }
}
