import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Project from '@/models/Project';

// POST — reorder tasks within a column
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const { taskOrders } = await request.json();
    // taskOrders: Array<{ taskId: string; order: number }>

    let project = await Project.findOne({ slug: id });
    if (!project && /^[0-9a-fA-F]{24}$/.test(id)) project = await Project.findById(id);
    if (!project) return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });

    if (Array.isArray(taskOrders)) {
      const orderMap = new Map(taskOrders.map((o: any) => [o.taskId, o.order]));
      
      for (const component of project.components) {
        for (const phase of component.phases) {
          for (const task of phase.tasks) {
            if (orderMap.has(task.id)) {
              task.order = orderMap.get(task.id);
            }
          }
        }
      }
    }

    await project.save();
    return NextResponse.json({ success: true, data: project });
  } catch (error) {
    console.error('Error reordering tasks:', error);
    return NextResponse.json({ success: false, error: 'Failed to reorder tasks' }, { status: 500 });
  }
}
