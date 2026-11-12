<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Agent;

use Pimcore\Bundle\PortalEngineBundle\Model\DataObject\PortalUserInterface;
use Pimcore\Bundle\PortalEngineBundle\Service\Security\SecurityService;
use Pimcore\Model\DataObject\PortalUser;
use Pimcore\Security\User\User as PimcoreSecurityUser;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

/**
 * Who the agent's tools act for: the signed-in portal user, or nobody. Fails closed (r82-security Q2): a portal user
 * never runs as a Pimcore user, an executionUser or the Portal Engine's shared fallback user.
 *
 * Two ways in:
 * - the portal login (the portal firewall's token, via the Portal Engine's SecurityService): that portal user, unless it
 *   is a guest or a public-share user, or the stand-in admin the Portal Engine makes up for Studio previews and its
 *   admin REST calls (it has no id);
 * - an MCP call (PimcoreAgentBundle's /pimcore-mcp, a Studio token): the one portal user whose "pimcoreUser" is the
 *   caller. Nobody when the caller is the shared fallback user (every portal user without its own link points there),
 *   when no portal user is linked (a Studio-only caller) or when more than one is.
 */
class PortalUserContext
{
    // The Pimcore user the Portal Engine links every portal user to that has none of its own (SaveUserSubscriber).
    public const FALLBACK_PIMCORE_USER = 'portal-engine-default-user';

    public function __construct(
        private readonly SecurityService $portalSecurity,
        private readonly TokenStorageInterface $tokenStorage,
    ) {
    }

    public function portalUser(): ?PortalUserInterface
    {
        $user = $this->portalSecurity->getPortalUser();
        if ($user !== null) {
            return self::isRealPortalUser($user) ? $user : null;
        }

        return $this->portalUserOfCaller();
    }

    /** The portal user linked to the Studio caller of an MCP tool, or null (see the class comment). */
    private function portalUserOfCaller(): ?PortalUserInterface
    {
        $caller = $this->tokenStorage->getToken()?->getUser();
        if (!$caller instanceof PimcoreSecurityUser) {
            return null;
        }
        $pimcoreUser = $caller->getUser();
        $id = $pimcoreUser->getId();
        if ($id === null || $pimcoreUser->getName() === self::FALLBACK_PIMCORE_USER) {
            return null;
        }

        $linked = array_values(array_filter($this->linkedPortalUsers($id), self::isRealPortalUser(...)));

        return count($linked) === 1 ? $linked[0] : null;
    }

    /**
     * The portal users whose "pimcoreUser" field is this Pimcore user id.
     *
     * @return PortalUserInterface[]
     */
    protected function linkedPortalUsers(int $pimcoreUserId): array
    {
        return PortalUser::getByPimcoreUser((string) $pimcoreUserId)->getObjects();
    }

    private static function isRealPortalUser(PortalUserInterface $user): bool
    {
        return $user->getId() !== null && !$user->isGuestUser() && !$user->isPortalShareUser();
    }
}
