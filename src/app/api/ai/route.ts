import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Project from '@/models/Project';
import Comment from '@/models/Comment';
import Activity from '@/models/Activity';
import Blocker from '@/models/Blocker';
import Decision from '@/models/Decision';

// Helper: log activity
async function logActivity(projectId: string, actor: string, action: string, targetType: string, targetId: string, targetName: string, details: string, metadata: any = {}) {
  try {
    await Activity.create({ projectId, actor, action, targetType, targetId, targetName, details, metadata });
  } catch (e) {
    console.error('Failed to log activity:', e);
  }
}

// Helper: find task in project
function findTask(project: any, taskId: string) {
  for (const comp of project.components) {
    for (const phase of comp.phases) {
      const task = phase.tasks.find((t: any) => t.id === taskId);
      if (task) return { task, phase, component: comp };
    }
  }
  return null;
}

// Helper: check dependencies are met
function checkDependencies(project: any, taskId: string, dependencies: string[]) {
  const unmet: string[] = [];
  for (const depId of dependencies) {
    const dep = findTask(project, depId);
    if (dep && dep.task.status !== 'done') {
      unmet.push(`${dep.task.title} (${dep.task.status})`);
    }
  }
  return unmet;
}

// GET /api/ai — Get all ready/in-progress tasks, project summaries
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'tasks';
    const projectSlug = searchParams.get('project');

    if (action === 'tasks') {
      // Get all ready/in-progress tasks assigned to employee-1 or unassigned
      const filter: any = { status: 'active' };
      if (projectSlug) filter.slug = projectSlug;
      
      const projects = await Project.find(filter);
      const tasks: any[] = [];
      
      for (const project of projects) {
        for (const comp of project.components) {
          for (const phase of comp.phases) {
            for (const task of phase.tasks) {
              if (task.status === 'ready' || task.status === 'in-progress') {
                const unmetDeps = checkDependencies(project, task.id, task.dependencies || []);
                tasks.push({
                  projectId: project._id,
                  projectName: project.name,
                  projectSlug: project.slug,
                  componentName: comp.name,
                  phaseName: phase.name,
                  taskId: task.id,
                  title: task.title,
                  description: task.description,
                  status: task.status,
                  priority: task.priority,
                  assignee: task.assignee,
                  acceptanceCriteria: task.acceptanceCriteria || [],
                  dependencies: task.dependencies || [],
                  unmetDependencies: unmetDeps,
                  blocked: unmetDeps.length > 0,
                  dueDate: task.dueDate,
                  githubBranch: task.githubBranch,
                });
              }
            }
          }
        }
      }

      // Sort: in-progress first, then by priority
      const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      tasks.sort((a, b) => {
        if (a.status === 'in-progress' && b.status !== 'in-progress') return -1;
        if (b.status === 'in-progress' && a.status !== 'in-progress') return 1;
        if (a.blocked && !b.blocked) return 1;
        if (!a.blocked && b.blocked) return -1;
        return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
      });

      return NextResponse.json({ success: true, data: tasks, count: tasks.length });
    }

    if (action === 'summary') {
      const filter: any = { status: 'active' };
      if (projectSlug) filter.slug = projectSlug;
      const projects = await Project.find(filter);

      const summaries = projects.map(p => {
        let total = 0, done = 0, ready = 0, inProgress = 0, waiting = 0, overdue = 0;
        const now = new Date();
        p.components.forEach((c: any) => c.phases.forEach((ph: any) => ph.tasks.forEach((t: any) => {
          total++;
          if (t.status === 'done') done++;
          if (t.status === 'ready') ready++;
          if (t.status === 'in-progress') inProgress++;
          if (t.status === 'waiting') waiting++;
          if (t.dueDate && new Date(t.dueDate) < now && t.status !== 'done') overdue++;
        })));
        return {
          name: p.name,
          slug: p.slug,
          progress: total > 0 ? Math.round((done / total) * 100) : 0,
          total, done, ready, inProgress, waiting, overdue,
          components: p.components.length,
        };
      });

      return NextResponse.json({ success: true, data: summaries });
    }

    // Smart queue — next task to work on
    if (action === 'queue') {
      const projects = await Project.find({ status: 'active' });
      const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      let bestTask: any = null;
      let bestScore = 999;

      for (const project of projects) {
        for (const comp of project.components) {
          for (const phase of comp.phases) {
            for (const task of phase.tasks) {
              if (task.status !== 'ready' && task.status !== 'in-progress') continue;
              const unmet = checkDependencies(project, task.id, task.dependencies || []);
              if (unmet.length > 0) continue; // skip blocked

              // Score: in-progress = -10, priority weight, due date urgency
              let score = priorityOrder[task.priority] || 2;
              if (task.status === 'in-progress') score -= 10; // always prioritize in-progress
              if (task.dueDate) {
                const daysUntilDue = (new Date(task.dueDate).getTime() - Date.now()) / 86400000;
                if (daysUntilDue < 1) score -= 5;
                else if (daysUntilDue < 3) score -= 3;
              }

              if (score < bestScore) {
                bestScore = score;
                bestTask = {
                  projectName: project.name, projectSlug: project.slug,
                  componentName: comp.name, phaseName: phase.name,
                  taskId: task.id, title: task.title, description: task.description,
                  status: task.status, priority: task.priority,
                  subtasks: task.subtasks || [], acceptanceCriteria: task.acceptanceCriteria || [],
                  mockups: task.mockups || [], dueDate: task.dueDate,
                };
              }
            }
          }
        }
      }

      return NextResponse.json({ success: true, data: bestTask, message: bestTask ? `Next: ${bestTask.title} (${bestTask.projectName})` : 'No tasks available' });
    }

    // Velocity — tasks completed per day/week
    if (action === 'velocity') {
      const days = parseInt(searchParams.get('days') || '30');
      const since = new Date(Date.now() - days * 86400000);
      
      const completions = await Activity.find({
        action: 'task.status',
        'metadata.newStatus': 'done',
        createdAt: { $gte: since },
      }).sort({ createdAt: -1 });

      // Group by day
      const byDay: Record<string, number> = {};
      const byWeek: Record<string, number> = {};
      
      for (const act of completions) {
        const d = new Date(act.createdAt);
        const dayKey = d.toISOString().slice(0, 10);
        const weekNum = Math.ceil(((d.getTime() - since.getTime()) / 86400000) / 7);
        byDay[dayKey] = (byDay[dayKey] || 0) + 1;
        byWeek[`Week ${weekNum}`] = (byWeek[`Week ${weekNum}`] || 0) + 1;
      }

      const totalCompleted = completions.length;
      const avgPerDay = days > 0 ? (totalCompleted / days).toFixed(1) : '0';
      const avgPerWeek = days > 0 ? (totalCompleted / (days / 7)).toFixed(1) : '0';

      // Estimate remaining
      const projects = await Project.find({ status: 'active' });
      let remaining = 0;
      projects.forEach((p: any) => p.components.forEach((c: any) => c.phases.forEach((ph: any) => ph.tasks.forEach((t: any) => {
        if (t.status !== 'done') remaining++;
      }))));

      const estimatedDays = parseFloat(avgPerDay) > 0 ? Math.ceil(remaining / parseFloat(avgPerDay)) : null;

      return NextResponse.json({
        success: true,
        data: {
          totalCompleted, avgPerDay, avgPerWeek, remaining, estimatedDays,
          byDay, byWeek, period: `${days} days`,
        }
      });
    }

    // Auto-escalate overdue tasks
    if (action === 'escalate') {
      const projects = await Project.find({ status: 'active' });
      const escalated: string[] = [];
      const now = Date.now();

      for (const project of projects) {
        let changed = false;
        for (const comp of project.components) {
          for (const phase of comp.phases) {
            for (const task of phase.tasks) {
              if (task.status === 'done' || task.status === 'approved') continue;
              if (!task.dueDate) continue;
              
              const dueTime = new Date(task.dueDate).getTime();
              const daysUntilDue = (dueTime - now) / 86400000;
              
              if (daysUntilDue < 0 && task.priority !== 'critical') {
                task.priority = 'critical';
                escalated.push(`🚨 ${task.title} → CRITICAL (overdue)`);
                changed = true;
              } else if (daysUntilDue < 1 && task.priority === 'medium') {
                task.priority = 'high';
                escalated.push(`🔴 ${task.title} → HIGH (due today)`);
                changed = true;
              } else if (daysUntilDue < 3 && task.priority === 'low') {
                task.priority = 'medium';
                escalated.push(`🟡 ${task.title} → MEDIUM (due in ${Math.ceil(daysUntilDue)}d)`);
                changed = true;
              }
            }
          }
        }
        if (changed) await project.save();
      }

      return NextResponse.json({ success: true, data: escalated, message: escalated.length > 0 ? `Escalated ${escalated.length} tasks` : 'No tasks need escalation' });
    }

    // AI task estimation based on history
    if (action === 'estimate') {
      const taskTitle = searchParams.get('title') || '';
      const taskType = searchParams.get('type') || ''; // component type
      
      const projects = await Project.find({});
      const completedTasks: any[] = [];
      
      projects.forEach((p: any) => {
        p.components.forEach((c: any) => {
          c.phases.forEach((ph: any) => {
            ph.tasks.forEach((t: any) => {
              if ((t.status === 'done' || t.status === 'approved') && t.actualHours > 0) {
                completedTasks.push({
                  title: t.title,
                  componentType: c.type,
                  estimatedHours: t.estimatedHours,
                  actualHours: t.actualHours,
                  priority: t.priority,
                });
              }
            });
          });
        });
      });

      // Calculate averages
      const relevant = taskType 
        ? completedTasks.filter(t => t.componentType === taskType)
        : completedTasks;
      
      const avgHours = relevant.length > 0
        ? relevant.reduce((sum, t) => sum + t.actualHours, 0) / relevant.length
        : 4; // default 4h
      
      const avgAccuracy = relevant.length > 0
        ? relevant.reduce((sum, t) => sum + (t.actualHours / Math.max(t.estimatedHours, 0.5)), 0) / relevant.length
        : 1;

      return NextResponse.json({
        success: true,
        data: {
          suggestedHours: Math.round(avgHours * 10) / 10,
          avgActualHours: Math.round(avgHours * 10) / 10,
          estimateMultiplier: Math.round(avgAccuracy * 100) / 100,
          sampleSize: relevant.length,
          tip: avgAccuracy > 1.5 ? 'You tend to underestimate! Consider adding 50% buffer.' :
               avgAccuracy < 0.7 ? 'You tend to overestimate. Estimates could be tighter.' :
               'Your estimates are fairly accurate!',
        }
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('AI API GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
  }
}

// POST /api/ai — Update tasks, add comments, log activity
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { action } = body;

    // Update task status
    if (action === 'update-task') {
      const { projectSlug, taskId, status, priority, addNote, acceptanceCriteria, githubCommit, githubBranch } = body;
      const project = await Project.findOne({ slug: projectSlug });
      if (!project) return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });

      const found = findTask(project, taskId);
      if (!found) return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });

      const { task, phase, component } = found;
      const oldStatus = task.status;

      // Check dependencies before marking in-progress or done
      if ((status === 'in-progress' || status === 'done') && task.dependencies?.length > 0) {
        const unmet = checkDependencies(project, taskId, task.dependencies);
        if (unmet.length > 0) {
          return NextResponse.json({ 
            success: false, 
            error: `Blocked by dependencies: ${unmet.join(', ')}`,
            unmetDependencies: unmet 
          }, { status: 400 });
        }
      }

      // Check acceptance criteria before marking done
      if (status === 'done' && task.acceptanceCriteria?.length > 0) {
        const unchecked = task.acceptanceCriteria.filter((c: any) => !c.checked);
        if (unchecked.length > 0) {
          return NextResponse.json({
            success: false,
            error: `${unchecked.length} acceptance criteria not met`,
            unchecked: unchecked.map((c: any) => c.text),
          }, { status: 400 });
        }
      }

      if (status) {
        // Review flow: employee-1 sends to review, only yusif can approve/done
        if (status === 'review') {
          task.reviewedAt = new Date();
          task.reviewNotes = body.reviewNotes || '';
        }
        if (status === 'revision') {
          task.reviewNotes = body.reviewNotes || task.reviewNotes || '';
        }
        task.status = status;
        if (status === 'in-progress' && !task.startedAt) task.startedAt = new Date();
        if (status === 'done' || status === 'approved') task.completedAt = new Date();
      }
      if (priority) task.priority = priority;
      if (addNote) task.notes.push(addNote);
      if (githubCommit && !task.githubCommits.includes(githubCommit)) task.githubCommits.push(githubCommit);
      if (githubBranch) task.githubBranch = githubBranch;
      if (acceptanceCriteria) task.acceptanceCriteria = acceptanceCriteria;
      if (body.subtasks) task.subtasks = body.subtasks;
      if (body.addSubtask) {
        if (!task.subtasks) task.subtasks = [];
        task.subtasks.push(body.addSubtask);
      }
      if (body.toggleSubtask) {
        const st = task.subtasks?.find((s: any) => s.id === body.toggleSubtask);
        if (st) st.checked = !st.checked;
      }
      if (body.addMockup) {
        if (!task.mockups) task.mockups = [];
        task.mockups.push(body.addMockup);
      }
      if (body.actualHours !== undefined) task.actualHours = body.actualHours;

      await project.save();

      // Log activity
      if (status && status !== oldStatus) {
        await logActivity(project._id.toString(), 'employee-1', 'task.status', 'task', taskId, task.title,
          `Changed "${task.title}" from ${oldStatus} to ${status}`, { oldStatus, newStatus: status, component: component.name, phase: phase.name });
      }

      // Check if phase is complete
      const allDone = phase.tasks.every((t: any) => t.status === 'done');
      if (allDone && status === 'done') {
        await logActivity(project._id.toString(), 'system', 'phase.complete', 'phase', phase.id, phase.name,
          `Phase "${phase.name}" in ${component.name} is 100% complete!`, { component: component.name });
      }

      return NextResponse.json({ 
        success: true, 
        data: { task: { id: task.id, title: task.title, status: task.status }, phaseComplete: allDone },
        message: `Task "${task.title}" → ${status}${allDone ? ' | 🎉 Phase complete!' : ''}` 
      });
    }

    // Add comment
    if (action === 'comment') {
      const { projectId, taskId, phaseId, text, images } = body;
      const comment = await Comment.create({
        projectId, taskId: taskId || '', phaseId: phaseId || '',
        author: 'employee-1', text, images: images || [],
      });
      await logActivity(projectId, 'employee-1', 'comment.add', taskId ? 'task' : 'project', taskId || projectId, '', text.slice(0, 100));
      return NextResponse.json({ success: true, data: comment });
    }

    // Toggle acceptance criteria
    if (action === 'toggle-criteria') {
      const { projectSlug, taskId, criteriaId } = body;
      const project = await Project.findOne({ slug: projectSlug });
      if (!project) return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
      
      const found = findTask(project, taskId);
      if (!found) return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
      
      const criteria = found.task.acceptanceCriteria?.find((c: any) => c.id === criteriaId);
      if (!criteria) return NextResponse.json({ success: false, error: 'Criteria not found' }, { status: 404 });
      
      criteria.checked = !criteria.checked;
      await project.save();
      
      await logActivity(project._id.toString(), 'employee-1', 'criteria.toggle', 'task', taskId, found.task.title,
        `${criteria.checked ? '✅' : '⬜'} ${criteria.text}`);
      
      return NextResponse.json({ success: true, data: { checked: criteria.checked, text: criteria.text } });
    }

    // Link GitHub commit to task
    if (action === 'link-commit') {
      const { projectSlug, taskId, commitSha, commitMessage, branch } = body;
      const project = await Project.findOne({ slug: projectSlug });
      if (!project) return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
      
      const found = findTask(project, taskId);
      if (!found) return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
      
      if (!found.task.githubCommits.includes(commitSha)) found.task.githubCommits.push(commitSha);
      if (branch) found.task.githubBranch = branch;
      await project.save();
      
      await logActivity(project._id.toString(), 'employee-1', 'github.commit', 'task', taskId, found.task.title,
        `Linked commit ${commitSha.slice(0, 7)}: ${commitMessage || ''}`, { commitSha, branch });
      
      return NextResponse.json({ success: true });
    }

    // Submit for review (employee-1 marks task complete → goes to review)
    if (action === 'submit-review') {
      const { projectSlug, taskId, reviewNotes } = body;
      const project = await Project.findOne({ slug: projectSlug });
      if (!project) return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
      
      const found = findTask(project, taskId);
      if (!found) return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
      
      // Check acceptance criteria
      if (found.task.acceptanceCriteria?.length > 0) {
        const unchecked = found.task.acceptanceCriteria.filter((c: any) => !c.checked);
        if (unchecked.length > 0) {
          return NextResponse.json({
            success: false,
            error: `${unchecked.length} acceptance criteria not met`,
            unchecked: unchecked.map((c: any) => c.text),
          }, { status: 400 });
        }
      }
      
      found.task.status = 'review';
      found.task.reviewedAt = new Date();
      found.task.reviewNotes = reviewNotes || '';
      await project.save();
      
      await logActivity(project._id.toString(), 'employee-1', 'task.submit-review', 'task', taskId, found.task.title,
        `Submitted for review: ${found.task.title}`, { reviewNotes });
      
      return NextResponse.json({ success: true, message: `"${found.task.title}" submitted for Yusif's review 👁️` });
    }

    // Add blocker/question
    if (action === 'add-blocker') {
      const { projectId, taskId, type, title, description, priority } = body;
      const blocker = await Blocker.create({
        projectId, taskId: taskId || '', author: 'employee-1',
        type: type || 'question', title, description: description || '',
        priority: priority || 'medium',
      });
      
      await logActivity(projectId, 'employee-1', 'blocker.created', type || 'question', blocker._id.toString(), title,
        `New ${type || 'question'}: ${title}`);
      
      return NextResponse.json({ success: true, data: blocker, message: `${type || 'question'} raised: ${title}` });
    }

    // Add decision
    if (action === 'add-decision') {
      const { projectId, title, description, reasoning, alternatives, category, impact } = body;
      const decision = await Decision.create({
        projectId, title, description: description || '', reasoning: reasoning || '',
        alternatives: alternatives || [], madeBy: body.madeBy || 'both',
        category: category || 'other', impact: impact || 'medium',
      });
      
      await logActivity(projectId, 'employee-1', 'decision.made', 'decision', decision._id.toString(), title,
        `Decision: ${title} [${category || 'other'}]`);
      
      return NextResponse.json({ success: true, data: decision, message: `Decision logged: ${title}` });
    }

    // Add screenshot to task
    if (action === 'add-screenshot') {
      const { projectSlug, taskId, url, caption } = body;
      const project = await Project.findOne({ slug: projectSlug });
      if (!project) return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
      
      const found = findTask(project, taskId);
      if (!found) return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
      
      if (!found.task.screenshots) found.task.screenshots = [];
      const crypto = await import('crypto');
      found.task.screenshots.push({
        id: crypto.randomUUID(),
        url, caption: caption || '',
        capturedAt: new Date(),
      });
      await project.save();
      
      return NextResponse.json({ success: true, message: `Screenshot added to "${found.task.title}"` });
    }

    // Add file attachment to task
    if (action === 'add-attachment') {
      const { projectSlug, taskId, name, url, type: mimeType, size } = body;
      const project = await Project.findOne({ slug: projectSlug });
      if (!project) return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
      
      const found = findTask(project, taskId);
      if (!found) return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
      
      if (!found.task.fileAttachments) found.task.fileAttachments = [];
      const crypto = await import('crypto');
      found.task.fileAttachments.push({
        id: crypto.randomUUID(),
        name, url, type: mimeType || '', size: size || 0,
        uploadedBy: 'employee-1', uploadedAt: new Date(),
      });
      await project.save();
      
      return NextResponse.json({ success: true, message: `File "${name}" attached to "${found.task.title}"` });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('AI API POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
  }
}
