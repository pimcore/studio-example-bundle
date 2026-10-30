<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo;

/**
 * Turns the brief (demo-data/brief.md) into the HTML of the portal's WYSIWYG brick. Covers only the Markdown the brief
 * uses: headings, paragraphs, "- " lists (continuation lines indented) and **bold**. Everything else is escaped text.
 */
final class BriefHtml
{
    public static function fromMarkdown(string $markdown): string
    {
        $html = [];
        $paragraph = [];
        $list = [];
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

    private static function inline(string $text): string
    {
        $escaped = htmlspecialchars($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        return preg_replace('/\*\*(.+?)\*\*/', '<strong>$1</strong>', $escaped);
    }
}
