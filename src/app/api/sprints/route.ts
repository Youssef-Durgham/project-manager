import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Sprint from '@/models/Sprint';

// GET sprints (optionally by projectId)
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const filter: any = {};
    if (projectId) filter.projectId = projectId;
    const sprints = await Sprint.find(filter).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: sprints });
  } catch (error) {
    console.error('Error fetching sprints:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch sprints' }, { status: 500 });
  }
}

// POST create sprint
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const sprint = await Sprint.create(body);
    return NextResponse.json({ success: true, data: sprint }, { status: 201 });
  } catch (error) {
    console.error('Error creating sprint:', error);
    return NextResponse.json({ success: false, error: 'Failed to create sprint' }, { status: 500 });
  }
}

// PUT update sprint
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
    const sprint = await Sprint.findByIdAndUpdate(id, updates, { new: true });
    if (!sprint) return NextResponse.json({ success: false, error: 'Sprint not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: sprint });
  } catch (error) {
    console.error('Error updating sprint:', error);
    return NextResponse.json({ success: false, error: 'Failed to update sprint' }, { status: 500 });
  }
}

// DELETE sprint
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
    await Sprint.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting sprint:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete sprint' }, { status: 500 });
  }
}
