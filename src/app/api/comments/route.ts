import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Comment from '@/models/Comment';
import User from '@/models/User';
import { notifyComment } from '@/lib/notifications';
import { emit } from '@/lib/events';

// GET comments for a project/phase/task
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const phaseId = searchParams.get('phaseId');
    const taskId = searchParams.get('taskId');

    const filter: any = {};
    if (projectId) filter.projectId = projectId;
    if (phaseId) filter.phaseId = phaseId;
    if (taskId) filter.taskId = taskId;

    const comments = await Comment.find(filter).sort({ createdAt: 1 });
    return NextResponse.json({ success: true, data: comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch comments' }, { status: 500 });
  }
}

// POST create comment
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const comment = await Comment.create(body);
    
    // Notify other users about the comment
    try {
      const allUsers = await User.find({ isActive: true }).select('username');
      const usernames = allUsers.map((u: any) => u.username);
      notifyComment({
        taskTitle: body.taskTitle || undefined,
        author: body.author || 'unknown',
        projectSlug: body.projectSlug || '',
        taskId: body.taskId || undefined,
        notifyUsers: usernames,
      }).catch(() => {});
    } catch {}
    
    // Emit SSE event
    emit({
      type: 'comment_added',
      data: {
        projectId: body.projectId,
        projectSlug: body.projectSlug,
        taskId: body.taskId,
        commentId: comment._id?.toString(),
        author: body.author || 'unknown',
        actor: body.author || 'unknown',
      },
      actor: body.author || 'unknown',
      timestamp: Date.now(),
    });

    return NextResponse.json({ success: true, data: comment }, { status: 201 });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ success: false, error: 'Failed to create comment' }, { status: 500 });
  }
}
