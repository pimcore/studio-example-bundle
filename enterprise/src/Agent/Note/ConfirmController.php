<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Agent\Note;

use Pimcore\Bundle\PortalEngineBundle\Enum\Permission;
use Pimcore\Bundle\PortalEngineBundle\Service\Security\SecurityService;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\Portal\Agent\ChatAccess;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

/**
 * POST /studio-example-enterprise/agent/proposal/{id}/confirm on a portal site: the portal user confirms the Supplier
 * note the agent proposed, and ProposalConfirmer writes it. The request carries only the id; its body is never read.
 *
 * The same gate as the chat route (F127's ChatAccess): JSON 401 without a real portal login, 403 without PORTAL_ACCESS
 * or from another Origin. Not a FrontendController, so a missing login is no redirect to the login page.
 */
class ConfirmController
{
    public function __construct(
        private readonly SecurityService $portalSecurity,
        private readonly AuthorizationCheckerInterface $authorization,
        private readonly ProposalConfirmer $confirmer,
    ) {
    }

    public function __invoke(Request $request, string $id): JsonResponse
    {
        $user = $this->portalSecurity->getPortalUser();
        $denied = ChatAccess::deny(
            $user,
            $user !== null && $this->authorization->isGranted(Permission::PORTAL_ACCESS),
            $request->headers->get('Origin'),
            $request->getSchemeAndHttpHost(),
        );
        if ($denied !== null) {
            return self::json($denied[0], ['error' => $denied[1]]);
        }

        [$status, $body] = $this->confirmer->confirm($user, $id);

        return self::json($status, $body);
    }

    private static function json(int $status, array $body): JsonResponse
    {
        return new JsonResponse($body, $status, ['Cache-Control' => 'no-store']);
    }
}
