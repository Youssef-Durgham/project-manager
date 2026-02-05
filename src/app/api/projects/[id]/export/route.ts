import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Project from '@/models/Project';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';

    let project = await Project.findOne({ slug: id }).lean();
    if (!project && /^[0-9a-fA-F]{24}$/.test(id)) project = await Project.findById(id).lean();
    if (!project) return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });

    if (format === 'csv') {
      // Flatten tasks into CSV rows
      const rows: string[][] = [];
      const headers = [
        'Component', 'Phase', 'Task ID', 'Title', 'Description', 'Status', 'Priority',
        'Assignee', 'Due Date', 'Estimated Hours', 'Actual Hours', 'Tags',
        'Subtasks Total', 'Subtasks Done', 'Criteria Total', 'Criteria Done',
        'Dependencies', 'Recurring', 'Created At'
      ];
      rows.push(headers);

      for (const comp of (project as any).components || []) {
        for (const phase of comp.phases || []) {
          for (const task of phase.tasks || []) {
            const subtasksDone = (task.subtasks || []).filter((s: any) => s.checked).length;
            const criteriaDone = (task.acceptanceCriteria || []).filter((c: any) => c.checked).length;
            rows.push([
              comp.name,
              phase.name,
              task.id,
              task.title,
              (task.description || '').replace(/"/g, '""'),
              task.status,
              task.priority,
              task.assignee || '',
              task.dueDate || '',
              String(task.estimatedHours || 0),
              String(task.actualHours || 0),
              (task.tags || []).join('; '),
              String((task.subtasks || []).length),
              String(subtasksDone),
              String((task.acceptanceCriteria || []).length),
              String(criteriaDone),
              (task.dependencies || []).join('; '),
              task.recurring?.enabled ? task.recurring.frequency : '',
              task.createdAt ? new Date(task.createdAt).toISOString() : '',
            ]);
          }
        }
      }

      const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
      
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${(project as any).slug || 'project'}-tasks.csv"`,
        },
      });
    }

    // Default: JSON export
    return new NextResponse(JSON.stringify(project, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${(project as any).slug || 'project'}-export.json"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ success: false, error: 'Export failed' }, { status: 500 });
  }
}
