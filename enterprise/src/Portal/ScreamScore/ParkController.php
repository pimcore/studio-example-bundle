<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Portal\ScreamScore;

use Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore\Rides;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore\ScreamScore;
use Pimcore\Controller\FrontendController;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * The park's page of the scream score: what the guests said about each coaster, for the Pimcore Kingdom staff. Three
 * routes of config/pimcore/routing.yaml, all behind the portal login, server-rendered like the guest page:
 * - `/{_portal_engine_prefix}scream-scores`: one row per coaster with its average ("7.4 / 10"), the number of ratings
 *   and the guest link to copy, or "No ratings yet";
 * - `/{_portal_engine_prefix}scream-scores/{ride key}`: the coaster's 5 newest visible comments with score and date
 *   (never a pass number), each with "Hide"; how many are hidden, and under "Show hidden (n)" each with "Show again";
 * - POST `/{_portal_engine_prefix}scream-scores/{feedback id}/visibility`: hides or shows one comment, then 303 back
 *   to the coaster's page (Post/Redirect/Get).
 *
 * Only park staff (StaffAccess, by the portal user group) get further than 403. A POST without a valid CSRF token gets
 * 400; an unknown ride key or an id that is no rating gets 404. None of them changes anything. Every number and every
 * change comes from ScreamScore: a hidden comment still counts in the average and the count.
 */
class ParkController extends FrontendController
{
    public const ROUTE_OVERVIEW = 'pimcore_studio_example_enterprise_scream_score_park';

    public const ROUTE_RIDE = 'pimcore_studio_example_enterprise_scream_score_park_ride';

    public const ROUTE_VISIBILITY = 'pimcore_studio_example_enterprise_scream_score_park_visibility';

    public const NOT_STAFF = 'Only park staff can see the scream scores.';

    public const NO_RIDE = 'There is no such coaster.';

    public const NO_FEEDBACK = 'There is no such rating.';

    public const EXPIRED = 'This page has expired. Go back, reload it and try again.';

    /** One token for the staff's hide and show buttons. */
    public const TOKEN_ID = 'scream-score-park';

    private const TEMPLATES = '@PimcoreStudioExampleEnterprise/portal/scream-score/';

    public function __construct(
        private readonly ScreamScore $screamScore,
        private readonly Rides $rides,
        private readonly StaffAccess $staffAccess,
    ) {
    }

    /** One controller for the three routes: the route's own parameters say which page it is. */
    public function __invoke(Request $request, ?string $ride = null, ?string $id = null): Response
    {
        if (!$this->staffAccess->allows()) {
            return $this->refuse(self::NOT_STAFF, Response::HTTP_FORBIDDEN);
        }
        if ($id !== null) {
            return $this->visibility($request, $id);
        }
        if ($ride !== null) {
            return $this->ride($request, $ride);
        }

        return $this->overview($request);
    }

    private function overview(Request $request): Response
    {
        $coasters = [];
        foreach ($this->rides->all() as $key => $name) {
            $summary = $this->screamScore->summary($key);
            $coasters[] = [
                'key' => $key,
                'name' => $name,
                'average' => $summary['average'] === null ? null : number_format($summary['average'], 1, '.', ''),
                'count' => $summary['count'],
                'link' => $request->getSchemeAndHttpHost() . self::path($request, 'scream-score/' . rawurlencode($key)),
                'page' => self::path($request, 'scream-scores/' . rawurlencode($key)),
            ];
        }

        return $this->answer('park.html.twig', ['coasters' => $coasters]);
    }

    private function ride(Request $request, string $ride): Response
    {
        $name = preg_match(ScreamScore::RIDE_PATTERN, $ride) === 1 ? $this->rides->name($ride) : null;
        if ($name === null) {
            return $this->refuse(self::NO_RIDE, Response::HTTP_NOT_FOUND);
        }
        $summary = $this->screamScore->summary($ride);

        return $this->answer('park-ride.html.twig', [
            'coasterName' => $name,
            'average' => $summary['average'] === null ? null : number_format($summary['average'], 1, '.', ''),
            'count' => $summary['count'],
            'comments' => $summary['comments'],
            'hidden' => $this->screamScore->hidden($ride),
            'overview' => self::path($request, 'scream-scores'),
            // the template appends `<feedback id>/visibility`
            'actionBase' => self::path($request, 'scream-scores/'),
            'token' => $this->container->get('security.csrf.token_manager')->getToken(self::TOKEN_ID)->getValue(),
        ]);
    }

    private function visibility(Request $request, string $id): Response
    {
        if (!$request->isMethod('POST')) {
            return $this->refuse(self::EXPIRED, Response::HTTP_METHOD_NOT_ALLOWED);
        }
        if (!$this->isCsrfTokenValid(self::TOKEN_ID, (string) $request->request->get('_token', ''))) {
            return $this->refuse(self::EXPIRED, Response::HTTP_BAD_REQUEST);
        }
        // Only a rating the store knows (in the demo: a GuestFeedback under /Pimcore Kingdom/Guest feedback/).
        $ride = ctype_digit($id) ? $this->screamScore->rideOf((int) $id) : null;
        if ($ride === null) {
            return $this->refuse(self::NO_FEEDBACK, Response::HTTP_NOT_FOUND);
        }
        if ($request->request->get('visible') === '1') {
            $this->screamScore->show((int) $id);
        } else {
            $this->screamScore->hide((int) $id);
        }

        return new RedirectResponse(self::path($request, 'scream-scores/' . rawurlencode($ride)), Response::HTTP_SEE_OTHER);
    }

    /** A path on this portal: `/_scream-scores` on a one-language portal, `/en/scream-scores` with a language prefix. */
    private static function path(Request $request, string $page): string
    {
        return '/' . (string) $request->attributes->get('_portal_engine_prefix', '_') . $page;
    }

    private function refuse(string $message, int $status): Response
    {
        return $this->answer('park.html.twig', ['coasters' => [], 'refused' => $message], $status);
    }

    /** @param array<string, mixed> $parameters */
    private function answer(string $template, array $parameters, int $status = Response::HTTP_OK): Response
    {
        $response = $this->render(self::TEMPLATES . $template, $parameters + ['refused' => null], new Response('', $status));
        // staff data with a CSRF token: never kept by a cache
        $response->headers->set('Cache-Control', 'no-store, private');

        return $response;
    }
}
