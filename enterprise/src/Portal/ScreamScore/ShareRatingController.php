<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Portal\ScreamScore;

use Pimcore\Bundle\PortalEngineBundle\Exception\PublicShareExpiredException;
use Pimcore\Bundle\PortalEngineBundle\Service\PublicShare\PublicShareService;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\Portal\Coaster\CoasterFileController;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore\Rides;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore\ScreamScore;
use Pimcore\Controller\FrontendController;
use Pimcore\Model\Asset;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * The scream score for a public share's coaster page, as JSON for the share page's panel:
 * `/studio-example-enterprise/scream-score/{hash}/{assetId}` (config/pimcore/routing.yaml). The ride is always the
 * share's coaster, found here from the share's hash and the asset id, never a ride key sent by the browser.
 *
 * Public like the guest page (the extension adds this route's name to `custom_public_routes`): a share's guest has no
 * portal login. The rules are ScreamScore's, the texts the guest page's (GuestController):
 * - GET: 200 `{"ride": {"key", "name"}, "token"}`, the CSRF token of this ride, in the share page's session (started
 *   here when there is none yet);
 * - POST `{"score", "comment", "passNumber", "passCode", "token"}`: 200 `{"saved": true, "ride", "score", "replaced"}`
 *   with the earlier score or null; 422 `{"errors": {"score"|"comment"|"pass": "<message>"}}`; 429 after too many
 *   wrong tries; 400 for a missing or wrong token or an `Origin` that is not the portal's own (also a missing one);
 * - both: 404 `{"error": "This ride has no scream score"}` for an unknown or expired share, an asset not in the share
 *   or one that is not a coaster. Nothing is stored on any answer but 200.
 * Every answer carries `Cache-Control: no-store`.
 */
class ShareRatingController extends FrontendController
{
    /** The route's name, the one this bundle makes public in Portal Engine. */
    public const ROUTE = 'pimcore_studio_example_enterprise_scream_score_share';

    public const EXPIRED = 'This form has expired. Please try again.';

    public function __construct(
        private readonly ScreamScore $screamScore,
        private readonly Rides $rides,
        private readonly PublicShareService $publicShares,
    ) {
    }

    public function __invoke(Request $request, string $hash, int $assetId): Response
    {
        $ride = $this->shareRide($hash, $assetId);
        if ($ride === null) {
            return self::json(['error' => GuestController::NO_RIDE], Response::HTTP_NOT_FOUND);
        }
        [$key, $name] = $ride;

        if (!$request->isMethod('POST')) {
            // getToken() stores a new token in the session and so starts it when the share page has none yet
            $token = $this->container->get('security.csrf.token_manager')->getToken(self::tokenId($key))->getValue();

            return self::json(['ride' => ['key' => $key, 'name' => $name], 'token' => $token]);
        }

        $body = json_decode($request->getContent(), true);
        $body = is_array($body) ? $body : [];
        $origin = $request->headers->get('Origin');
        // a script on another site (or a request without Origin) may not send for the guest, as ChatAccess::deny()
        if ($origin === null || $origin !== $request->getSchemeAndHttpHost()
            || !$this->isCsrfTokenValid(self::tokenId($key), self::text($body['token'] ?? null))) {
            return self::json(['error' => self::EXPIRED], Response::HTTP_BAD_REQUEST);
        }

        $comment = $body['comment'] ?? null;
        $result = $this->screamScore->rate(
            $key,
            strtoupper(trim(self::text($body['passNumber'] ?? null))),
            trim(self::text($body['passCode'] ?? null)),
            $body['score'] ?? null,
            is_string($comment) ? str_replace("\r\n", "\n", $comment) : $comment,
            $request->getClientIp() ?? 'unknown',
        );
        if (!$result->stored) {
            if (($result->errors['pass'] ?? null) === ScreamScore::REFUSED_LOCKED) {
                return self::json(['error' => GuestController::TOO_MANY_TRIES], Response::HTTP_TOO_MANY_REQUESTS);
            }
            $errors = [];
            if (isset($result->errors['score'])) {
                $errors['score'] = GuestController::NO_SCORE;
            }
            if (isset($result->errors['comment'])) {
                $errors['comment'] = GuestController::LONG_COMMENT;
            }
            if (isset($result->errors['pass'])) {
                // one text for an unknown pass and a wrong code
                $errors['pass'] = GuestController::WRONG_PASS;
            }

            return self::json(['errors' => $errors], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        return self::json(['saved' => true, 'ride' => $name, 'score' => $body['score'], 'replaced' => $result->earlierScore]);
    }

    /**
     * The share's coaster: [ride key, coaster name] when the hash names a share that has not expired, the asset is in
     * it, and it is a ride design the scream score knows; else null.
     *
     * @return array{0: string, 1: string}|null
     */
    private function shareRide(string $hash, int $assetId): ?array
    {
        try {
            $share = $this->publicShares->validateByHash($hash);
        } catch (PublicShareExpiredException|NotFoundHttpException) {
            // an expired share gets the same JSON 404, never the portal's expired page
            return null;
        }
        $asset = Asset::getById($assetId);
        if (!$asset instanceof Asset || !CoasterFileController::isCoasterFilename($asset->getFilename())
            || !$this->publicShares->isElementInPublicShare($share, $asset)) {
            return null;
        }
        $key = substr((string) $asset->getFilename(), 0, -strlen('.coaster'));
        $name = preg_match(ScreamScore::RIDE_PATTERN, $key) === 1 ? $this->rides->name($key) : null;

        return $name === null ? null : [$key, $name];
    }

    /** @param array<string, mixed> $data */
    private static function json(array $data, int $status = Response::HTTP_OK): JsonResponse
    {
        $response = new JsonResponse($data, $status);
        // a CSRF token or a guest's own rating: never kept by a cache
        $response->headers->set('Cache-Control', 'no-store, private');

        return $response;
    }

    private static function text(mixed $value): string
    {
        return is_string($value) ? $value : '';
    }

    /** One token per ride: a token of one coaster cannot be sent for another. */
    private static function tokenId(string $ride): string
    {
        return 'scream-score-share-' . $ride;
    }
}
