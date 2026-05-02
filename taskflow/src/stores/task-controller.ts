import type { Task, FilterMode } from '../types/task';
import { createTask, createSubtask, overallProgress, countStats } from '../lib/task-utils';
import { loadTasks, saveTasks } from '../lib/storage';
import { renderTask, renderEmpty } from './task-renderer';

interface EditState {
  taskId: string | null;
  subId: string | null;
}

class TaskController {
  private tasks: Task[] = [];
  private filter: FilterMode = 'all';
  private editing: EditState = { taskId: null, subId: null };

  private listEl!: HTMLElement;
  private statTotal!: HTMLElement;
  private statDone!: HTMLElement;
  private statProg!: HTMLElement;
  private progressFill!: HTMLElement;
  private progressPct!: HTMLElement;

  init() {
    this.tasks = loadTasks();

    this.listEl = document.getElementById('task-list')!;
    this.statTotal = document.getElementById('stat-total')!;
    this.statDone = document.getElementById('stat-done')!;
    this.statProg = document.getElementById('stat-prog')!;
    this.progressFill = document.getElementById('progress-fill')!;
    this.progressPct = document.getElementById('progress-pct')!;

    this.bindAddTask();
    this.bindFilterTabs();
    this.bindListEvents();

    this.render();
  }

  private save() {
    saveTasks(this.tasks);
  }

  private visibleTasks(): Task[] {
    if (this.filter === 'active') return this.tasks.filter((t) => !t.done);
    if (this.filter === 'done') return this.tasks.filter((t) => t.done);
    return this.tasks;
  }

  private render() {
    this.renderStats();
    this.renderList();
  }

  private renderStats() {
    const { total, done, inProgress } = countStats(this.tasks);
    const pct = overallProgress(this.tasks);

    this.statTotal.textContent = String(total);
    this.statDone.textContent = String(done);
    this.statProg.textContent = String(inProgress);
    this.progressFill.style.width = `${pct}%`;
    this.progressPct.textContent = `${pct}%`;
    document.getElementById('progress-bar-track')?.setAttribute('aria-valuenow', String(pct));
  }

  private renderList() {
    this.listEl.innerHTML = '';
    const visible = this.visibleTasks();

    if (!visible.length) {
      this.listEl.appendChild(renderEmpty(this.filter));
      return;
    }

    visible.forEach((task) => {
      const isEditing = this.editing.taskId === task.id && this.editing.subId === null;
      const editingSubId = this.editing.taskId === task.id ? this.editing.subId : null;
      const el = renderTask(task, isEditing, editingSubId);
      this.listEl.appendChild(el);
    });

    if (this.editing.taskId) {
      const input = this.listEl.querySelector<HTMLInputElement>(
        `[data-edit-name="${this.editing.taskId}"]`
      );
      if (input) { input.focus(); input.select(); }

      const subInput = this.listEl.querySelector<HTMLInputElement>(
        `[data-sub-edit-input="${this.editing.subId}"]`
      );
      if (subInput) { subInput.focus(); subInput.select(); }
    }
  }

  private bindAddTask() {
    const input = document.getElementById('new-task-input') as HTMLInputElement;
    const btn = document.getElementById('add-task-btn')!;

    const submit = () => {
      const name = input.value.trim();
      if (!name) return;
      this.tasks.unshift(createTask(name));
      input.value = '';
      this.save();
      this.render();
    };

    btn.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  }

  private bindFilterTabs() {
    document.getElementById('filter-tabs')!.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-filter]');
      if (!btn) return;

      this.filter = btn.dataset.filter as FilterMode;

      document.querySelectorAll('#filter-tabs .tab').forEach((t) => {
        const active = t === btn;
        t.classList.toggle('active', active);
        t.setAttribute('aria-selected', String(active));
      });

