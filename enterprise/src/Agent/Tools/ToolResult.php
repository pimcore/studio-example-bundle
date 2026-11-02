<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Agent\Tools;

use Mcp\Schema\Content\TextContent;
use Mcp\Schema\Result\CallToolResult;

/** The JSON text result PimcoreAgentBundle's own tools return, and its error form. */
final class ToolResult
{
    public static function json(array $payload): CallToolResult
    {
        return new CallToolResult([new TextContent(json_encode($payload, JSON_THROW_ON_ERROR))], isError: false);
    }

    public static function error(string $message): CallToolResult
    {
        return new CallToolResult([new TextContent(json_encode(['error' => $message], JSON_THROW_ON_ERROR))], isError: true);
    }
}
