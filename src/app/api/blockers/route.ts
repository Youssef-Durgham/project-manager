import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Blocker from '@/models/Blocker';
import Activity from '@/models/Activity';
import User from '@/models/User';
import { notifyBlocker } from '@/lib/notifications';
import { emit } from '@/lib/events';

export async function GET(req: NextRequest) {
  await connectDB();
  const projectId = req.nextUrl.searchParams.get('projectId');
  const status = req.nextUrl.searchParams.get('status');
  
  const filter: any = {};
  if (projectId) filter.projectId = projectId;
  if (status) filter.status = status;
  
  const blockers = await Blocker.find(filter).sort({ createdAt: -1 });
  return NextResponse.json(blockers);
}

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  
  const blocker = await Blocker.create({
    projectId: body.projectId,
    taskId: body.taskId || '',
    author: body.author || 'employee-1',
    type: body.type || 'question',
    title: body.title,
    description: body.description || '',
    priority: body.priority || 'medium',
  });

  // Log activity
  await Activity.create({
    projectId: body.projectId,
    actor: body.author || 'employee-1',
    action: 'created',
    targetType: body.type || 'question',
    targetId: blocker._id.toString(),
    targetName: body.title,
    details: `New ${body.type || 'question'}: ${body.title}`,
  });

  // Notify other users
  try {
    const allUsers = await User.find({ isActive: true }).select('username');
    const usernames = allUsers.map((u: any) => u.username);
    notifyBlocker({
      blockerTitle: body.title,
      author: body.author || 'employee-1',
      projectSlug: body.projectSlug || '',
      notifyUsers: usernames,
    }).catch(() => {});
  } catch {}

  // Emit SSE event
  emit({
    type: 'blocker_changed',
    data: {
      projectId: body.projectId,
      projectSlug: body.projectSlug,
      blockerId: blocker._id.toString(),
      blockerTitle: body.title,
      action: 'created',
      actor: body.author || 'employee-1',
    },
    actor: body.author || 'employee-1',
    timestamp: Date.now(),
  });

  return NextResponse.json(blocker, { status: 201 });
}

export async function PUT(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  const { id, ...update } = body;
  
  if (update.status === 'resolved') {
    update.resolvedAt = new Date();
  }
  
  const blocker = await Blocker.findByIdAndUpdate(id, update, { new: true });
  
  if (blocker && update.status === 'resolved') {
    await Activity.create({
      projectId: blocker.projectId,
      actor: update.resolvedBy || 'yusif',
      action: 'resolved',
      targetType: blocker.type,
      targetId: blocker._id.toString(),
      targetName: blocker.title,
      details: `Resolved: ${update.resolution || 'No details'}`,
    });
  }
  
  // Emit SSE event
  if (blocker) {
    emit({
      type: 'blocker_changed',
      data: {
        projectId: blocker.projectId,
        blockerId: blocker._id.toString(),
        blockerTitle: blocker.title,
        action: update.status === 'resolved' ? 'resolved' : 'updated',
        actor: update.resolvedBy || 'yusif',
      },
      actor: update.resolvedBy || 'yusif',
      timestamp: Date.now(),
    });
  }

  return NextResponse.json(blocker);
}
