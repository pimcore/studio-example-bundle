<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Portal\ScreamScore;

use Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore\Rides;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore\ScreamScore;
use Pimcore\Controller\FrontendController;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * The guest page of the scream score: one public link per coaster, `/{_portal_engine_prefix}scream-score/{ride key}`
 * (config/pimcore/routing.yaml). An annual-pass guest opens it on the phone, without a portal login, and sends a score
 * from 1 to 10, an optional comment, the pass number and the pass code. A server-rendered page with a plain HTML form:
 * no portal navigation, no plugin JavaScript, no data pool.
 *
 * Portal Engine asks for a portal login on every page of a portal site except its public routes; the bundle's
 * extension adds this route's name to `pimcore_portal_engine.custom_public_routes` (prepend()). The rules (pass
 * first, one rating per pass and ride, lockout after 5 wrong tries) are ScreamScore's; this page only turns the form
 * into a call and the result into an answer:
 * - GET: the form, or once after a send the thanks page;
 * - POST, valid: 303 back to the same link, which then shows the thanks page (Post/Redirect/Get);
 * - POST, wrong fields: 422 with the form, what was typed and one message per field; too many tries: 429;
 * - POST without a valid CSRF token (an expired form): 400 with a fresh form; an unknown ride: 404. Neither stores anything.
 */
class GuestController extends FrontendController
{
    /** The route's name, the one this bundle makes public in Portal Engine. */
    public const ROUTE = 'pimcore_studio_example_enterprise_scream_score_guest';

    public const WRONG_PASS = "We don't know this pass number and code. Check the back of your pass.";

    public const TOO_MANY_TRIES = 'Too many tries. Please wait 15 minutes.';

    public const NO_SCORE = 'Choose a score from 1 to 10.';

    public const LONG_COMMENT = 'Keep the comment to 280 characters.';

    public const EXPIRED = 'This form has expired. Please send it again.';

    public const NO_RIDE = 'This ride has no scream score';

    /** What the lowest and the highest score mean. */
    public const SCORE_LABELS = [ScreamScore::MIN_SCORE => 'barely a squeak', ScreamScore::MAX_SCORE => 'lost my voice'];

    private const TEMPLATES = '@PimcoreStudioExampleEnterprise/portal/scream-score/';

    /** Where the thanks of the last send wait in the session for the redirected GET, per ride. */
    private const THANKS_KEY = 'studio_example_enterprise_scream_score_thanks_';

    public function __construct(private readonly ScreamScore $screamScore, private readonly Rides $rides)
    {
    }

    public function __invoke(Request $request, string $ride): Response
    {
        $coasterName = preg_match(ScreamScore::RIDE_PATTERN, $ride) === 1 ? $this->rides->name($ride) : null;
        if ($coasterName === null) {
            return $this->answer('not-found.html.twig', ['message' => self::NO_RIDE], Response::HTTP_NOT_FOUND);
        }

        if (!$request->isMethod('POST')) {
            $thanks = $request->hasSession() ? $request->getSession()->remove(self::THANKS_KEY . $ride) : null;
            if (is_array($thanks)) {
                return $this->answer('guest-thanks.html.twig', [
                    'coasterName' => $coasterName,
                    'message' => self::thanksMessage($coasterName, (int) $thanks['score'], $thanks['earlier'] ?? null),
                    'comment' => $thanks['comment'] ?? null,
                ]);
            }

            return $this->form($ride, $coasterName);
        }

        $typed = self::typed($request);
        if (!$this->isCsrfTokenValid(self::tokenId($ride), (string) $request->request->get('_token', ''))) {
            return $this->form($ride, $coasterName, $typed, [], self::EXPIRED, Response::HTTP_BAD_REQUEST);
        }

        $result = $this->screamScore->rate(
            $ride,
            strtoupper($typed['passNumber']),
            $typed['passCode'],
            self::score($typed['score']),
            $typed['comment'],
            $request->getClientIp() ?? 'unknown',
        );
        if (!$result->stored) {
            $errors = [];
            $status = Response::HTTP_UNPROCESSABLE_ENTITY;
            if (isset($result->errors['score'])) {
                $errors['score'] = self::NO_SCORE;
            }
            if (isset($result->errors['comment'])) {
                $errors['comment'] = self::LONG_COMMENT;
            }
            if (isset($result->errors['pass'])) {
                $locked = $result->errors['pass'] === ScreamScore::REFUSED_LOCKED;
                $errors['pass'] = $locked ? self::TOO_MANY_TRIES : self::WRONG_PASS;
                $status = $locked ? Response::HTTP_TOO_MANY_REQUESTS : $status;
                // a wrong code is not shown again; a right one stays while the guest fixes another field
                $typed['passCode'] = '';
            }

            return $this->form($ride, $coasterName, $typed, $errors, null, $status);
        }

        $request->getSession()->set(self::THANKS_KEY . $ride, [
            'score' => self::score($typed['score']),
            'earlier' => $result->earlierScore,
            'comment' => $typed['comment'] === '' ? null : $typed['comment'],
        ]);

        return new RedirectResponse($request->getRequestUri(), Response::HTTP_SEE_OTHER);
    }

