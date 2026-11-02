<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Portal\Agent;

use Pimcore\Bundle\StudioExampleEnterpriseBundle\Agent\KingdomBriefTools;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\Agent\NoPortalUserException;

/**
 * Plays a recorded agent turn as PimcoreAgentBundle's own AgentEvents (agent-server src/types/events.ts on 2026.3):
 * system-notice{messageKey: "recorded"}, turn-started, text-delta (several), widget{widgetType:
 * "kingdom-supplier-note"}, turn-ended and complete, each with the `ts` the agent-server's writeSse() adds.
 *
 * Only the text is recorded (demo-data/agent/*.replay.json). The tool steps call F126's KingdomBriefTools for the
 * signed-in portal user, and the text's {placeholders} are filled from their results, so the answer shows the real
 * permission filter and the widget carries a real, stored proposal id. A question the file does not hold gets one fixed
 * reply. No model, no network.
 */
class ReplayPlayer
{
    public const WIDGET_TYPE = 'kingdom-supplier-note';

    public const DEFAULT_REPLAY = 'demo-data/agent/kingdom-brief-check.replay.json';

    private const NOTICE_KEY = 'recorded';

    private readonly array $replay;

    private bool $textStarted = false;

    /** @var \Closure(int): void */
    private readonly \Closure $sleepMs;

    /** @var \Closure(): int */
    private readonly \Closure $nowMs;

    /** @var \Closure(): string */
    private readonly \Closure $newId;

    /**
     * @param string|null               $replayFile the recording; by default this bundle's demo-data/agent one
     * @param (\Closure(int): void)|null $sleepMs waits so many milliseconds; the tests pass a fake clock
     * @param (\Closure(): int)|null     $nowMs   the time in Unix milliseconds, for each event's `ts`
     * @param (\Closure(): string)|null  $newId   the turn's message id
     */
    public function __construct(
        private readonly KingdomBriefTools $tools,
        ?string $replayFile = null,
        ?\Closure $sleepMs = null,
        ?\Closure $nowMs = null,
        ?\Closure $newId = null,
    ) {
        $replayFile ??= dirname(__DIR__, 3) . '/' . self::DEFAULT_REPLAY;
        $this->replay = json_decode((string) file_get_contents($replayFile), true, 512, JSON_THROW_ON_ERROR);
        $this->sleepMs = $sleepMs ?? static function (int $ms): void { usleep($ms * 1000); };
        $this->nowMs = $nowMs ?? static fn (): int => (int) floor(microtime(true) * 1000);
        $this->newId = $newId ?? static fn (): string => bin2hex(random_bytes(16));
    }

    /** @return list<string> the questions the replay answers */
    public function questions(): array
    {
        return array_merge(...array_map(static fn (array $turn) => $turn['questions'], $this->replay['turns']));
    }

    /**
     * Plays the turn recorded for this question (or the fixed reply) and hands every event to $emit, in order.
     *
     * @param \Closure(array<string, mixed>): void $emit
     */
    public function play(string $question, \Closure $emit): void
    {
        $this->textStarted = false;
        $send = function (array $event) use ($emit): void {
            $emit($event + ['ts' => ($this->nowMs)()]);
        };
        $send(['type' => 'system-notice', 'messageKey' => self::NOTICE_KEY]);
        $send(['type' => 'turn-started', 'messageId' => ($this->newId)(), 'agentName' => $this->replay['agentName']]);

        $turn = $this->turnFor($question);
        $vars = ['briefLimitM' => self::number($this->replay['briefLimitM'])];
        $status = 'completed';
        if ($turn === null) {
            $vars['questions'] = implode(' / ', $this->questions());
            $this->text($this->replay['unknownQuestion']['text'], $vars, $send);
        } else {
            $state = [];
            foreach ($turn['steps'] as $step) {
                if (isset($step['if']) && !$this->holds($step['if'], $state)) {
                    continue;
                }
                if (isset($step['tool'])) {
                    ($this->sleepMs)($this->replay['toolDelayMs']);
                    $state = $this->callTool($step['tool'], $state);
                    $vars = $this->vars($state) + $vars;
                } elseif (isset($step['text'])) {
                    $this->text($step['text'], $vars, $send);
                } elseif (isset($step['propose'])) {
                    ($this->sleepMs)($this->replay['toolDelayMs']);
                    if (!$this->propose(self::fill($step['propose'], $vars), $state, $send)) {
                        $status = 'failed';
                        break;
                    }
                }
            }
        }

        $send(['type' => 'turn-ended', 'status' => $status]);
        $send(['type' => 'complete']);
    }

