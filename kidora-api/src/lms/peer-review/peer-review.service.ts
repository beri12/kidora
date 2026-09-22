import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/decorators/current-user.decorator';

interface RubricRow { criterion: string; points: number; description?: string }
interface ReviewScore { criterion: string; points: number }

/**
 * Peer review (Coursera's `peer_review` item).
 *
 * A peer-reviewed assignment is an ordinary assignment whose reviewers are
 * classmates rather than the teacher, so submissions, rubrics and grading all
 * reuse AssignmentSubmission — only *who* scores it changes.
 *
 * Two rules make it work rather than stall:
 *  - A student is never assigned their own work, and never the same
 *    submission twice (the unique constraint backs this up).
 *  - A student's own marks stay hidden until they have completed the number of
 *    reviews the teacher asked for, which is what stops everyone submitting
 *    and nobody reviewing.
 */
@Injectable()
export class PeerReviewService {
  constructor(private prisma: PrismaService) {}

  /**
   * Hand this submission to classmates. Called after a submission lands.
   * Idempotent: re-running tops up to the required number rather than
   * duplicating, so a late-joining classmate can still be given work.
   */
  async assignReviewers(submissionId: string) {
    const submission = await this.prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      select: {
        id: true, studentId: true,
        assignment: { select: { id: true, courseId: true, classId: true, peerReviewCount: true } },
        peerReviews: { select: { reviewerId: true } },
      },
    });
    if (!submission) throw new NotFoundException('Submission not found.');
    const wanted = submission.assignment.peerReviewCount;
    if (wanted <= 0) return { assigned: 0 };

    const already = new Set(submission.peerReviews.map((r) => r.reviewerId));
    const shortfall = wanted - already.size;
    if (shortfall <= 0) return { assigned: 0 };

    // Candidates: classmates who have themselves submitted. Reviewing work
    // before you have done your own would leak the answer.
    const peers = await this.prisma.assignmentSubmission.findMany({
      where: {
        assignmentId: submission.assignment.id,
        studentId: { not: submission.studentId },
      },
      select: { studentId: true, peerReviews: { select: { id: true } } },
    });

    const eligible = peers
      .filter((p) => !already.has(p.studentId))
      // Spread the load: whoever has been given fewest reviews goes first.
      .sort((a, b) => a.peerReviews.length - b.peerReviews.length)
      .slice(0, shortfall);

    if (!eligible.length) return { assigned: 0 };

    await this.prisma.peerReview.createMany({
      data: eligible.map((p) => ({ submissionId, reviewerId: p.studentId })),
      skipDuplicates: true,
    });
    return { assigned: eligible.length };
  }

  /** What this student has been asked to review. */
  async myQueue(u: AuthUser) {
    const rows = await this.prisma.peerReview.findMany({
      where: { reviewerId: u.id, status: 'ASSIGNED' },
      orderBy: { assignedAt: 'asc' },
      select: {
        id: true, assignedAt: true,
        submission: {
          select: {
            id: true, content: true, attachments: true, submittedAt: true,
            assignment: { select: { id: true, title: true, instructions: true, maxScore: true, rubric: true, course: { select: { id: true, title: true } } } },
          },
        },
      },
    });
    // The author is deliberately not selected: peer review is blind.
    return rows.map((r) => ({
      id: r.id,
      assignedAt: r.assignedAt,
      submission: {
        id: r.submission.id,
        content: r.submission.content,
        attachments: r.submission.attachments,
        submittedAt: r.submission.submittedAt,
      },
      assignment: r.submission.assignment,
    }));
  }

  /** Score one peer's work against the rubric. */
  async submitReview(u: AuthUser, reviewId: string, dto: { scores: ReviewScore[]; comment?: string }) {
    const review = await this.prisma.peerReview.findUnique({
      where: { id: reviewId },
      select: {
        id: true, reviewerId: true, status: true, submissionId: true,
        submission: { select: { studentId: true, assignment: { select: { rubric: true, maxScore: true } } } },
      },
    });
    if (!review) throw new NotFoundException('Review not found.');
    if (review.reviewerId !== u.id) throw new ForbiddenException('That review is not yours.');
    if (review.status === 'SUBMITTED') throw new BadRequestException('You have already reviewed this.');
    // Belt and braces: the assignment step already excludes the author.
    if (review.submission.studentId === u.id) throw new ForbiddenException('You cannot review your own work.');

    const rubric = (review.submission.assignment.rubric ?? []) as unknown as RubricRow[];
    const total = this.scoreAgainstRubric(rubric, dto.scores, review.submission.assignment.maxScore);

    await this.prisma.peerReview.update({
      where: { id: reviewId },
      data: {
        status: 'SUBMITTED',
        scores: dto.scores as unknown as Prisma.InputJsonValue,
        total,
        comment: dto.comment,
        submittedAt: new Date(),
      },
    });

    await this.recomputePeerScore(review.submissionId);
    return { ok: true, total };
  }

  /**
   * What a student sees about their own peer-reviewed submission.
   * Marks stay hidden until they have done their share of reviewing.
   */
  async myResult(u: AuthUser, assignmentId: string) {
    const submission = await this.prisma.assignmentSubmission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId: u.id } },
      select: {
        id: true, peerScore: true, score: true, status: true,
        assignment: { select: { peerReviewCount: true, peerReviewsDue: true, maxScore: true } },
        peerReviews: { where: { status: 'SUBMITTED' }, select: { total: true, comment: true, scores: true } },
      },
    });
    if (!submission) throw new NotFoundException('You have not submitted this assignment.');

    const done = await this.prisma.peerReview.count({ where: { reviewerId: u.id, status: 'SUBMITTED' } });
    const due = submission.assignment.peerReviewsDue;
    const unlocked = due === 0 || done >= due;

    return {
      reviewsReceived: submission.peerReviews.length,
      reviewsExpected: submission.assignment.peerReviewCount,
      reviewsYouOwe: Math.max(0, due - done),
      unlocked,
      // Withheld, not merely hidden in the UI: the numbers do not leave the server.
      peerScore: unlocked ? submission.peerScore : null,
      maxScore: submission.assignment.maxScore,
      reviews: unlocked
        ? submission.peerReviews.map((r) => ({ total: r.total, comment: r.comment, scores: r.scores }))
        : [],
      message: unlocked
        ? undefined
        : `Review ${Math.max(0, due - done)} more classmate(s) to see your marks.`,
    };
  }

  /** Teacher's view of how the reviewing is going. */
  async progress(u: AuthUser, assignmentId: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { id: true, teacherId: true, peerReviewCount: true, courseId: true },
    });
    if (!assignment) throw new NotFoundException('Assignment not found.');
    if (assignment.teacherId !== u.id) throw new ForbiddenException('That assignment is not yours.');

    const submissions = await this.prisma.assignmentSubmission.findMany({
      where: { assignmentId },
      select: {
        id: true, peerScore: true,
        student: { select: { id: true, name: true } },
        peerReviews: { select: { status: true } },
      },
    });
    return {
      peerReviewCount: assignment.peerReviewCount,
      submissions: submissions.map((s) => ({
        id: s.id,
        student: s.student,
        peerScore: s.peerScore,
        reviewsDone: s.peerReviews.filter((r) => r.status === 'SUBMITTED').length,
        reviewsAssigned: s.peerReviews.length,
      })),
    };
  }

  /* --------------------------------------------------------------- helpers */

  /**
   * A reviewer can only award the points the rubric defines, so a generous or
   * malicious classmate cannot hand out more than the assignment is worth.
   */
  private scoreAgainstRubric(rubric: RubricRow[], given: ReviewScore[], maxScore: number) {
    if (!rubric.length) {
      const raw = given.reduce((a, g) => a + (Number(g.points) || 0), 0);
      return Math.max(0, Math.min(maxScore, raw));
    }
    let total = 0;
    for (const row of rubric) {
      const match = given.find((g) => g.criterion === row.criterion);
      const points = Math.max(0, Math.min(row.points, Number(match?.points) || 0));
      total += points;
    }
    return Math.max(0, Math.min(maxScore, total));
  }

  /** Mean of the completed reviews, written back onto the submission. */
  private async recomputePeerScore(submissionId: string) {
    const reviews = await this.prisma.peerReview.findMany({
      where: { submissionId, status: 'SUBMITTED', total: { not: null } },
      select: { total: true },
    });
    if (!reviews.length) return;
    const mean = Math.round(reviews.reduce((a, r) => a + (r.total ?? 0), 0) / reviews.length);
    await this.prisma.assignmentSubmission.update({ where: { id: submissionId }, data: { peerScore: mean } });
  }
}
