import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Project from '@/models/Project';
import Activity from '@/models/Activity';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const { taskIds, updates, actor } = await request.json();
    // updates: { status?, priority?, assignee?, pinned? }

    let project = await Project.findOne({ slug: id });
    if (!project && /^[0-9a-fA-F]{24}$/.test(id)) project = await Project.findById(id);
    if (!project) return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });

    let updated = 0;
    for (const component of project.components) {
      for (const phase of component.phases) {
        for (const task of phase.tasks) {
          if (taskIds.includes(task.id)) {
            const oldStatus = task.status;
            if (updates.status) task.status = updates.status;
            if (updates.priority) task.priority = updates.priority;
            if (updates.assignee !== undefined) task.assignee = updates.assignee;
            if (updates.pinned !== undefined) task.pinned = updates.pinned;
            
            if (updates.status === 'in-progress' && !task.startedAt) task.startedAt = new Date();
            if (updates.status === 'done' && !task.completedAt) task.completedAt = new Date();
            
            if (updates.status && updates.status !== oldStatus) {
              await Activity.create({
                projectId: project._id, actor: actor || 'yusif',
                action: 'task.status', targetType: 'task',
                targetId: task.id, targetName: task.title,
                details: `Bulk: ${task.title} ${oldStatus} → ${updates.status}`,
                metadata: { bulk: true, oldStatus, newStatus: updates.status },
              });
            }
            updated++;
          }
        }
      }
    }

    await project.save();
    return NextResponse.json({ success: true, data: project, updated });
  } catch (error) {
    console.error('Bulk update error:', error);
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
  }
}
