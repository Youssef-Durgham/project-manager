import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Project from '@/models/Project';
import Activity from '@/models/Activity';
import { emit } from '@/lib/events';

export const dynamic = 'force-dynamic';

/**
 * GitHub Webhook Handler
 * 
 * Handles:
 * - push events: match branch to task githubBranch, store commit info
 * - pull_request events: update task status if PR title contains task ID
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const event = request.headers.get('x-github-event');
    const body = await request.json();

    if (event === 'push') {
      return handlePush(body);
    } else if (event === 'pull_request') {
      return handlePullRequest(body);
    } else if (event === 'ping') {
      return NextResponse.json({ message: 'pong' });
    }

    return NextResponse.json({ message: `Ignored event: ${event}` });
  } catch (error) {
    console.error('GitHub webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handlePush(body: any) {
  const repoFullName = body.repository?.full_name; // e.g. "user/repo"
  const branch = body.ref?.replace('refs/heads/', ''); // e.g. "feature/task-xyz"
  const commits = body.commits || [];
  const pusher = body.pusher?.name || 'unknown';

  if (!repoFullName || !branch || commits.length === 0) {
    return NextResponse.json({ message: 'No actionable push data' });
  }

  // Find projects linked to this repo
  const projects = await Project.find({
    githubRepo: { $in: [repoFullName, `https://github.com/${repoFullName}`, `https://github.com/${repoFullName}.git`] }
  });

  let matchCount = 0;

  for (const project of projects) {
    let modified = false;
    
    for (const comp of project.components) {
      for (const phase of comp.phases) {
        for (const task of phase.tasks) {
          // Match by githubBranch field on the task
          if (task.githubBranch && task.githubBranch === branch) {
            // Append commit SHAs
            if (!task.githubCommits) task.githubCommits = [];
            for (const commit of commits) {
              const commitInfo = `${commit.id?.substring(0, 7)} - ${commit.message?.split('\n')[0]} (${commit.author?.name || pusher})`;
              if (!task.githubCommits.includes(commitInfo)) {
                task.githubCommits.push(commitInfo);
              }
            }
            modified = true;
            matchCount++;

            // Log activity
            await Activity.create({
              projectId: project._id.toString(),
              actor: 'system',
              action: 'github.push',
              targetType: 'task',
              targetId: task.id,
              targetName: task.title,
              details: `${commits.length} commit(s) pushed to ${branch} by ${pusher}`,
              metadata: { branch, pusher, commitCount: commits.length, repo: repoFullName },
            });
          }
        }
      }
    }

    if (modified) {
      await project.save();
      emit({
        type: 'task_updated',
        data: {
          projectId: project._id.toString(),
          projectSlug: project.slug,
          source: 'github',
          action: 'push',
          branch,
          actor: pusher,
        },
        actor: 'github',
        timestamp: Date.now(),
      });
    }
  }

  return NextResponse.json({ message: `Processed push. Matched ${matchCount} task(s).` });
}

async function handlePullRequest(body: any) {
  const action = body.action; // opened, closed, merged, etc.
  const pr = body.pull_request;
  const repoFullName = body.repository?.full_name;

  if (!pr || !repoFullName) {
    return NextResponse.json({ message: 'No PR data' });
  }

  const prTitle = pr.title || '';
  const prBranch = pr.head?.ref || '';
  const prAuthor = pr.user?.login || 'unknown';
  const prUrl = pr.html_url || '';
  const isMerged = pr.merged === true;

  // Find projects linked to this repo
  const projects = await Project.find({
    githubRepo: { $in: [repoFullName, `https://github.com/${repoFullName}`, `https://github.com/${repoFullName}.git`] }
  });

  let matchCount = 0;

  for (const project of projects) {
    let modified = false;

    for (const comp of project.components) {
      for (const phase of comp.phases) {
        for (const task of phase.tasks) {
          // Match: PR title contains task ID, or PR branch matches githubBranch
          const titleMatch = prTitle.includes(task.id);
          const branchMatch = task.githubBranch && task.githubBranch === prBranch;

          if (titleMatch || branchMatch) {
            matchCount++;

            // Update task status based on PR action
            if (action === 'opened' || action === 'ready_for_review') {
              if (task.status === 'in-progress') {
                task.status = 'review';
                task.reviewedAt = new Date();
              }
            } else if (action === 'closed' && isMerged) {
              if (task.status !== 'done' && task.status !== 'approved') {
                task.status = 'done';
                task.completedAt = new Date();
              }
            }

            // Store PR info in commits
            if (!task.githubCommits) task.githubCommits = [];
            const prInfo = `PR #${pr.number}: ${prTitle} (${action}${isMerged ? ', merged' : ''}) — ${prUrl}`;
            if (!task.githubCommits.includes(prInfo)) {
              task.githubCommits.push(prInfo);
            }

            modified = true;

            // Log activity
            await Activity.create({
              projectId: project._id.toString(),
              actor: 'system',
              action: `github.pr.${action}`,
              targetType: 'task',
              targetId: task.id,
              targetName: task.title,
              details: `PR #${pr.number} "${prTitle}" ${action}${isMerged ? ' (merged)' : ''} by ${prAuthor}`,
              metadata: { prNumber: pr.number, prTitle, prUrl, action, merged: isMerged, repo: repoFullName },
            });
          }
        }
      }
    }

    if (modified) {
      await project.save();
      emit({
        type: 'task_updated',
        data: {
          projectId: project._id.toString(),
          projectSlug: project.slug,
          source: 'github',
          action: `pr.${action}`,
          prNumber: pr.number,
          actor: prAuthor,
        },
        actor: 'github',
        timestamp: Date.now(),
      });
    }
  }

  return NextResponse.json({ message: `Processed PR. Matched ${matchCount} task(s).` });
}
