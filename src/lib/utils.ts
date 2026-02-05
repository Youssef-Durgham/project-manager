import { Project, Component, Phase, Task } from "./types";

export function getAllTasks(project: Project): Task[] {
  const tasks: Task[] = [];
  for (const comp of (project.components || [])) {
    for (const phase of (comp.phases || [])) {
      tasks.push(...(phase.tasks || []));
    }
  }
  return tasks;
}

export function getComponentTasks(component: Component): Task[] {
  const tasks: Task[] = [];
  for (const phase of (component.phases || [])) {
    tasks.push(...(phase.tasks || []));
  }
  return tasks;
}

export function getPhaseTasks(phase: Phase): Task[] {
  return phase.tasks;
}

export function getCompletionPercent(tasks: Task[]): number {
  // Exclude draft tasks from progress calculation
  const activeTasks = tasks.filter((t) => t.status !== "draft");
  if (activeTasks.length === 0) return 0;
  const done = activeTasks.filter((t) => t.status === "done" || t.status === "approved").length;
  return Math.round((done / activeTasks.length) * 100);
}

export function getTaskStats(tasks: Task[]) {
  return {
    total: tasks.length,
    draft: tasks.filter((t) => t.status === "draft").length,
    done: tasks.filter((t) => t.status === "done" || t.status === "approved").length,
    inProgress: tasks.filter((t) => t.status === "in-progress").length,
    ready: tasks.filter((t) => t.status === "ready").length,
    waiting: tasks.filter((t) => t.status === "waiting").length,
    review: tasks.filter((t) => t.status === "review").length,
    revision: tasks.filter((t) => t.status === "revision").length,
  };
}

export function getTotalPhases(project: Project): number {
  let count = 0;
  for (const comp of (project.components || [])) {
    count += (comp.phases || []).length;
  }
  return count;
}
