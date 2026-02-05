import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Project from '@/models/Project';
import Comment from '@/models/Comment';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const q = new URL(request.url).searchParams.get('q')?.toLowerCase() || '';
    if (!q || q.length < 2) return NextResponse.json({ success: true, data: { projects: [], tasks: [], comments: [] } });

    const projects = await Project.find({ status: { $ne: 'deleted' } });
    const matchedProjects: any[] = [];
    const matchedTasks: any[] = [];

    for (const p of projects) {
      if (p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)) {
        matchedProjects.push({ _id: p._id, name: p.name, slug: p.slug, type: p.type });
      }
      for (const comp of p.components) {
        for (const phase of comp.phases) {
          for (const task of phase.tasks) {
            if (task.title.toLowerCase().includes(q) || task.description?.toLowerCase().includes(q) || task.tags?.some((t: string) => t.toLowerCase().includes(q))) {
              matchedTasks.push({
                projectSlug: p.slug, projectName: p.name, componentName: comp.name,
                phaseName: phase.name, taskId: task.id, title: task.title,
                status: task.status, priority: task.priority,
              });
            }
          }
        }
      }
    }

    const comments = await Comment.find({ text: { $regex: q, $options: 'i' } }).limit(20).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: { projects: matchedProjects, tasks: matchedTasks, comments },
      counts: { projects: matchedProjects.length, tasks: matchedTasks.length, comments: comments.length },
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ success: false, error: 'Search failed' }, { status: 500 });
  }
}
