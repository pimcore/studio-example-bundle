<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Portal\Agent;

use Pimcore\Bundle\PortalEngineBundle\Enum\Permission;
use Pimcore\Bundle\PortalEngineBundle\Service\Security\SecurityService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

/**
 * POST /studio-example-enterprise/agent/chat on a portal site ({"message": "..."}): the portal user's agent turn as a
 * text/event-stream of PimcoreAgentBundle AgentEvents, one `data:` line each, as the agent-server's writeSse() sends
 * them. The turn is a recording (ReplayPlayer); going live later changes only the URL the portal calls.
 *
 * Not a FrontendController on purpose: Portal Engine's SecuritySubscriber would answer a missing login with its
 * AuthenticationException, which the portal firewall turns into a redirect to the login page. A script needs JSON
 * 401/403 instead, so this action makes the same PORTAL_ACCESS check itself (ChatAccess).
 */
class AgentChatController
{
    public const MAX_MESSAGE_LENGTH = 2000;

    public function __construct(
        private readonly SecurityService $portalSecurity,
        private readonly AuthorizationCheckerInterface $authorization,
        private readonly ReplayPlayer $player,
    ) {
    }

    public function __invoke(Request $request): Response
    {
        $user = $this->portalSecurity->getPortalUser();
        $denied = ChatAccess::deny(
            $user,
            $user !== null && $this->authorization->isGranted(Permission::PORTAL_ACCESS),
            $request->headers->get('Origin'),
            $request->getSchemeAndHttpHost(),
        );
        if ($denied !== null) {
            return self::error($denied[0], $denied[1]);
        }

        $body = json_decode($request->getContent(), true);
        $message = is_array($body) && is_string($body['message'] ?? null) ? trim($body['message']) : '';
        if ($message === '' || mb_strlen($message) > self::MAX_MESSAGE_LENGTH) {
            return self::error(Response::HTTP_BAD_REQUEST, sprintf('Send {"message": "..."} with 1 to %d characters.', self::MAX_MESSAGE_LENGTH));
        }

        // The stream takes a few seconds; the session lock would hold every other portal request of the user meanwhile.
        if ($request->hasSession() && $request->getSession()->isStarted()) {
            $request->getSession()->save();
        }

        return new StreamedResponse(function () use ($message): void {
            $this->player->play($message, static function (array $event): void {
                echo 'data: ' . json_encode($event, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n\n";
                if (ob_get_level() > 0) {
                    ob_flush();
                }
                flush();
            });
        }, Response::HTTP_OK, [
            'Content-Type' => 'text/event-stream; charset=utf-8',
            'Cache-Control' => 'no-cache, private',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    private static function error(int $status, string $message): JsonResponse
    {
        return new JsonResponse(['error' => $message], $status, ['Cache-Control' => 'no-store']);
    }
}
