import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Project from '@/models/Project';
import crypto from 'crypto';
import { emit } from '@/lib/events';

function findProject(id: string) {
  const filter = /^[0-9a-fA-F]{24}$/.test(id)
    ? { $or: [{ slug: id }, { _id: id }] }
    : { slug: id };
  return filter;
}

// GET single project
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    let project = await Project.findOne({ slug: id });
    if (!project && /^[0-9a-fA-F]{24}$/.test(id)) {
      project = await Project.findById(id);
    }
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: project });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch project' }, { status: 500 });
  }
}

// PUT update project (supports action-based updates)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const filter = findProject(id);

    // Find the project first
    let project = await Project.findOne(filter);
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    if (body.action) {
      switch (body.action) {
        case 'add-component': {
          const newComponent = {
            id: crypto.randomUUID(),
            name: body.name,
            icon: body.icon || '📦',
            type: body.type || 'other',
            phases: [],
          };
          project.components.push(newComponent);
          break;
        }

        case 'add-phase': {
          const comp = project.components.find((c: any) => c.id === body.componentId);
          if (!comp) {
            return NextResponse.json({ success: false, error: 'Component not found' }, { status: 404 });
          }
          const maxOrder = comp.phases.length > 0
            ? Math.max(...comp.phases.map((p: any) => p.order || 0))
            : 0;
          const newPhase = {
            id: crypto.randomUUID(),
            name: body.name,
            description: body.description || '',
            order: maxOrder + 1,
            status: body.status || 'active',
            tasks: [],
          };
          comp.phases.push(newPhase);
          break;
        }

        case 'add-task': {
          let targetPhase = null;
          for (const comp of project.components) {
            const phase = comp.phases.find((p: any) => p.id === body.phaseId);
            if (phase) {
              targetPhase = phase;
              break;
            }
          }
          if (!targetPhase) {
            return NextResponse.json({ success: false, error: 'Phase not found' }, { status: 404 });
          }
          const newTask = {
            id: crypto.randomUUID(),
            title: body.title,
            description: body.description || '',
            status: body.status || 'waiting',
            priority: body.priority || 'medium',
            dueDate: '',
            estimatedHours: 0,
            tags: [],
            notes: [],
          };
          targetPhase.tasks.push(newTask);
          break;
        }

        default:
          return NextResponse.json({ success: false, error: `Unknown action: ${body.action}` }, { status: 400 });
      }

      await project.save();
    } else {
      // Generic update (name, description, status, etc.)
      const { action, ...updateData } = body;
      project = await Project.findOneAndUpdate(
        filter,
        updateData,
        { new: true, runValidators: true }
      );
    }

    // Emit SSE event for real-time updates
    if (project) {
      emit({
        type: 'project_updated',
        data: {
          projectId: project._id.toString(),
          projectSlug: project.slug,
          action: body.action || 'update',
          actor: body.actor || 'yusif',
        },
        actor: body.actor || 'yusif',
        timestamp: Date.now(),
      });
    }

    return NextResponse.json({ success: true, data: project });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ success: false, error: 'Failed to update project' }, { status: 500 });
  }
}

// DELETE project
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const filter = findProject(id);
    const project = await Project.findOneAndDelete(filter);
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete project' }, { status: 500 });
  }
}