    /** "Thanks! Your scream score 8 for Thunder Loop is saved.", after a replace with "It replaces your earlier score 6." */
    public static function thanksMessage(string $coasterName, int $score, ?int $earlierScore): string
    {
        $message = sprintf('Thanks! Your scream score %d for %s is saved.', $score, $coasterName);

        return $earlierScore === null ? $message : $message . sprintf(' It replaces your earlier score %d.', $earlierScore);
    }

    /**
     * @param array{score: string, comment: string, passNumber: string, passCode: string} $typed
     * @param array<string, string>                                                      $errors field => message
     */
    private function form(string $ride, string $coasterName, array $typed = ['score' => '', 'comment' => '', 'passNumber' => '', 'passCode' => ''], array $errors = [], ?string $notice = null, int $status = Response::HTTP_OK): Response
    {
        $scores = [];
        for ($score = ScreamScore::MIN_SCORE; $score <= ScreamScore::MAX_SCORE; $score++) {
            $scores[] = ['value' => $score, 'label' => self::SCORE_LABELS[$score] ?? null];
        }
        $chosen = self::score($typed['score']);

        return $this->answer('guest.html.twig', [
            'coasterName' => $coasterName,
            'scores' => $scores,
            'chosenScore' => is_int($chosen) && $chosen >= ScreamScore::MIN_SCORE && $chosen <= ScreamScore::MAX_SCORE ? $chosen : null,
            'typed' => $typed,
            'errors' => $errors,
            'notice' => $notice,
            'maxComment' => ScreamScore::MAX_COMMENT_LENGTH,
            'token' => $this->container->get('security.csrf.token_manager')->getToken(self::tokenId($ride))->getValue(),
        ], $status);
    }

    /** @param array<string, mixed> $parameters */
    private function answer(string $template, array $parameters, int $status = Response::HTTP_OK): Response
    {
        $response = $this->render(self::TEMPLATES . $template, $parameters, new Response('', $status));
        // a form with a CSRF token, or a guest's own thanks: never kept by a cache
        $response->headers->set('Cache-Control', 'no-store, private');

        return $response;
    }

    /**
     * The form's fields as typed, trimmed, the comment's line breaks as browsers count them on screen (a textarea
     * sends "\r\n", which would count twice against the 280 characters). The pass number is checked in capitals.
     *
     * @return array{score: string, comment: string, passNumber: string, passCode: string}
     */
    private static function typed(Request $request): array
    {
        $field = static fn (string $name): string => (string) $request->request->get($name, '');

        return [
            'score' => trim($field('score')),
            'comment' => str_replace("\r\n", "\n", $field('comment')),
            'passNumber' => trim($field('passNumber')),
            'passCode' => trim($field('passCode')),
        ];
    }

    /** The score as ScreamScore takes it: an int for whole digits, else what was sent (null when empty), to be refused. */
    private static function score(string $typed): int|string|null
    {
        if ($typed === '') {
            return null;
        }

        return ctype_digit($typed) && strlen($typed) <= 2 ? (int) $typed : $typed;
    }

    /** One token per ride: a form of one coaster cannot be sent for another. */
    private static function tokenId(string $ride): string
    {
        return 'scream-score-' . $ride;
    }
}