    private function turnFor(string $question): ?array
    {
        $asked = self::normalize($question);
        foreach ($this->replay['turns'] as $turn) {
            foreach ($turn['questions'] as $recorded) {
                if (self::normalize($recorded) === $asked) {
                    return $turn;
                }
            }
        }

        return null;
    }

    /** Case, runs of spaces and the final punctuation do not matter. */
    private static function normalize(string $question): string
    {
        return rtrim(preg_replace('~\s+~u', ' ', mb_strtolower(trim($question))), ' ?!.');
    }

    private function callTool(string $tool, array $state): array
    {
        return match ($tool) {
            'kingdom_read_brief' => $state + ['brief' => $this->tools->readBrief()],
            'kingdom_list_revisions' => ['revisions' => $this->tools->listRevisions()] + $state,
            default => throw new \UnexpectedValueException(sprintf('The replay calls an unknown tool "%s".', $tool)),
        };
    }

    /** The latest revision the user may view: the highest revision number, the first one listed on a tie. */
    private static function latest(array $state): ?array
    {
        $latest = null;
        foreach ($state['revisions'] ?? [] as $revision) {
            if ($latest === null || $revision['revision'] > $latest['revision']) {
                $latest = $revision;
            }
        }

        return $latest;
    }

    private function holds(string $condition, array $state): bool
    {
        $latest = self::latest($state);
        $above = $latest !== null && $latest['maxHeightM'] !== null && $latest['maxHeightM'] > $this->replay['briefLimitM'];

        return match ($condition) {
            'hasRevisions' => $latest !== null,
            'noRevisions' => $latest === null,
            'latestAboveLimit' => $above,
            'latestWithinLimit' => $latest !== null && !$above,
            default => throw new \UnexpectedValueException(sprintf('The replay has an unknown condition "%s".', $condition)),
        };
    }

    private function vars(array $state): array
    {
        $revisions = $state['revisions'] ?? [];
        $latest = self::latest($state);
        $height = static fn (array $r) => $r['maxHeightM'] === null ? 'height unknown' : self::number($r['maxHeightM']) . ' m';

        return array_filter([
            'revisionCount' => (string) count($revisions),
            'revisionList' => implode(', ', array_map(static fn (array $r) => sprintf('revision %d (%s)', $r['revision'], $height($r)), $revisions)),
            'latest.revision' => $latest === null ? null : (string) $latest['revision'],
            'latest.maxHeightM' => $latest['maxHeightM'] ?? null ? self::number($latest['maxHeightM']) : null,
            'overLimitM' => $latest['maxHeightM'] ?? null ? self::number(max(0, $latest['maxHeightM'] - $this->replay['briefLimitM'])) : null,
        ], static fn ($v) => $v !== null);
    }

    /** Proposes the note on the latest revision and sends the widget; false (and an error event) when refused. */
    private function propose(string $text, array $state, \Closure $send): bool
    {
        $latest = self::latest($state);
        try {
            $proposal = $this->tools->proposeSupplierNote($latest['assetId'], $latest['revision'], $text);
        } catch (NoPortalUserException|\InvalidArgumentException) {
            $send(['type' => 'error', 'message' => 'The Supplier note could not be prepared.']);

            return false;
        }
        $send(['type' => 'widget', 'widgetType' => self::WIDGET_TYPE, 'data' => [
            'proposalId' => $proposal['proposalId'],
            'assetId' => $latest['assetId'],
            'revision' => $latest['revision'],
            'text' => $text,
            'expiresInSeconds' => $proposal['expiresInSeconds'],
        ]]);

        return true;
    }

    /** Streams the text in deltas of a few words, a short pause before each next delta of the turn. */
    private function text(string $template, array $vars, \Closure $send): void
    {
        $words = preg_split('~(?<=\s)~u', self::fill($template, $vars), -1, PREG_SPLIT_NO_EMPTY);
        foreach (array_chunk($words, max(1, (int) $this->replay['chunkWords'])) as $chunk) {
            if ($this->textStarted) {
                ($this->sleepMs)($this->replay['chunkDelayMs']);
            }
            $this->textStarted = true;
            $send(['type' => 'text-delta', 'text' => implode('', $chunk)]);
        }
    }

    private static function fill(string $template, array $vars): string
    {
        return preg_replace_callback('~\{([A-Za-z.]+)\}~', static function (array $m) use ($vars): string {
            if (!array_key_exists($m[1], $vars)) {
                throw new \UnexpectedValueException(sprintf('The replay uses {%s} before a tool gave it.', $m[1]));
            }

            return $vars[$m[1]];
        }, $template);
    }

    private static function number(float|int $value): string
    {
        return rtrim(rtrim(number_format((float) $value, 1, '.', ''), '0'), '.');
    }
}
