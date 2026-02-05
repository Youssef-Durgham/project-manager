import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Project from '@/models/Project';
import Activity from '@/models/Activity';
import { notifyStatusChange, notifyTaskAssigned } from '@/lib/notifications';
import { emit } from '@/lib/events';

async function logActivity(projectId: string, actor: string, action: string, targetType: string, targetId: string, targetName: string, details: string, metadata: any = {}) {
  try { await Activity.create({ projectId, actor, action, targetType, targetId, targetName, details, metadata }); } catch {}
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    await connectDB();
    const { id, taskId } = await params;
    const body = await request.json();
    
    let project = await Project.findOne({ slug: id });
    if (!project && /^[0-9a-fA-F]{24}$/.test(id)) project = await Project.findById(id);
    if (!project) return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });

    let taskFound = false;
    for (const component of project.components) {
      for (const phase of component.phases) {
        const task = phase.tasks.find((t: any) => t.id === taskId);
        if (task) {
          const oldStatus = task.status;
          
          if (body.status !== undefined) task.status = body.status;
          if (body.title !== undefined) task.title = body.title;
          if (body.description !== undefined) task.description = body.description;
          if (body.priority !== undefined) task.priority = body.priority;
          if (body.dueDate !== undefined) task.dueDate = body.dueDate;
          if (body.estimatedHours !== undefined) task.estimatedHours = body.estimatedHours;
          if (body.tags !== undefined) task.tags = body.tags;
          if (body.assignee !== undefined) task.assignee = body.assignee;
          if (body.addNote) task.notes.push(body.addNote);
          if (body.acceptanceCriteria !== undefined) task.acceptanceCriteria = body.acceptanceCriteria;
          if (body.dependencies !== undefined) task.dependencies = body.dependencies;
          
          // Toggle single criteria
          if (body.toggleCriteria) {
            const c = task.acceptanceCriteria?.find((c: any) => c.id === body.toggleCriteria);
            if (c) c.checked = !c.checked;
          }
          
          // Add criteria
          if (body.addCriteria) {
            if (!task.acceptanceCriteria) task.acceptanceCriteria = [];
            task.acceptanceCriteria.push(body.addCriteria);
          }
          
          // Subtasks
          if (body.toggleSubtask) {
            const st = task.subtasks?.find((s: any) => s.id === body.toggleSubtask);
            if (st) st.checked = !st.checked;
          }
          if (body.addSubtask) {
            if (!task.subtasks) task.subtasks = [];
            task.subtasks.push(body.addSubtask);
          }
          
          // Mockups
          if (body.addMockup) {
            if (!task.mockups) task.mockups = [];
            task.mockups.push(body.addMockup);
          }
          
          // Time tracking
          if (body.actualHours !== undefined) task.actualHours = body.actualHours;
          if (body.status === 'in-progress' && !task.startedAt) task.startedAt = new Date();
          if (body.status === 'done' && !task.completedAt) task.completedAt = new Date();
          if (body.status === 'review') task.reviewedAt = new Date();
          if (body.reviewNotes !== undefined) task.reviewNotes = body.reviewNotes;

          // Pin toggle
          if (body.pinned !== undefined) task.pinned = body.pinned;

          // Timer
          if (body.timerAction === 'start') {
            task.timerActive = true;
            task.timerStartedAt = new Date();
          }
          if (body.timerAction === 'stop') {
            if (task.timerActive && task.timerStartedAt) {
              const elapsed = Math.floor((Date.now() - new Date(task.timerStartedAt).getTime()) / 1000);
              task.totalTimerSeconds = (task.totalTimerSeconds || 0) + elapsed;
            }
            task.timerActive = false;
            task.timerStartedAt = undefined;
          }

          // File attachments
          if (body.addAttachment) {
            if (!task.fileAttachments) task.fileAttachments = [];
            task.fileAttachments.push(body.addAttachment);
          }

          // Remove attachment
          if (body.removeAttachment) {
            if (task.fileAttachments) {
              task.fileAttachments = task.fileAttachments.filter((a: any) => a.id !== body.removeAttachment);
            }
          }

          // Recurring
          if (body.recurring !== undefined) task.recurring = body.recurring;

          // Order (for kanban drag reorder)
          if (body.order !== undefined) task.order = body.order;

          // Auto-create next recurring task when marked done
          if (body.status === 'done' && task.recurring?.enabled && task.recurring?.frequency) {
            const freq = task.recurring.frequency;
            const nextDue = new Date();
            switch (freq) {
              case 'daily': nextDue.setDate(nextDue.getDate() + 1); break;
              case 'weekly': nextDue.setDate(nextDue.getDate() + 7); break;
              case 'biweekly': nextDue.setDate(nextDue.getDate() + 14); break;
              case 'monthly': nextDue.setMonth(nextDue.getMonth() + 1); break;
            }
            // Create next occurrence in same phase
            const newTaskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            const nextTask = {
              id: newTaskId,
              title: task.title,
              description: task.description || '',
              status: 'ready',
              priority: task.priority || 'medium',
              dueDate: nextDue.toISOString().split('T')[0],
              estimatedHours: task.estimatedHours || 0,
              tags: task.tags || [],
              notes: [],
              acceptanceCriteria: (task.acceptanceCriteria || []).map((c: any) => ({
                id: `crit-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                text: c.text,
                checked: false,
              })),
              subtasks: (task.subtasks || []).map((s: any) => ({
                id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                title: s.title,
                checked: false,
              })),
              mockups: [],
              dependencies: [],
              assignee: task.assignee || '',
              fileAttachments: [],
              recurring: {
                enabled: true,
                frequency: freq,
                nextDue,
              },
            };
            phase.tasks.push(nextTask);
            // Update the completed task's recurring nextDue
            task.recurring.nextDue = nextDue;
          }

          // Log status change + notify
          if (body.status && body.status !== oldStatus) {
            await logActivity(project._id.toString(), body.actor || 'yusif', 'task.status', 'task', taskId, task.title,
              `${task.title}: ${oldStatus} → ${body.status}`, { oldStatus, newStatus: body.status, component: component.name, phase: phase.name });
            
            // Send notification
            notifyStatusChange({
              taskTitle: task.title,
              oldStatus,
              newStatus: body.status,
              actor: body.actor || 'yusif',
              assignee: task.assignee,
              projectSlug: project.slug,
              taskId,
            }).catch(() => {});
          }

          // Notify on assignment change
          if (body.assignee !== undefined && body.assignee !== task.assignee) {
            notifyTaskAssigned({
              taskTitle: task.title,
              assignee: body.assignee,
              actor: body.actor || 'yusif',
              projectSlug: project.slug,
              taskId,
            }).catch(() => {});
          }

          taskFound = true;
          break;
        }
      }
      if (taskFound) break;
    }

    if (!taskFound) return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });

    await project.save();

    // Emit SSE event for real-time updates
    emit({
      type: 'task_updated',
      data: {
        projectId: project._id.toString(),
        projectSlug: project.slug,
        taskId,
        taskTitle: body.title || 'Task',
        changes: Object.keys(body).filter(k => k !== 'actor'),
        actor: body.actor || 'yusif',
      },
      actor: body.actor || 'yusif',
      timestamp: Date.now(),
    });

    return NextResponse.json({ success: true, data: project });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ success: false, error: 'Failed to update task' }, { status: 500 });
  }
}
