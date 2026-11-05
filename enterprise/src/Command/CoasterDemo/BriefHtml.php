<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo;

/**
 * Turns the brief (demo-data/brief.md) and the content pages (demo-data/pages/*.md) into the HTML of the portal's
 * WYSIWYG brick. Covers only the Markdown they use: headings, paragraphs, "- " lists (continuation lines indented),
 * **bold**, and image lines (F160): `![alt](file.svg)` or `![alt](file.webp "credit")` on a line of its own becomes a
 * <figure> with the <img> and, only with a credit, a <figcaption>. Everything else is escaped text.
 */
final class BriefHtml
{
    // An image line: alt, file and an optional "credit", nothing else on the line.
    public const IMAGE_LINE = '/^\s*!\[([^\]]*)\]\(\s*([^\s)"]+)(?:\s+"([^"]*)")?\s*\)\s*$/';

    /**
     * @param ?callable(string $file): array{src: string, width: int, height: int} $image resolves an image line's file
     *        to its URL and size; it throws for a file it does not have. Without it, an image line fails.
     */
    public static function fromMarkdown(string $markdown, ?callable $image = null): string
    {
        $html = [];
        $paragraph = [];
        $list = [];
        $images = 0;
        $flush = static function () use (&$html, &$paragraph, &$list): void {
            if ($paragraph !== []) {
                $html[] = '<p>' . self::inline(implode(' ', $paragraph)) . '</p>';
                $paragraph = [];
            }
            if ($list !== []) {
                $html[] = '<ul>' . implode('', array_map(static fn (string $item) => '<li>' . self::inline($item) . '</li>', $list)) . '</ul>';
                $list = [];
            }
        };

        foreach (preg_split('/\R/', $markdown) as $line) {
            if (trim($line) === '') {
                $flush();
            } elseif (preg_match(self::IMAGE_LINE, $line, $match)) {
                $flush();
                $html[] = self::figure($match[1], $match[2], $match[3] ?? '', $images++ === 0, $image);
            } elseif (preg_match('/^(#{1,6})\s+(.*)$/', $line, $heading)) {
                $flush();
                $level = strlen($heading[1]);
                $html[] = "<h{$level}>" . self::inline(trim($heading[2])) . "</h{$level}>";
            } elseif (preg_match('/^[-*]\s+(.*)$/', $line, $item)) {
                if ($paragraph !== []) {
                    $flush();
                }
                $list[] = trim($item[1]);
            } elseif ($list !== [] && preg_match('/^\s+\S/', $line)) {
                $list[count($list) - 1] .= ' ' . trim($line);
            } else {
                if ($list !== []) {
                    $flush();
                }
                $paragraph[] = trim($line);
            }
        }
        $flush();

        return implode("\n", $html);
    }

    /** @return string[] the files the Markdown's image lines name, each once, in their order */
    public static function images(string $markdown): array
    {
        $files = [];
        foreach (preg_split('/\R/', $markdown) as $line) {
            if (preg_match(self::IMAGE_LINE, $line, $match) && !in_array($match[2], $files, true)) {
                $files[] = $match[2];
            }
        }

        return $files;
    }

    /**
     * The image's width and height from the file itself, so the page does not jump while it loads: an SVG's viewBox
     * (or its width and height), a WebP's header; [0, 0] if it has neither.
     *
     * @return array{int, int}
     */
    public static function imageSize(string $content): array
    {
        if (str_starts_with($content, 'RIFF') && substr($content, 8, 4) === 'WEBP') {
            $chunk = substr($content, 12, 4);
            $byte = static fn (int $offset): int => ord($content[$offset] ?? "\0");
            if ($chunk === 'VP8X') {
                return [1 + ($byte(24) | $byte(25) << 8 | $byte(26) << 16), 1 + ($byte(27) | $byte(28) << 8 | $byte(29) << 16)];
            }
            if ($chunk === 'VP8L') {
                return [1 + ($byte(21) | ($byte(22) & 0x3f) << 8), 1 + ($byte(22) >> 6 | $byte(23) << 2 | ($byte(24) & 0x0f) << 10)];
            }
            if ($chunk === 'VP8 ') {
                return [($byte(26) | $byte(27) << 8) & 0x3fff, ($byte(28) | $byte(29) << 8) & 0x3fff];
            }

            return [0, 0];
        }
        if (preg_match('/<svg\b[^>]*>/is', $content, $svg)) {
            $attribute = static fn (string $name): ?string => preg_match('/\s' . $name . '\s*=\s*["\']([^"\']*)["\']/i', $svg[0], $m) ? trim($m[1]) : null;
            $viewBox = preg_split('/[\s,]+/', $attribute('viewBox') ?? '');
            if (count($viewBox) === 4 && is_numeric($viewBox[2]) && is_numeric($viewBox[3])) {
                return [(int) round((float) $viewBox[2]), (int) round((float) $viewBox[3])];
            }
            $width = (float) ($attribute('width') ?? 0);
            $height = (float) ($attribute('height') ?? 0);

            return [(int) round($width), (int) round($height)];
        }

        return [0, 0];
    }

    private static function figure(string $alt, string $file, string $credit, bool $hero, ?callable $image): string
    {
        if (trim($alt) === '') {
            throw new \RuntimeException(sprintf('The image line for %s has no alt text: write ![what it shows](%s).', $file, $file));
        }
        if ($image === null) {
            throw new \RuntimeException(sprintf('The image %s cannot be shown here: this text takes no images.', $file));
        }
        ['src' => $src, 'width' => $width, 'height' => $height] = $image($file);
        $attr = static fn (string $value): string => htmlspecialchars($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        // The hero (the page's first image) loads at once; the others when they come into view.
        $img = sprintf('<img src="%s" alt="%s" width="%d" height="%d"%s style="max-width:100%%;height:auto">',
            $attr($src), $attr(trim($alt)), $width, $height, $hero ? '' : ' loading="lazy"');
        $caption = trim($credit) === '' ? '' : '<figcaption>' . self::inline(trim($credit)) . '</figcaption>';

        return '<figure>' . $img . $caption . '</figure>';
    }

    private static function inline(string $text): string
    {
        $escaped = htmlspecialchars($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        return preg_replace('/\*\*(.+?)\*\*/', '<strong>$1</strong>', $escaped);
    }
}
