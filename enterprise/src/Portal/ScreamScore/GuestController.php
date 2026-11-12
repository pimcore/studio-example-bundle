<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Portal\ScreamScore;

use Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore\Pimcore\GuestShares;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore\ScreamScore;
use Pimcore\Controller\FrontendController;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * The old guest link of the scream score, `/{_portal_engine_prefix}scream-score/{ride key}` (config/pimcore/routing.yaml),
 * as printed before the guests rated on the coaster's public share (F322, F324). It has no page of its own any more
 * (F326, DR-P142): GET and POST both answer 302 to the ride's current share, GuestShares::guestLink(), so a link
 * handed out earlier, or one from before a reset (new share hash), still leads to the one rating path, the share's.
 *
 * The target is only ever a stored share's link, built with the portal site's domain, never from the request (no
 * open redirect: the ride key only selects a share). A POST stores nothing: this controller has no way to rate.
 * An unknown ride key, or a ride without a share, gets the plain 404 page "This ride has no scream score".
 *
 * The route stays public (the bundle's extension names it in `pimcore_portal_engine.custom_public_routes`), so a guest
 * without a portal login gets the redirect or the 404, never the portal login. The texts below are also the share's
 * rating answers (ShareRatingController).
 */
class GuestController extends FrontendController
{
    /** The route's name, the one this bundle makes public in Portal Engine. */
    public const ROUTE = 'pimcore_studio_example_enterprise_scream_score_guest';

    public const WRONG_PASS = "We don't know this pass number and code. Check the back of your pass.";

    public const TOO_MANY_TRIES = 'Too many tries. Please wait 15 minutes.';

    public const NO_SCORE = 'Choose a score from 1 to 10.';

    public const LONG_COMMENT = 'Keep the comment to 280 characters.';

    public const NO_RIDE = 'This ride has no scream score';

    private const NOT_FOUND = '@PimcoreStudioExampleEnterprise/portal/scream-score/not-found.html.twig';

    public function __construct(private readonly GuestShares $guestShares)
    {
    }

    public function __invoke(Request $request, string $ride): Response
    {
        $link = preg_match(ScreamScore::RIDE_PATTERN, $ride) === 1 ? $this->shareLink($ride) : null;
        if ($link === null) {
            $response = $this->render(self::NOT_FOUND, ['message' => self::NO_RIDE], new Response('', Response::HTTP_NOT_FOUND));
        } else {
            $response = new RedirectResponse($link, Response::HTTP_FOUND);
        }
        // the share's link changes with a reset: never kept by a cache
        $response->headers->set('Cache-Control', 'no-store, private');

        return $response;
    }

    /** The ride's current share link; null without one, also while the demo portal is not set up. */
    private function shareLink(string $ride): ?string
    {
        try {
            return $this->guestShares->guestLink($ride);
        } catch (\RuntimeException) {
            return null;
        }
    }
}
