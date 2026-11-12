<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Command;

use Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo\CoasterDemo;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo\ScreamScoreDemo;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore\Pimcore\GuestShares;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Sets up Demo 1 (see README.md next to this file), then the scream score on it (ScreamScoreDemo, F316) and a public
 * share per coaster for its guests (GuestShares, F322). Idempotent: a second run changes nothing.
 */
#[AsCommand(name: self::NAME, description: 'Sets up the coaster demo: portal, brief, supplier login and revision 1')]
class CoasterDemoSetupCommand extends Command
{
    public const NAME = 'coaster-demo:setup';

    public function __construct(
        private readonly CoasterDemo $demo,
        private readonly ScreamScoreDemo $screamScore,
        private readonly GuestShares $guestShares,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption('domain', null, InputOption::VALUE_REQUIRED, 'The portal\'s domain, used when the portal is created', CoasterDemo::DEFAULT_DOMAIN);
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $domain = (string) $input->getOption('domain');
        // the scream score after the coaster demo: its ratings point at the coaster asset, its staff at the portal; the
        // guests' shares last: they hold the coaster and belong to the park-staff user
        $changes = [...$this->demo->setup($domain), ...$this->screamScore->setup(), ...$this->guestShares->setup()];
        self::report($io, $changes, 'Nothing to do: the coaster demo is set up already.');
        self::reportScreamScore($io, $this->screamScore, $this->guestShares);

        return Command::SUCCESS;
    }

    /** @param string[] $changes */
    public static function report(SymfonyStyle $io, array $changes, string $nothing): void
    {
        $changes === [] ? $io->writeln($nothing) : $io->listing($changes);
        $io->success(sprintf('Ready. Log in to the portal as %s, password %s.', CoasterDemo::SUPPLIER_EMAIL, CoasterDemo::SUPPLIER_PASSWORD));
    }

    /**
     * The guest link per coaster (its public share's coaster page), the demo passes with their codes and the staff
     * login: what a presenter needs.
     */
    public static function reportScreamScore(SymfonyStyle $io, ScreamScoreDemo $screamScore, GuestShares $guestShares): void
    {
        foreach ($guestShares->guestLinks() as $ride => $link) {
            $io->writeln(sprintf('Scream score guest link for %s: %s', $ride, $link));
        }
        $io->writeln('Demo annual passes (number: code, the first ones have no rating yet):');
        $passes = $screamScore->demoPasses();
        $io->listing(array_map(static fn (string $number, string $code): string => $number . ': ' . $code, array_keys($passes), $passes));
        $io->writeln(sprintf('Park staff: log in to the portal as %s, password %s.', ScreamScoreDemo::STAFF_EMAIL, ScreamScoreDemo::STAFF_PASSWORD));
    }
}
