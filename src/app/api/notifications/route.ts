import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Notification from '@/models/Notification';

// GET /api/notifications - List notifications for the current user
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '30');
    const unreadOnly = searchParams.get('unread') === 'true';

    const filter: any = { userId: user.username };
    if (unreadOnly) filter.read = false;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit);

    const unreadCount = await Notification.countDocuments({ userId: user.username, read: false });

    return NextResponse.json({ 
      success: true, 
      data: notifications,
      unreadCount,
    });
  } catch (err) {
    console.error('Notifications GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/notifications - Mark notifications as read
export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const body = await req.json();
    const { notificationId, markAllRead } = body;

    if (markAllRead) {
      await Notification.updateMany(
        { userId: user.username, read: false },
        { $set: { read: true } }
      );
    } else if (notificationId) {
      await Notification.findOneAndUpdate(
        { _id: notificationId, userId: user.username },
        { $set: { read: true } }
      );
    }

    const unreadCount = await Notification.countDocuments({ userId: user.username, read: false });

    return NextResponse.json({ success: true, unreadCount });
  } catch (err) {
    console.error('Notifications PUT error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/notifications - Clear notifications
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { searchParams } = new URL(req.url);
    const notificationId = searchParams.get('id');

    if (notificationId) {
      await Notification.findOneAndDelete({ _id: notificationId, userId: user.username });
    } else {
      // Clear all read notifications
      await Notification.deleteMany({ userId: user.username, read: true });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Notifications DELETE error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
