<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\ChangeControl;

use Pimcore\Model\User;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Opens Demo 2's change set: revision 3 of Thunder Loop on the coaster asset (see README.md next to this file).
 * Idempotent: a second run changes nothing.
 */
#[AsCommand(name: self::NAME, description: 'Opens the coaster demo\'s Change Control change set: revision 3 as two metadata changes')]
class CoasterChangeSetCommand extends Command
{
    public const NAME = 'coaster-demo:change-set';

    public function __construct(private readonly CoasterChangeSet $changeSet)
    {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('user', null, InputOption::VALUE_REQUIRED, 'The Studio user the change set is authored by', 'admin')
            ->addOption('upload-revision-2', null, InputOption::VALUE_NONE, 'Upload revision 2 first if the asset holds another file (Demo 2 without Demo 1)');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $userName = (string) $input->getOption('user');
        $user = User::getByName($userName);
        if (!$user instanceof User) {
            $io->error(sprintf('There is no Studio user "%s". Name one with --user.', $userName));

            return Command::FAILURE;
        }

        try {
            $changes = $this->changeSet->open($user->getId(), (bool) $input->getOption('upload-revision-2'));
        } catch (\RuntimeException $exception) {
            $io->error($exception->getMessage());

            return Command::FAILURE;
        }

        $changes === [] ? $io->writeln('Nothing to do: the change set is open.') : $io->listing($changes);
        $io->success('Ready. Open the Thunder Loop asset in Studio and choose the Review tab.');

        return Command::SUCCESS;
    }
}
