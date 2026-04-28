import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronRight,
  AlertCircle,
  Plus,
  Edit3,
  Trash2,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTasksAPI } from '@/hooks/useTasksAPI';
import type { Task, Project } from '@/hooks/useTasksAPI';

// ─── HELPERS ───

const fmtDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const monthName = (m: number) => MONTH_NAMES[m];
const shortMonth = (m: number) => SHORT_MONTHS[m];
const dayName = (d: Date) => DAY_NAMES[d.getDay()];

const getPriorityColor = (p: string): string => {
  if (p === '1') return '#ef4444';
  if (p === '2') return '#f59e0b';
  if (p === '3') return '#3b82f6';
  return '#5A5F6E';
};

// ─── CALENDAR VIEW ───

export function CalendarView() {
  const { tasks, projects, fetchTasks, fetchProjects, createTask, updateTask, toggleTask, deleteTask } = useTasksAPI();

  const [viewMode, setViewMode] = useState<'agenda' | 'month'>('agenda');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    due: '',
    time: '',
    priority: '4',
    project: '',
    notes: '',
  });
  const [toast, setToast] = useState('');

  const todayStr = useMemo(() => fmtDate(new Date()), []);

  // Fetch on mount + poll tasks every 5s
  useEffect(() => {
    fetchTasks();
    fetchProjects();
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, [fetchTasks, fetchProjects]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 600);
  }, []);

  // Navigation
  const navigateDate = (days: number) => {
    if (viewMode === 'month') {
      const d = new Date(selectedDate);
      d.setMonth(d.getMonth() + (days > 0 ? 1 : -1));
      setSelectedDate(d);
    } else {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + days);
      setSelectedDate(d);
    }
  };

  const goToday = () => setSelectedDate(new Date());

  // Modal helpers
  const openAddModal = () => {
    setEditingTask(null);
    setFormData({ title: '', due: fmtDate(selectedDate), time: '', priority: '4', project: '', notes: '' });
    setIsAddModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      due: task.due || '',
      time: task.time || '',
      priority: task.priority || '4',
      project: task.project || '',
      notes: task.notes || '',
    });
    setIsAddModalOpen(true);
  };

  const saveTask = async () => {
    const title = formData.title.trim();
    if (!title) return;

    if (editingTask) {
      await updateTask(editingTask.id, {
        title,
        due: formData.due,
        time: formData.time,
        priority: formData.priority,
        project: formData.project,
        notes: formData.notes,
      });
      showToast('Task updated');
    } else {
      await createTask({
        title,
        due: formData.due,
        time: formData.time,
        priority: formData.priority,
        project: formData.project,
        notes: formData.notes,
      });
      showToast('Task added');
    }
    setIsAddModalOpen(false);
  };

  const handleDeleteTask = async (id: string) => {
    await deleteTask(id);
    showToast('Task deleted');
  };

  const handleModalDelete = async () => {
    if (!editingTask) return;
    await deleteTask(editingTask.id);
    setIsAddModalOpen(false);
    showToast('Task deleted');
  };

  // Project color helper
  const getProjectColor = useCallback(
    (id?: string): string => {
      const p = projects.find((proj: Project) => proj.id === id);
      return p?.color || '#5A5F6E';
    },
    [projects]
  );

  // ─── WEEK STRIP ───
  const weekDates = useMemo(() => {
    const result: string[] = [];
    const d = new Date(selectedDate);
    const dow = (d.getDay() + 6) % 7; // Monday = 0
    d.setDate(d.getDate() - dow);
    for (let i = 0; i < 7; i++) {
      result.push(fmtDate(d));
      d.setDate(d.getDate() + 1);
    }
    return result;
  }, [selectedDate]);

  // ─── AGENDA DATA ───
  const selectedStr = fmtDate(selectedDate);
  const isSelectedToday = selectedStr === todayStr;

  const dayTasks = useMemo(
    () =>
      tasks
        .filter((t: Task) => t.due === selectedStr && !t.done)
        .sort((a: Task, b: Task) => (a.time || '99:99').localeCompare(b.time || '99:99')),
    [tasks, selectedStr]
  );

  const completedTasks = useMemo(
    () => tasks.filter((t: Task) => t.due === selectedStr && t.done),
    [tasks, selectedStr]
  );

  const overdueTasks = useMemo(
    () => tasks.filter((t: Task) => !t.done && t.due && t.due < todayStr),
    [tasks, todayStr]
  );

  // ─── MONTH GRID ───
  const monthGrid = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDay = (firstDay.getDay() + 6) % 7; // Monday = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();

    const cells: { ds: string | null; day: number; isCurrentMonth: boolean }[] = [];

    // Previous month filler
    for (let i = startDay - 1; i >= 0; i--) {
      cells.push({ ds: null, day: prevDays - i, isCurrentMonth: false });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ ds, day: d, isCurrentMonth: true });
    }

    // Next month filler to fill to complete rows
    const total = startDay + daysInMonth;
    const rem = total % 7 === 0 ? 0 : 7 - (total % 7);
    for (let d = 1; d <= rem; d++) {
      cells.push({ ds: null, day: d, isCurrentMonth: false });
    }

    return cells;
  }, [selectedDate]);

  // ─── TASK ITEM ───
  const renderTaskItem = (task: Task) => {
    const projColor = getProjectColor(task.project);
    const projName = projects.find((p: Project) => p.id === task.project)?.name;

    return (
      <div key={task.id} className="flex items-start gap-3 p-3 bg-card border border-border rounded-lg group">
        <button
          onClick={() => toggleTask(task.id)}
          className={cn(
            'w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 transition-colors flex-shrink-0',
            task.done
              ? 'bg-green-500 border-green-500'
              : 'border-muted-foreground hover:border-green-500'
          )}
        >
          {task.done && <Check className="w-3 h-3 text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className={cn('text-sm', task.done && 'line-through text-muted-foreground')}>
            {task.title}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {task.time && (
              <span className="text-[10px] text-muted-foreground font-mono">{task.time}</span>
            )}
            {task.project && projName && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded border"
                style={{
                  color: projColor,
                  borderColor: `${projColor}40`,
                  backgroundColor: `${projColor}15`,
                }}
              >
                {projName}
              </span>
            )}
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: getPriorityColor(task.priority) }}
            />
          </div>
        </div>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={() => openEditModal(task)}
            className="p-1.5 hover:bg-muted rounded"
          >
            <Edit3 className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => handleDeleteTask(task.id)}
            className="p-1.5 hover:bg-muted rounded"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </div>
    );
  };

  // ─── RENDER ───
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">
            {monthName(selectedDate.getMonth())}{' '}
            <span className="text-gold">{selectedDate.getFullYear()}</span>
          </h1>
          <div className="flex gap-1">
            <button
              onClick={() => navigateDate(-1)}
              className="p-1.5 hover:bg-muted rounded"
              aria-label="Previous"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
            <button
              onClick={goToday}
              className="px-3 py-1.5 text-xs bg-muted rounded hover:bg-muted/80"
            >
              Today
            </button>
            <button
              onClick={() => navigateDate(1)}
              className="p-1.5 hover:bg-muted rounded"
              aria-label="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex gap-1">
          <button
            onClick={() => setViewMode('agenda')}
            className={cn(
              'px-3 py-1.5 rounded text-xs transition-colors',
              viewMode === 'agenda'
                ? 'bg-gold/10 text-gold border border-gold/30'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            Agenda
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={cn(
              'px-3 py-1.5 rounded text-xs transition-colors',
              viewMode === 'month'
                ? 'bg-gold/10 text-gold border border-gold/30'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            Month
          </button>
        </div>
      </div>

      {/* Agenda mode */}
      {viewMode === 'agenda' && (
        <>
          {/* Week strip */}
          <div className="flex gap-0.5 p-3 bg-card border-b border-border flex-shrink-0">
            {weekDates.map((ds, i) => {
              const isToday = ds === todayStr;
              const isSelected = ds === selectedStr;
              const dayNum = new Date(ds).getDate();
              return (
                <button
                  key={ds}
                  onClick={() => setSelectedDate(new Date(ds))}
                  className={cn(
                    'flex-1 text-center py-2 rounded-lg transition-colors',
                    isSelected ? 'bg-gold/10 border border-gold/30' : 'hover:bg-muted',
                    isToday && !isSelected && 'bg-red-500/10 border border-red-500/30'
                  )}
                >
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]}
                  </div>
                  <div
                    className={cn(
                      'text-lg font-semibold',
                      isToday && 'text-red-500',
                      isSelected && 'text-gold'
                    )}
                  >
                    {dayNum}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Agenda content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Date header */}
            <div>
              <h2 className="text-xl font-bold">
                {isSelectedToday ? 'Today' : dayName(selectedDate)}
              </h2>
              <p className="text-sm text-muted-foreground">
                {shortMonth(selectedDate.getMonth())} {selectedDate.getDate()},{' '}
                {selectedDate.getFullYear()}
              </p>
            </div>

            {/* Overdue — only shown on today */}
            {isSelectedToday && overdueTasks.length > 0 && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-red-500 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> Overdue
                  </span>
                  <button
                    onClick={() =>
                      overdueTasks.forEach((t: Task) => updateTask(t.id, { due: todayStr }))
                    }
                    className="text-xs text-red-500 hover:underline"
                  >
                    Reschedule all
                  </button>
                </div>
                {overdueTasks.map(renderTaskItem)}
              </div>
            )}

            {/* Tasks for selected day */}
            <div className="space-y-2">
              {dayTasks.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No tasks for this day</p>
              ) : (
                dayTasks.map(renderTaskItem)
              )}
            </div>

            {/* Completed */}
            {completedTasks.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm text-muted-foreground mb-2">Completed</h4>
                <div className="space-y-2 opacity-60">{completedTasks.map(renderTaskItem)}</div>
              </div>
            )}

            {/* Add task button */}
            <button
              onClick={openAddModal}
              className="w-full flex items-center gap-2 p-3 text-muted-foreground hover:text-gold hover:bg-gold/5 border border-dashed border-border hover:border-gold/30 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" /> Add task
            </button>
          </div>
        </>
      )}

      {/* Month mode */}
      {viewMode === 'month' && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-7 gap-px bg-border">
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => (
              <div
                key={d}
                className="p-2 bg-card text-[10px] text-muted-foreground uppercase tracking-wider text-center"
              >
                {d}
              </div>
            ))}
            {monthGrid.map((cell, idx) => {
              if (!cell.isCurrentMonth) {
                return (
                  <div
                    key={`filler-${idx}`}
                    className="p-2 min-h-[80px] bg-card border border-border opacity-35"
                  >
                    <div className="text-xs">{cell.day}</div>
                  </div>
                );
              }

              const ds = cell.ds!;
              const isToday = ds === todayStr;
              const cellTasks = tasks.filter((t: Task) => t.due === ds && !t.done);

              return (
                <div
                  key={ds}
                  onClick={() => {
                    setSelectedDate(new Date(ds));
                    setViewMode('agenda');
                  }}
                  className={cn(
                    'p-2 min-h-[80px] bg-card border border-border cursor-pointer hover:bg-muted transition-colors',
                    isToday && 'ring-2 ring-red-500/50'
                  )}
                >
                  <div className={cn('text-xs font-medium', isToday && 'text-red-500')}>
                    {cell.day}
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {cellTasks.slice(0, 3).map((t: Task) => {
                      const col = getProjectColor(t.project);
                      return (
                        <div
                          key={t.id}
                          className="text-[9px] truncate px-1 py-0.5 rounded"
                          style={{
                            backgroundColor: `${col}20`,
                            color: col,
                          }}
                        >
                          {t.title}
                        </div>
                      );
                    })}
                    {cellTasks.length > 3 && (
                      <div className="text-[9px] text-muted-foreground">
                        +{cellTasks.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 bg-card border border-border rounded-xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold mb-4 text-gold">
              {editingTask ? 'Edit' : 'Add'} Task
            </h3>
            <div className="space-y-3">
              {/* Title */}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && saveTask()}
                  className="w-full mt-1 px-3 py-2 bg-muted rounded-lg text-sm outline-none focus:ring-1 focus:ring-gold/50"
                  placeholder="Task name..."
                  autoFocus
                />
              </div>

              {/* Due + Time */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.due}
                    onChange={(e) => setFormData({ ...formData, due: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-muted rounded-lg text-sm outline-none focus:ring-1 focus:ring-gold/50"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Time
                  </label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-muted rounded-lg text-sm outline-none focus:ring-1 focus:ring-gold/50"
                  />
                </div>
              </div>

              {/* Priority + Project */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-muted rounded-lg text-sm outline-none focus:ring-1 focus:ring-gold/50"
                  >
                    <option value="4">None</option>
                    <option value="1">🔴 P1</option>
                    <option value="2">🟠 P2</option>
                    <option value="3">🔵 P3</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Project
                  </label>
                  <select
                    value={formData.project}
                    onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-muted rounded-lg text-sm outline-none focus:ring-1 focus:ring-gold/50"
                  >
                    <option value="">No project</option>
                    {projects.map((p: Project) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-muted rounded-lg text-sm outline-none focus:ring-1 focus:ring-gold/50 resize-none"
                  rows={3}
                  placeholder="Optional notes..."
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 mt-6">
              {editingTask && (
                <button
                  onClick={handleModalDelete}
                  className="px-4 py-2 rounded text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                  title="Delete task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveTask}
                className="px-4 py-2 rounded text-sm bg-gold text-black font-medium hover:bg-gold/90 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm font-medium z-50"
          style={{ background: '#10b981', color: '#fff' }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
