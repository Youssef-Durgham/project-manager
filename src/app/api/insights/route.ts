import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Project from '@/models/Project';

export async function GET(req: NextRequest) {
  await connectDB();
  const projectId = req.nextUrl.searchParams.get('projectId');
  
  const filter: any = {};
  if (projectId) filter._id = projectId;
  
  const projects = await Project.find(filter);
  
  // Collect all tasks across all projects
  const allTasks: any[] = [];
  projects.forEach((p: any) => {
    p.components?.forEach((c: any) => {
      c.phases?.forEach((ph: any) => {
        ph.tasks?.forEach((t: any) => {
          allTasks.push({
            ...t.toObject(),
            projectName: p.name,
            componentName: c.name,
            componentType: c.type,
            phaseName: ph.name,
          });
        });
      });
    });
  });

  const doneTasks = allTasks.filter(t => t.status === 'done' || t.status === 'approved');
  const inProgressTasks = allTasks.filter(t => t.status === 'in-progress');
  const reviewTasks = allTasks.filter(t => t.status === 'review');

  // Time accuracy: estimated vs actual hours
  const tasksWithBothHours = doneTasks.filter(t => t.estimatedHours > 0 && t.actualHours > 0);
  const avgEstimateAccuracy = tasksWithBothHours.length > 0
    ? tasksWithBothHours.reduce((sum, t) => sum + (t.actualHours / t.estimatedHours), 0) / tasksWithBothHours.length
    : 0;

  // Average hours by component type
  const hoursByType: Record<string, { estimated: number; actual: number; count: number }> = {};
  tasksWithBothHours.forEach(t => {
    const type = t.componentType || 'other';
    if (!hoursByType[type]) hoursByType[type] = { estimated: 0, actual: 0, count: 0 };
    hoursByType[type].estimated += t.estimatedHours;
    hoursByType[type].actual += t.actualHours;
    hoursByType[type].count += 1;
  });

  // Completion rate over time (tasks done per week)
  const completionTimeline: Record<string, number> = {};
  doneTasks.forEach(t => {
    const d = t.completedAt || t.updatedAt;
    if (d) {
      const week = new Date(d);
      const weekKey = `${week.getFullYear()}-W${Math.ceil((week.getDate()) / 7).toString().padStart(2, '0')}-${(week.getMonth() + 1).toString().padStart(2, '0')}`;
      completionTimeline[weekKey] = (completionTimeline[weekKey] || 0) + 1;
    }
  });

  // Average time to complete (in hours)
  const tasksWithDuration = doneTasks.filter(t => t.startedAt && t.completedAt);
  const avgCompletionHours = tasksWithDuration.length > 0
    ? tasksWithDuration.reduce((sum, t) => {
        const ms = new Date(t.completedAt).getTime() - new Date(t.startedAt).getTime();
        return sum + (ms / (1000 * 60 * 60));
      }, 0) / tasksWithDuration.length
    : 0;

  // Priority distribution
  const byPriority: Record<string, number> = {};
  allTasks.forEach(t => {
    byPriority[t.priority || 'medium'] = (byPriority[t.priority || 'medium'] || 0) + 1;
  });

  // Assignee workload
  const byAssignee: Record<string, { total: number; done: number; inProgress: number }> = {};
  allTasks.forEach(t => {
    const a = t.assignee || 'unassigned';
    if (!byAssignee[a]) byAssignee[a] = { total: 0, done: 0, inProgress: 0 };
    byAssignee[a].total += 1;
    if (t.status === 'done' || t.status === 'approved') byAssignee[a].done += 1;
    if (t.status === 'in-progress') byAssignee[a].inProgress += 1;
  });

  // Velocity: tasks done in last 7 days vs previous 7 days
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;
  
  const thisWeekDone = doneTasks.filter(t => {
    const d = new Date(t.completedAt || t.updatedAt).getTime();
    return d >= weekAgo;
  }).length;
  
  const lastWeekDone = doneTasks.filter(t => {
    const d = new Date(t.completedAt || t.updatedAt).getTime();
    return d >= twoWeeksAgo && d < weekAgo;
  }).length;

  // Remaining effort estimate
  const remainingTasks = allTasks.filter(t => t.status !== 'done' && t.status !== 'approved');
  const remainingHours = remainingTasks.reduce((sum, t) => sum + (t.estimatedHours || 2), 0); // default 2h if no estimate
  const daysToComplete = thisWeekDone > 0
    ? Math.ceil(remainingTasks.length / (thisWeekDone / 7))
    : null;

  return NextResponse.json({
    totals: {
      totalTasks: allTasks.length,
      doneTasks: doneTasks.length,
      inProgressTasks: inProgressTasks.length,
      reviewTasks: reviewTasks.length,
      remainingTasks: remainingTasks.length,
    },
    velocity: {
      thisWeek: thisWeekDone,
      lastWeek: lastWeekDone,
      trend: thisWeekDone > lastWeekDone ? 'up' : thisWeekDone < lastWeekDone ? 'down' : 'flat',
      avgPerDay: thisWeekDone / 7,
    },
    estimates: {
      avgAccuracy: Math.round(avgEstimateAccuracy * 100), // percentage, 100 = perfect
      avgCompletionHours: Math.round(avgCompletionHours * 10) / 10,
      remainingHours,
      estimatedDaysToComplete: daysToComplete,
      hoursByType,
    },
    distribution: {
      byPriority,
      byAssignee,
    },
    completionTimeline,
  });
}
