<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Portal\Coaster;

use Pimcore\Bundle\PortalEngineBundle\Entity\PublicShare;
use Pimcore\Bundle\PortalEngineBundle\Enum\Permission;
use Pimcore\Bundle\PortalEngineBundle\Exception\PublicShareExpiredException;
use Pimcore\Bundle\PortalEngineBundle\Service\DataPool\DataPoolConfigService;
use Pimcore\Bundle\PortalEngineBundle\Service\PublicShare\PublicShareService;
use Pimcore\Bundle\PortalEngineBundle\Service\Security\SecurityService;
use Pimcore\Controller\FrontendController;
use Pimcore\Model\Asset;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * The text of a .coaster asset, for the portal's coaster preview stage
 * (assets/portal/js/src/coaster/preview-stage/README.md). The portal's own media stream serves video and audio only,
 * and a portal host does not serve the raw asset path, so the stage reads the file here.
 *
 * Routed by config/pimcore/routing.yaml on portal sites only. Portal Engine checks portal access for every frontend
 * controller on a portal site; this action adds the same checks the portal's preview stream makes: access to the
 * data pool given as `dataPoolId`, VIEW on the asset, and for a public share recipient that the asset is in the share.
 *
 * On a public share's page the 3D ride loads its file here too, with `?publicShareHash=`. Portal Engine logs in a
 * share's guest only on its own routes, so this route is public (PimcoreStudioExampleEnterpriseExtension::prepend())
 * and checks the login itself:
 * - a portal user as before: data pool access and VIEW on the asset (a hash is ignored);
 * - else a share's hash: the portal's own share check, as its public share detail does (PublicShare\AssetController):
 *   PublicShareService::validateByHash() and setUpPublicShare(), data pool access, the data pool is one of the share's
 *   and isElementInPublicShare(). No VIEW: for a share's guest it checks the workspaces of the user who made the share
 *   (PermissionService::getOriginUserForPublicShare()), which the share's own pages never ask, so it refused the
 *   share's own coaster (F334);
 * - else 403.
 * A refusal is always 403 or 404, never the login redirect: the 3D ride fetches the file and reads the answer as JSON.
 */
class CoasterFileController extends FrontendController
{
    public const ROUTE = 'pimcore_studio_example_enterprise_coaster_file';

    public function __construct(
        private readonly DataPoolConfigService $dataPoolConfigService,
        private readonly PublicShareService $publicShareService,
        private readonly SecurityService $securityService,
    ) {
    }

    public function __invoke(Request $request, int $id): Response
    {
        $guestShare = $this->logInPortalUserOrShareGuest($request);

        $asset = Asset::getById($id);
        // only ride designs: this route must not become a way round the portal's download permission
        if (!$asset instanceof Asset || !self::isCoasterFilename($asset->getFilename())) {
            throw new NotFoundHttpException(sprintf('No .coaster asset with ID %d', $id));
        }

        $this->dataPoolConfigService->setCurrentDataPoolConfigById($request->query->getInt('dataPoolId'));
        if ($guestShare !== null) {
            $this->denyShareGuestUnlessInShare($guestShare, $request->query->getInt('dataPoolId'), $asset);
        } else {
            $this->denyAccessUnlessGranted(Permission::DATA_POOL_ACCESS);
            $this->denyAccessUnlessGranted(Permission::VIEW, $asset);

            // VIEW passes for every asset of the pool for a share recipient; the share decides (as the preview stream does)
            $user = $this->securityService->getPortalUser();
            if ($user !== null && $user->isPortalShareUser()) {
                $publicShare = $this->publicShareService->getCurrentPublicShare();
                if (!$publicShare || !$this->publicShareService->isElementInPublicShare($publicShare, $asset)) {
                    throw new NotFoundHttpException('Element not in PublicShare.');
                }
            }
        }

        return new Response((string) $asset->getData(), Response::HTTP_OK, [
            'Content-Type' => 'application/json; charset=utf-8',
            'Cache-Control' => 'private, no-cache',
        ]);
    }

    /**
     * What Portal Engine does before a portal page, for this public route: a portal login passes (null), a public
     * share's hash sets up the share's guest (as on the share's own page) and returns the share, anything else is 403.
     *
     * @throws AccessDeniedHttpException without a portal login and without a share hash
     * @return PublicShare|null untyped like PublicShareService::validateByHash()
     *
     * @throws NotFoundHttpException     for an unknown or expired share
     */
    private function logInPortalUserOrShareGuest(Request $request): mixed
    {
        if ($this->isGranted(Permission::PORTAL_ACCESS)) {
            return null;
        }
        $hash = $request->query->getString('publicShareHash');
        if ($hash === '') {
            // not the portal's "invalid login": its firewall would answer the 3D ride's fetch with the login page
            throw new AccessDeniedHttpException('No portal login and no public share.');
        }
        try {
            $publicShare = $this->publicShareService->validateByHash($hash);
        } catch (PublicShareExpiredException) {
            // the same answer as an unknown share: the 3D ride needs no "expired" page
            throw new NotFoundHttpException('PublicShare not found.');
        }
        $this->publicShareService->setUpPublicShare($publicShare);

        return $publicShare;
    }

    /**
     * The checks of the portal's own public share detail for the share's guest: access to the data pool, the pool is
     * one the share holds items of, and the asset is in the share. 403 or 404, never the login redirect.
     *
     * @param PublicShare $publicShare
     */
    private function denyShareGuestUnlessInShare(mixed $publicShare, int $dataPoolId, Asset $asset): void
    {
        if (!$this->isGranted(Permission::DATA_POOL_ACCESS)) {
            throw new AccessDeniedHttpException('No access to the data pool.');
        }
        $sharePools = array_map('intval', $this->publicShareService->getDataPoolConfigIdsByPublicShare($publicShare));
        if (!in_array($dataPoolId, $sharePools, true) || !$this->publicShareService->isElementInPublicShare($publicShare, $asset)) {
            throw new NotFoundHttpException('Element not in PublicShare.');
        }
    }

    /** Whether the file name is a ride design's: it ends in `.coaster`, in any case. */
    public static function isCoasterFilename(?string $filename): bool
    {
        return $filename !== null && str_ends_with(strtolower($filename), '.coaster');
    }
}
