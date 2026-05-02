export interface Subtask {
  id: string;
  name: string;
  done: boolean;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  done: boolean;
  expanded: boolean;
  subtasks: Subtask[];
  createdAt: number;
}

export type FilterMode = 'all' | 'active' | 'done';

export interface TaskStore {
  tasks: Task[];
  filter: FilterMode;
}
