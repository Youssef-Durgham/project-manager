import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Project from '@/models/Project';
import Blocker from '@/models/Blocker';
import Activity from '@/models/Activity';

export async function GET(req: NextRequest) {
  await connectDB();
  const projectId = req.nextUrl.searchParams.get('projectId');
  const days = parseInt(req.nextUrl.searchParams.get('days') || '1');
  
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  // Get recent activities
  const actFilter: any = { createdAt: { $gte: since } };
  if (projectId) actFilter.projectId = projectId;
  const recentActivities = await Activity.find(actFilter).sort({ createdAt: -1 }).limit(50);

  // Get open blockers
  const blockFilter: any = { status: 'open' };
  if (projectId) blockFilter.projectId = projectId;
  const openBlockers = await Blocker.find(blockFilter);

  // Get all projects for task summary
  const projFilter: any = {};
  if (projectId) projFilter._id = projectId;
  const projects = await Project.find(projFilter);

  // Summarize tasks
  const taskSummary: any[] = [];
  let totalDone = 0, totalInProgress = 0, totalReview = 0, totalRemaining = 0;

  projects.forEach((p: any) => {
    const pTasks = { done: 0, inProgress: 0, review: 0, remaining: 0, total: 0 };
    p.components?.forEach((c: any) => {
      c.phases?.forEach((ph: any) => {
        ph.tasks?.forEach((t: any) => {
          pTasks.total++;
          if (t.status === 'done' || t.status === 'approved') pTasks.done++;
          else if (t.status === 'in-progress') pTasks.inProgress++;
          else if (t.status === 'review') pTasks.review++;
          else pTasks.remaining++;
        });
      });
    });
    totalDone += pTasks.done;
    totalInProgress += pTasks.inProgress;
    totalReview += pTasks.review;
    totalRemaining += pTasks.remaining;
    taskSummary.push({ project: p.name, ...pTasks });
  });

  // Group activities by type
  const completedTasks = recentActivities.filter((a: any) => 
    a.action === 'status-changed' && a.details?.includes('done')
  );
  const newTasks = recentActivities.filter((a: any) => a.action === 'created' && a.targetType === 'task');

  // Generate text summary
  const lines: string[] = [];
  lines.push(`📊 Daily Summary (${days === 1 ? 'Last 24h' : `Last ${days} days`})`);
  lines.push('');
  
  if (completedTasks.length > 0) {
    lines.push(`✅ Completed: ${completedTasks.length} tasks`);
    completedTasks.slice(0, 5).forEach((a: any) => lines.push(`  • ${a.targetName}`));
  }
  
  if (totalInProgress > 0) {
    lines.push(`🔄 In Progress: ${totalInProgress} tasks`);
  }
  
  if (totalReview > 0) {
    lines.push(`👁️ Awaiting Review: ${totalReview} tasks`);
  }
  
  if (openBlockers.length > 0) {
    lines.push(`🚫 Open Blockers: ${openBlockers.length}`);
    openBlockers.forEach((b: any) => lines.push(`  ⚠️ ${b.title} [${b.priority}]`));
  }
  
  lines.push('');
  lines.push(`📈 Overall: ${totalDone}/${totalDone + totalInProgress + totalReview + totalRemaining} tasks complete`);

  return NextResponse.json({
    text: lines.join('\n'),
    data: {
      taskSummary,
      totals: { done: totalDone, inProgress: totalInProgress, review: totalReview, remaining: totalRemaining },
      recentActivities: recentActivities.slice(0, 20),
      openBlockers,
      completedRecently: completedTasks.length,
    }
  });
}
