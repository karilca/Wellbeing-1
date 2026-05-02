import type { Task, Subtask } from '../types/task';

export function createTask(name: string): Task {
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    description: '',
    done: false,
    expanded: true,
    subtasks: [],
    createdAt: Date.now(),
  };
}

export function createSubtask(name: string): Subtask {
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    done: false,
  };
}

export function subtaskProgress(task: Task): number {
  if (!task.subtasks.length) return task.done ? 100 : 0;
  return Math.round(
    (task.subtasks.filter((s) => s.done).length / task.subtasks.length) * 100
  );
}

export function overallProgress(tasks: Task[]): number {
  const items: boolean[] = [];
  tasks.forEach((t) => {
    items.push(t.done);
    t.subtasks.forEach((s) => items.push(s.done));
  });
  if (!items.length) return 0;
  return Math.round((items.filter(Boolean).length / items.length) * 100);
}

export function countStats(tasks: Task[]) {
  return {
    total: tasks.length,
    done: tasks.filter((t) => t.done).length,
    inProgress: tasks.filter((t) => !t.done && t.subtasks.some((s) => s.done)).length,
  };
}
