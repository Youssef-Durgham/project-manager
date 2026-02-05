import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Activity from '@/models/Activity';
import Comment from '@/models/Comment';
import Blocker from '@/models/Blocker';
import Project from '@/models/Project';
import { getRecentEvents } from '@/lib/events';

export const dynamic = 'force-dynamic';

/**
 * AI Activity Feed — returns recent project activity for AI assistants
 * 
 * Query params:
 *   projectId — filter by project (slug or _id)
 *   since     — ISO timestamp or unix ms, return only activity after this time
 *   limit     — max items per category (default 20)
 *   include   — comma-separated: activities,comments,blockers,tasks,sse (default all)
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const projectIdParam = searchParams.get('projectId');
    const sinceParam = searchParams.get('since');
    const limitParam = parseInt(searchParams.get('limit') || '20', 10);
    const includeParam = searchParams.get('include')?.split(',') || ['activities', 'comments', 'blockers', 'tasks', 'sse'];
    const limit = Math.min(Math.max(limitParam, 1), 100);

    // Resolve project
    let projectId: string | null = null;
    let projectSlug: string | null = null;
    if (projectIdParam) {
      let project = await Project.findOne({ slug: projectIdParam }).select('_id slug');
      if (!project && /^[0-9a-fA-F]{24}$/.test(projectIdParam)) {
        project = await Project.findById(projectIdParam).select('_id slug');
      }
      if (project) {
        projectId = project._id.toString();
        projectSlug = project.slug;
      }
    }

    // Parse since timestamp
    let sinceDate: Date | null = null;
    if (sinceParam) {
      const parsed = Number(sinceParam);
      sinceDate = isNaN(parsed) ? new Date(sinceParam) : new Date(parsed);
      if (isNaN(sinceDate.getTime())) sinceDate = null;
    }

    const result: Record<string, any> = {
      timestamp: Date.now(),
      projectId: projectId || projectIdParam,
    };

    // 1. Activities (from DB)
    if (includeParam.includes('activities')) {
      const actFilter: any = {};
      if (projectId) actFilter.projectId = projectId;
      if (sinceDate) actFilter.createdAt = { $gte: sinceDate };

      const activities = await Activity.find(actFilter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      result.activities = activities.map((a: any) => ({
        id: a._id?.toString(),
        actor: a.actor,
        action: a.action,
        targetType: a.targetType,
        targetId: a.targetId,
        targetName: a.targetName,
        details: a.details,
        metadata: a.metadata,
        timestamp: a.createdAt,
      }));
    }

    // 2. Recent comments
    if (includeParam.includes('comments')) {
      const commentFilter: any = {};
      if (projectId) commentFilter.projectId = projectId;
      if (sinceDate) commentFilter.createdAt = { $gte: sinceDate };

      const comments = await Comment.find(commentFilter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      result.comments = comments.map((c: any) => ({
        id: c._id?.toString(),
        author: c.author,
        text: c.text,
        taskId: c.taskId,
        phaseId: c.phaseId,
        timestamp: c.createdAt,
      }));
    }

    // 3. Blockers
    if (includeParam.includes('blockers')) {
      const blockerFilter: any = {};
      if (projectId) blockerFilter.projectId = projectId;
      if (sinceDate) blockerFilter.updatedAt = { $gte: sinceDate };

      const blockers = await Blocker.find(blockerFilter)
        .sort({ updatedAt: -1 })
        .limit(limit)
        .lean();

      result.blockers = blockers.map((b: any) => ({
        id: b._id?.toString(),
        title: b.title,
        description: b.description,
        type: b.type,
        status: b.status,
        priority: b.priority,
        author: b.author,
        resolution: b.resolution,
        resolvedBy: b.resolvedBy,
        createdAt: b.createdAt,
        resolvedAt: b.resolvedAt,
      }));
    }

    // 4. Current task states (latest snapshot)
    if (includeParam.includes('tasks') && projectId) {
      const project = await Project.findById(projectId).lean();
      if (project) {
        const tasks: any[] = [];
        for (const comp of (project as any).components || []) {
          for (const phase of comp.phases || []) {
            for (const task of phase.tasks || []) {
              tasks.push({
                id: task.id,
                title: task.title,
                status: task.status,
                priority: task.priority,
                assignee: task.assignee,
                component: comp.name,
                phase: phase.name,
                dueDate: task.dueDate,
                estimatedHours: task.estimatedHours,
                actualHours: task.actualHours,
                githubBranch: task.githubBranch,
                startedAt: task.startedAt,
                completedAt: task.completedAt,
              });
            }
          }
        }
        result.tasks = tasks;
      }
    }

    // 5. Recent SSE events (in-memory, very fresh)
    if (includeParam.includes('sse')) {
      const sinceMs = sinceDate ? sinceDate.getTime() : undefined;
      result.sseEvents = getRecentEvents(sinceMs, projectId || undefined)
        .slice(-limit);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('AI feed error:', error);
    return NextResponse.json({ error: 'Failed to fetch activity feed' }, { status: 500 });
  }
}
