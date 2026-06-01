<?php
declare(strict_types=1);

/**
 * This source file is available under the terms of the
 * Pimcore Open Core License (POCL)
 * Full copyright and license information is available in
 * LICENSE.md which is distributed with this source code.
 *
 *  @copyright  Copyright (c) Pimcore GmbH (https://www.pimcore.com)
 *  @license    Pimcore Open Core License (POCL)
 */

namespace Pimcore\Bundle\StudioExampleBundle\EventSubscriber;

use Pimcore\Model\Element\ElementInterface;
use Pimcore\Model\Element\Note;
use Pimcore\Model\Element\Service as ElementService;
use Pimcore\Model\User;
use Pimcore\Workflow\Notes\NotesAwareInterface;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\Workflow\Event\CompletedEvent;

class WorkflowReviewersSubscriber implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        // This example enriches the standard workflow note (one entry in
        // Notes & Events instead of two). To do that, the subscriber must run
        // AFTER Pimcore's core NotesSubscriber has created the note — which
        // listens on workflow.completed with priority 1. Priority 0 here
        // ensures Symfony invokes our handler afterwards.
        // For a plain side-effect (e.g. notify reviewers without touching the
        // note) any priority would do.
        return [
            'workflow.simple_approval.completed.request_review' => ['onRequestReviewCompleted', 0],
        ];
    }

    public function onRequestReviewCompleted(CompletedEvent $event): void
    {
        $subject = $event->getSubject();
        if (!$subject instanceof ElementInterface) {
            return;
        }

        $reviewerIds = $event->getContext()['additional']['reviewers'] ?? null;
        if (!is_array($reviewerIds) || $reviewerIds === []) {
            return;
        }

        $usernames = [];
        foreach ($reviewerIds as $reviewerId) {
            $user = User::getById((int)$reviewerId);
            if ($user instanceof User) {
                $usernames[] = $user->getName();
            }
        }

        if ($usernames === []) {
            return;
        }

        $note = $this->findJustCreatedWorkflowNote($subject, $event->getTransition());
        if ($note === null) {
            return;
        }

        $appended = 'Reviewers requested: ' . implode(', ', $usernames);
        $description = $note->getDescription() ?? '';
        $note->setDescription($description === '' ? $appended : $description . "\n\n" . $appended);
        $note->save();
    }

    private function findJustCreatedWorkflowNote(ElementInterface $subject, object $transition): ?Note
    {
        $type = $transition instanceof NotesAwareInterface ? $transition->getNotesType() : 'Status update';

        $listing = new Note\Listing();
        $listing->setCondition('cid = :cid AND ctype = :ctype AND type = :type', [
            'cid' => $subject->getId(),
            'ctype' => ElementService::getElementType($subject),
            'type' => $type,
        ]);
        $listing->setOrderKey('date');
        $listing->setOrder('DESC');
        $listing->setLimit(1);

        $notes = $listing->load();

        return $notes[0] ?? null;
    }
}
