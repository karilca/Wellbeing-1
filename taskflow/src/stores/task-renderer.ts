import type { Task, Subtask } from '../types/task';
import { subtaskProgress } from '../lib/task-utils';

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderSubtask(task: Task, sub: Subtask, isEditing: boolean): string {
  if (isEditing) {
    return `
      <div class="subtask editing" data-sub-id="${sub.id}">
        <input
          class="sub-edit-input"
          value="${esc(sub.name)}"
          data-tid="${task.id}"
          data-sid="${sub.id}"
          maxlength="120"
        />
        <button class="icon-btn" data-action="save-sub-edit" data-tid="${task.id}" data-sid="${sub.id}" title="Save">
          <svg width="12" height="12" viewBox="0 0 12 12"><path d="M1.5 6l3 3 6-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
        </button>
        <button class="icon-btn danger" data-action="cancel-sub-edit" title="Cancel">
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
      </div>
    `;
  }

  return `
    <div class="subtask${sub.done ? ' done' : ''}" data-sub-id="${sub.id}">
      <button class="checkbox sm${sub.done ? ' checked' : ''}" data-action="toggle-sub" data-tid="${task.id}" data-sid="${sub.id}" aria-label="Toggle subtask">
        ${sub.done ? `<svg width="8" height="8" viewBox="0 0 8 8"><path d="M1 4l2 2 4-4" stroke="#0d0d0f" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>` : ''}
      </button>
      <span class="sub-name">${esc(sub.name)}</span>
      <button class="icon-btn subtle" data-action="start-sub-edit" data-tid="${task.id}" data-sid="${sub.id}" title="Edit">
        <svg width="11" height="11" viewBox="0 0 11 11"><path d="M7.5 1.5l2 2-6 6H1.5v-2l6-6z" stroke="currentColor" stroke-width="1" fill="none" stroke-linejoin="round"/></svg>
      </button>
      <button class="icon-btn subtle danger" data-action="delete-sub" data-tid="${task.id}" data-sid="${sub.id}" title="Delete subtask">
        <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>
    </div>
  `;
}

function renderTaskBody(task: Task, editingSubId: string | null): string {
  const sp = subtaskProgress(task);
  const doneCount = task.subtasks.filter((s) => s.done).length;

  if (task.expanded) {
    const subsHtml = task.subtasks
      .map((s) => renderSubtask(task, s, editingSubId === s.id))
      .join('');

    return `
      <div class="task-body">
        ${task.description ? `<p class="task-desc">${esc(task.description)}</p>` : ''}

        ${
          task.subtasks.length
            ? `
          <div class="subtask-header">
            <span class="subtask-header-label">Subtasks</span>
            <span class="subtask-count-badge">${doneCount}/${task.subtasks.length}</span>
            <div class="sub-track"><div class="sub-fill" style="width:${sp}%"></div></div>
          </div>
          <div class="subtask-list">${subsHtml}</div>
        `
            : ''
        }

        <div class="add-sub-row">
          <input class="add-sub-input" type="text" placeholder="Add subtask..." data-tid="${task.id}" maxlength="120" />
          <button class="add-sub-btn" data-action="add-sub" data-tid="${task.id}">
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  return '';
}

function renderEditForm(task: Task): string {
  return `
    <div class="edit-form">
      <div class="edit-field">
        <label class="edit-label">Name</label>
        <input class="edit-input" data-edit-name="${task.id}" value="${esc(task.name)}" maxlength="120" />
      </div>
      <div class="edit-field">
        <label class="edit-label">Description <span class="optional">optional</span></label>
        <textarea class="edit-textarea" data-edit-desc="${task.id}" placeholder="Add notes or details...">${esc(task.description)}</textarea>
      </div>
      <div class="edit-actions">
        <button class="btn-ghost" data-action="cancel-edit" data-id="${task.id}">Cancel</button>
        <button class="btn-primary" data-action="save-edit" data-id="${task.id}">Save</button>
      </div>
    </div>
  `;
}

export function renderTask(
  task: Task,
  isEditing: boolean,
  editingSubId: string | null
): HTMLElement {
  const el = document.createElement('article');
  el.className = `task-item${task.done && !isEditing ? ' done' : ''}${isEditing ? ' editing-mode' : ''}`;
  el.dataset.taskId = task.id;

  const sp = subtaskProgress(task);
  const hasSubs = task.subtasks.length > 0;
  const doneCount = task.subtasks.filter((s) => s.done).length;

  el.innerHTML = `
    <header class="task-header">
      <button class="checkbox${task.done ? ' checked' : ''}" data-action="toggle-task" data-id="${task.id}" aria-label="Toggle task complete">
        ${task.done ? `<svg width="10" height="10" viewBox="0 0 10 10"><path d="M1.5 5l2.5 2.5 5-5" stroke="#0d0d0f" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>` : ''}
      </button>

      <div class="task-summary" data-action="expand" data-id="${task.id}">
        <span class="task-name">${esc(task.name)}</span>
        ${task.description && !task.expanded ? `<span class="task-desc-peek">${esc(task.description)}</span>` : ''}
        ${hasSubs && !task.expanded ? `<span class="sub-peek">${doneCount}/${task.subtasks.length} subtasks · ${sp}%</span>` : ''}
      </div>

      <div class="task-actions">
        <button class="icon-btn${isEditing ? ' active' : ''}" data-action="toggle-edit" data-id="${task.id}" title="Edit">
          <svg width="13" height="13" viewBox="0 0 13 13"><path d="M9.5 1.5l2 2-7.5 7.5H2v-2L9.5 1.5z" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linejoin="round"/></svg>
        </button>
        <button class="icon-btn" data-action="expand" data-id="${task.id}" title="${task.expanded ? 'Collapse' : 'Expand'}">
          <svg width="12" height="12" viewBox="0 0 12 12" style="transform: rotate(${task.expanded ? 180 : 0}deg); transition: transform 0.2s ease">
            <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          </svg>
        </button>
        <button class="icon-btn danger" data-action="delete-task" data-id="${task.id}" title="Delete task">
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
      </div>
    </header>

    ${isEditing ? renderEditForm(task) : renderTaskBody(task, editingSubId)}
  `;

  return el;
}

export function renderEmpty(filter: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'empty-state';
  const messages: Record<string, string> = {
    all: 'No tasks yet — add one above',
    active: 'Nothing active right now',
    done: 'Nothing completed yet',
  };
  el.innerHTML = `
    <div class="empty-icon">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="6" y="8" width="20" height="18" rx="3" stroke="currentColor" stroke-width="1.5"/>
        <path d="M11 14h10M11 19h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </div>
    <p>${messages[filter] ?? messages.all}</p>
  `;
  return el;
}
