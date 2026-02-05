import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Project from '@/models/Project';
import { emit } from '@/lib/events';

/**
 * Link a GitHub repository to a project
 * 
 * POST: { projectId: string, githubRepo: string }
 * GET:  ?projectId=xxx — get current link
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { projectId, githubRepo } = body;

    if (!projectId || !githubRepo) {
      return NextResponse.json({ error: 'projectId and githubRepo are required' }, { status: 400 });
    }

    // Normalize repo: accept full URL or owner/repo format
    let normalizedRepo = githubRepo.trim();
    // Strip trailing .git
    normalizedRepo = normalizedRepo.replace(/\.git$/, '');
    // Extract owner/repo from full URL
    const urlMatch = normalizedRepo.match(/github\.com\/([^/]+\/[^/]+)/);
    if (urlMatch) {
      normalizedRepo = urlMatch[1];
    }

    let project = await Project.findOne({ slug: projectId });
    if (!project && /^[0-9a-fA-F]{24}$/.test(projectId)) {
      project = await Project.findById(projectId);
    }

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    project.githubRepo = normalizedRepo;
    await project.save();

    emit({
      type: 'project_updated',
      data: {
        projectId: project._id.toString(),
        projectSlug: project.slug,
        action: 'github_linked',
        githubRepo: normalizedRepo,
      },
      actor: 'yusif',
      timestamp: Date.now(),
    });

    return NextResponse.json({
      success: true,
      data: {
        projectId: project._id.toString(),
        slug: project.slug,
        githubRepo: normalizedRepo,
        webhookUrl: `/api/github/webhook`,
      },
    });
  } catch (error) {
    console.error('GitHub link error:', error);
    return NextResponse.json({ error: 'Failed to link repository' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    let project = await Project.findOne({ slug: projectId }).select('githubRepo slug');
    if (!project && /^[0-9a-fA-F]{24}$/.test(projectId)) {
      project = await Project.findById(projectId).select('githubRepo slug');
    }

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        githubRepo: project.githubRepo || '',
        webhookUrl: `/api/github/webhook`,
      },
    });
  } catch (error) {
    console.error('GitHub link GET error:', error);
    return NextResponse.json({ error: 'Failed to get repository link' }, { status: 500 });
  }
}
