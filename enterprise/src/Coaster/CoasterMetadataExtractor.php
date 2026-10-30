<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Coaster;

/**
 * Coaster metadata: max height, track length, inversions, top speed and ride duration of a valid .coaster file
 * (assets/shared/coaster/FORMAT.md). The PHP port of assets/shared/coaster/metadata/metadata.ts, line for line with the
 * same constants, so the server needs no Node; both are checked against demo-data/expected-metadata.json.
 * Pure and deterministic: the same document always gives the same values. Simple physics on purpose.
 */
class CoasterMetadataExtractor
{
    public const UNITS = ['maxHeight' => 'm', 'length' => 'm', 'inversions' => '', 'topSpeed' => 'km/h', 'duration' => 's'];

    public const GRAVITY = 9.81; // m/s²

    public const STATION_SPEED = 2; // m/s through a station platform

    public const CHAIN_SPEED = 3; // m/s up a lift hill

    public const BRAKE_SPEED = 5; // m/s along a brake run

    public const MIN_CRUISE_SPEED = 5; // m/s: the slowest the train rides any other element

    /**
     * The five values of a valid .coaster document (decoded with json_decode(); validate it first with CoasterValidator).
     *
     * @return array{maxHeight: float, length: float, inversions: int, topSpeed: float, duration: int}
     */
    public function extract(\stdClass $design): array
    {
        // Walk the track: the height above the station after each element, and the highest point reached.
        $level = 0;
        $maxHeight = 0;
        $maxDrop = 0;
        foreach ($design->track as $element) {
            if ($element->type === 'liftHill') {
                $level += $element->height;
            }
            if ($element->type === 'drop') {
                $maxDrop = max($maxDrop, $element->height);
                $level = max(0, $level - $element->height); // the track cannot go below the ground
            }
            $peak = match ($element->type) {
                'loop' => $level + $element->diameter,
                'airtimeHill' => $level + $element->height,
                default => $level,
            };
            $maxHeight = max($maxHeight, $peak);
        }

        // Free fall from the drop height: v = √(2 g h). Without a drop, the highest point stands in for it.
        $topSpeedMs = sqrt(2 * self::GRAVITY * ($maxDrop > 0 ? $maxDrop : $maxHeight));
        $cruiseSpeed = max(self::MIN_CRUISE_SPEED, $topSpeedMs / 2);

        $length = 0;
        $duration = 0;
        $inversions = 0;
        foreach ($design->track as $element) {
            $metres = self::elementLength($element);
            $length += $metres;
            $speed = match ($element->type) {
                'station' => self::STATION_SPEED,
                'liftHill' => self::CHAIN_SPEED,
                'brakeRun' => self::BRAKE_SPEED,
                default => $cruiseSpeed,
            };
            $duration += $metres / $speed;
            if ($element->type === 'loop') {
                ++$inversions;
            }
        }

        return [
            'maxHeight' => self::round1($maxHeight),
            'length' => self::round1($length),
            'inversions' => $inversions,
            'topSpeed' => self::round1($topSpeedMs * 3.6),
            'duration' => (int) self::jsRound($duration),
        ];
    }

    /** Length of one element along the track, in metres. */
    public static function elementLength(\stdClass $element): float
    {
        return match ($element->type) {
            'station', 'brakeRun' => (float) $element->length,
            'liftHill', 'drop' => $element->height / sin($element->angle * M_PI / 180), // the slope's hypotenuse
            'loop' => M_PI * $element->diameter, // a circle
            'airtimeHill' => 2 * sqrt(5) * $element->height, // up and down two straight slopes, the hill 4 × its height wide
            'helix' => $element->turns * 2 * M_PI * $element->radius,
            'turn' => ($element->angle / 360) * 2 * M_PI * $element->radius,
        };
    }

    private static function round1(float|int $value): float
    {
        return self::jsRound($value * 10) / 10;
    }

    /** JavaScript's Math.round (halves round up), so the values match the TypeScript reference to the last digit. */
    private static function jsRound(float|int $value): float
    {
        return floor($value + 0.5);
    }
}