      this.render();
    });
  }

  private bindListEvents() {
    this.listEl.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const btn = target.closest<HTMLElement>('[data-action]');
      if (!btn) return;

      const action = btn.dataset.action!;
      const id = btn.dataset.id ?? '';
      const tid = btn.dataset.tid ?? '';
      const sid = btn.dataset.sid ?? '';

      switch (action) {
        case 'toggle-task': this.toggleTask(id); break;
        case 'expand': this.toggleExpand(id); break;
        case 'toggle-edit': this.toggleEdit(id); break;
        case 'save-edit': this.saveEdit(id); break;
        case 'cancel-edit': this.cancelEdit(); break;
        case 'delete-task': this.deleteTask(id); break;
        case 'toggle-sub': this.toggleSub(tid, sid); break;
        case 'add-sub': this.addSubFromRow(tid); break;
        case 'start-sub-edit': this.startSubEdit(tid, sid); break;
        case 'save-sub-edit': this.saveSubEdit(tid, sid); break;
        case 'cancel-sub-edit': this.cancelSubEdit(); break;
        case 'delete-sub': this.deleteSub(tid, sid); break;
      }
    });

    this.listEl.addEventListener('keydown', (e) => {
      const target = e.target as HTMLInputElement;

      if (target.classList.contains('add-sub-input') && e.key === 'Enter') {
        this.addSubFromInput(target);
      }

      if (target.dataset.subEditInput && e.key === 'Enter') {
        const [tid, sid] = [target.dataset.tid!, target.dataset.sid!];
        this.saveSubEdit(tid, sid);
      }

      if (target.dataset.subEditInput && e.key === 'Escape') {
        this.cancelSubEdit();
      }

      if (target.dataset.editName && e.key === 'Escape') {
        this.cancelEdit();
      }
    });
  }

  private getTask(id: string): Task | undefined {
    return this.tasks.find((t) => t.id === id);
  }

  private toggleTask(id: string) {
    const task = this.getTask(id);
    if (!task) return;
    task.done = !task.done;
    if (task.done) task.subtasks.forEach((s) => (s.done = true));
    this.save();
    this.render();
  }

  private toggleExpand(id: string) {
    const task = this.getTask(id);
    if (!task) return;
    task.expanded = !task.expanded;
    if (!task.expanded && this.editing.taskId === id) {
      this.editing = { taskId: null, subId: null };
    }
    this.save();
    this.render();
  }

  private toggleEdit(id: string) {
    if (this.editing.taskId === id && this.editing.subId === null) {
      this.cancelEdit();
      return;
    }
    const task = this.getTask(id);
    if (!task) return;
    task.expanded = true;
    this.editing = { taskId: id, subId: null };
    this.save();
    this.render();
  }

  private saveEdit(id: string) {
    const task = this.getTask(id);
    if (!task) return;

    const nameEl = this.listEl.querySelector<HTMLInputElement>(`[data-edit-name="${id}"]`);
    const descEl = this.listEl.querySelector<HTMLTextAreaElement>(`[data-edit-desc="${id}"]`);

    if (nameEl?.value.trim()) task.name = nameEl.value.trim();
    if (descEl) task.description = descEl.value.trim();

    this.editing = { taskId: null, subId: null };
    this.save();
    this.render();
  }

  private cancelEdit() {
    this.editing = { taskId: null, subId: null };
    this.render();
  }

  private deleteTask(id: string) {
    this.tasks = this.tasks.filter((t) => t.id !== id);
    if (this.editing.taskId === id) {
      this.editing = { taskId: null, subId: null };
    }
    this.save();
    this.render();
  }

  private toggleSub(taskId: string, subId: string) {
    const task = this.getTask(taskId);
    if (!task) return;
    const sub = task.subtasks.find((s) => s.id === subId);
    if (!sub) return;
    sub.done = !sub.done;
    task.done = task.subtasks.length > 0 && task.subtasks.every((s) => s.done);
    this.save();
    this.render();
  }

  private addSubFromRow(taskId: string) {
    const input = this.listEl.querySelector<HTMLInputElement>(
      `.add-sub-input[data-tid="${taskId}"]`
    );
    if (input) this.addSubFromInput(input);
  }

  private addSubFromInput(input: HTMLInputElement) {
    const name = input.value.trim();
    if (!name) return;
    const taskId = input.dataset.tid!;
    const task = this.getTask(taskId);
    if (!task) return;
    task.subtasks.push(createSubtask(name));
    input.value = '';
    this.save();
    this.render();
  }

  private startSubEdit(taskId: string, subId: string) {
    this.editing = { taskId, subId };
    this.render();
  }

  private saveSubEdit(taskId: string, subId: string) {
    const task = this.getTask(taskId);
    if (!task) return;
    const sub = task.subtasks.find((s) => s.id === subId);
    if (!sub) return;

    const input = this.listEl.querySelector<HTMLInputElement>(
      `[data-sub-edit-input="${subId}"]`
    );
    if (input?.value.trim()) sub.name = input.value.trim();

    this.editing = { taskId: null, subId: null };
    this.save();
    this.render();
  }

  private cancelSubEdit() {
    this.editing = { taskId: null, subId: null };
    this.render();
  }

  private deleteSub(taskId: string, subId: string) {
    const task = this.getTask(taskId);
    if (!task) return;
    task.subtasks = task.subtasks.filter((s) => s.id !== subId);
    this.save();
    this.render();
  }
}

export const taskController = new TaskController();
