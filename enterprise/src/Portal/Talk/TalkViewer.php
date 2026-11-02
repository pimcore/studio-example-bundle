<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Portal\Talk;

/**
 * Where the portal page "Talk" loads the slide viewer from, and whether the default viewer is installed.
 *
 * The default URL points into this bundle's public dir as `assets:install` publishes it. When its file is missing the
 * frame would load a 404, which Portal Engine answers on a portal site with an error page of its own; the page shows
 * a notice instead. A URL set with PORTAL_TALK_VIEWER_URL is not checked: it may live on another host.
 */
class TalkViewer
{
    /** Where `assets:install` publishes this bundle's public dir. */
    public const PUBLIC_URL_PREFIX = '/bundles/pimcorestudioexampleenterprise/';

    /** The install step, as the README's How to run and the runbook word it. */
    public const INSTALL_STEP = 'Copy the built talk.html to public/talk/talk.html of the enterprise bundle and run bin/console assets:install.';

    private readonly string $publicDir;

    public function __construct(
        private readonly string $viewerUrl,
        private readonly string $defaultViewerUrl,
        ?string $publicDir = null,
    ) {
        $this->publicDir = $publicDir ?? dirname(__DIR__, 3) . '/public';
    }

    public function getUrl(): string
    {
        return $this->viewerUrl;
    }

    /**
     * The file the default viewer URL is served from, or null when that URL is not under this bundle's public dir.
     */
    public function defaultViewerFile(): ?string
    {
        if (!str_starts_with($this->defaultViewerUrl, self::PUBLIC_URL_PREFIX)) {
            return null;
        }

        $relative = substr((string) parse_url($this->defaultViewerUrl, PHP_URL_PATH), strlen(self::PUBLIC_URL_PREFIX));

        return $this->publicDir . '/' . $relative;
    }

    /**
     * True when the default viewer URL is in use and its file is not in this bundle's public dir.
     */
    public function isMissing(): bool
    {
        if ($this->viewerUrl !== $this->defaultViewerUrl) {
            return false;
        }

        $file = $this->defaultViewerFile();

        return $file !== null && !is_file($file);
    }
}
