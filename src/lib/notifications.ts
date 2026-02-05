import { connectDB } from './mongodb';
import Notification from '@/models/Notification';
import { NotificationType } from '@/models/Notification';

/**
 * Create a notification for a user
 */
export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}) {
  try {
    await connectDB();
    await Notification.create(params);
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}

/**
 * Notify about task status change
 */
export async function notifyStatusChange(params: {
  taskTitle: string;
  oldStatus: string;
  newStatus: string;
  actor: string;
  assignee?: string;
  projectSlug: string;
  taskId: string;
}) {
  const { taskTitle, oldStatus, newStatus, actor, assignee, projectSlug, taskId } = params;
  
  // Notify the assignee if the actor is someone else
  if (assignee && assignee !== actor) {
    await createNotification({
      userId: assignee,
      type: 'status_changed',
      title: `حالة المهمة تغيّرت — Status Changed`,
      message: `"${taskTitle}" moved from ${oldStatus} → ${newStatus} by ${actor}`,
      link: `/project/${projectSlug}?task=${taskId}`,
    });
  }
}

/**
 * Notify about task assignment
 */
export async function notifyTaskAssigned(params: {
  taskTitle: string;
  assignee: string;
  actor: string;
  projectSlug: string;
  taskId: string;
}) {
  const { taskTitle, assignee, actor, projectSlug, taskId } = params;
  
  if (assignee && assignee !== actor) {
    await createNotification({
      userId: assignee,
      type: 'task_assigned',
      title: `تم تعيين مهمة — Task Assigned`,
      message: `"${taskTitle}" was assigned to you by ${actor}`,
      link: `/project/${projectSlug}?task=${taskId}`,
    });
  }
}

/**
 * Notify about new comment
 */
export async function notifyComment(params: {
  taskTitle?: string;
  author: string;
  projectSlug: string;
  taskId?: string;
  notifyUsers: string[];
}) {
  const { taskTitle, author, projectSlug, taskId, notifyUsers } = params;
  
  for (const userId of notifyUsers) {
    if (userId !== author) {
      await createNotification({
        userId,
        type: 'comment',
        title: `تعليق جديد — New Comment`,
        message: taskTitle
          ? `${author} commented on "${taskTitle}"`
          : `${author} left a comment`,
        link: taskId ? `/project/${projectSlug}?task=${taskId}` : `/project/${projectSlug}`,
      });
    }
  }
}

/**
 * Notify about new blocker
 */
export async function notifyBlocker(params: {
  blockerTitle: string;
  author: string;
  projectSlug: string;
  notifyUsers: string[];
}) {
  const { blockerTitle, author, projectSlug, notifyUsers } = params;
  
  for (const userId of notifyUsers) {
    if (userId !== author) {
      await createNotification({
        userId,
        type: 'blocker',
        title: `عائق جديد — New Blocker`,
        message: `${author} reported: "${blockerTitle}"`,
        link: `/project/${projectSlug}`,
      });
    }
  }
}
