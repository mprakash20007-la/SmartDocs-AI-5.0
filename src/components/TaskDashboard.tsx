import React, { useState } from 'react';
import { CheckSquare, Square, Calendar, Bell, Clock, ClipboardList, CheckCircle2, User, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, Reminder } from '../types';
import GlassCard from './GlassCard';

interface TaskDashboardProps {
  tasks: Task[];
  reminders: Reminder[];
  onToggleTask: (id: string) => void;
  isLoading?: boolean;
}

export const TaskDashboard: React.FC<TaskDashboardProps> = ({
  tasks,
  reminders,
  onToggleTask,
  isLoading = false
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [taskSearch, setTaskSearch] = useState<string>('');

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(taskSearch.toLowerCase()) || 
                         task.documentTitle.toLowerCase().includes(taskSearch.toLowerCase());
    const matchesType = filterType === 'all' || task.type === filterType;
    return matchesSearch && matchesType;
  });

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'deadline': return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'meeting': return <Clock className="w-4 h-4 text-brand-cyan" />;
      case 'assignment': return <ClipboardList className="w-4 h-4 text-yellow-400" />;
      case 'submission': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'event': return <Calendar className="w-4 h-4 text-brand-purple" />;
      default: return <ClipboardList className="w-4 h-4 text-gray-400" />;
    }
  };

  const getReminderColor = (type: string) => {
    switch (type) {
      case 'exam': return 'border-red-500/30 bg-red-500/5 text-red-400';
      case 'deadline': return 'border-orange-500/30 bg-orange-500/5 text-orange-400';
      case 'meeting': return 'border-brand-cyan/30 bg-brand-cyan/5 text-brand-cyan';
      case 'interview': return 'border-brand-purple/30 bg-brand-purple/5 text-brand-purple';
      default: return 'border-white/5 bg-white/5 text-gray-300';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="task-dashboard-view">
      {/* Tasks Section (Left Col - 2/3) */}
      <div className="lg:col-span-2 space-y-6">
        <GlassCard className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-brand-purple/10 border border-brand-purple/20 text-brand-purple">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Extracted Action Tasks</h3>
                <p className="text-xs text-gray-400">Actions and submissions auto-detected in documents</p>
              </div>
            </div>
            
            <div className="text-xs bg-white/5 px-2.5 py-1 rounded-md text-gray-400 border border-white/5 font-semibold">
              {tasks.filter(t => !t.completed).length} Pending
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              placeholder="Search tasks..."
              value={taskSearch}
              onChange={(e) => setTaskSearch(e.target.value)}
              className="flex-1 bg-white/5 border border-white/5 focus:border-brand-purple/30 focus:outline-none rounded-xl px-4 py-2 text-xs text-white placeholder-gray-500"
            />
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-white/5 border border-white/5 focus:border-brand-purple/30 focus:outline-none rounded-xl px-3 py-2 text-xs text-gray-300 min-w-[140px] cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="deadline">Deadlines</option>
              <option value="meeting">Meetings</option>
              <option value="assignment">Assignments</option>
              <option value="submission">Submissions</option>
              <option value="event">Events</option>
              <option value="action_item">Action Items</option>
            </select>
          </div>

          {/* Tasks List */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="text-center py-12 text-xs text-gray-500">Loading tasks...</div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-white/5 rounded-2xl">
                <CheckCircle2 className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-xs text-gray-500">No matching tasks found.</p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {filteredTasks.map((task) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    onClick={() => onToggleTask(task.id)}
                    className={`flex items-start justify-between p-4 rounded-xl border transition-all cursor-pointer group ${
                      task.completed
                        ? 'bg-white/[0.01] border-white/5 opacity-50'
                        : 'bg-white/5 border-white/5 hover:border-brand-purple/30'
                    }`}
                  >
                    <div className="flex items-start space-x-3.5 min-w-0">
                      <button className="text-gray-500 group-hover:text-brand-purple transition-all shrink-0 mt-0.5">
                        {task.completed ? (
                          <CheckSquare className="w-5 h-5 text-brand-purple" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                      
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold truncate ${task.completed ? 'line-through text-gray-500 font-normal' : 'text-white'}`}>
                          {task.title}
                        </p>
                        <div className="flex items-center space-x-2.5 text-[10px] text-gray-500 mt-1 font-bold uppercase tracking-wider">
                          <span className="flex items-center space-x-1">
                            {getTaskIcon(task.type)}
                            <span className="ml-1">{task.type}</span>
                          </span>
                          <span>•</span>
                          <span className="text-brand-cyan truncate max-w-[150px]">{task.documentTitle}</span>
                        </div>
                      </div>
                    </div>

                    {task.date && (
                      <div className="flex items-center space-x-1.5 text-xs text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/5 shrink-0 ml-3">
                        <Calendar className="w-3.5 h-3.5 text-brand-cyan" />
                        <span className="font-semibold">{task.date}</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Reminders Timeline Section (Right Col - 1/3) */}
      <div className="space-y-6">
        <GlassCard className="space-y-6">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">AI Reminder Alerts</h3>
              <p className="text-xs text-gray-400">Critical events scheduled from documents</p>
            </div>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
            {reminders.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-white/5 rounded-2xl">
                <Bell className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-xs text-gray-500">No scheduled reminders.</p>
              </div>
            ) : (
              reminders.map((rem) => (
                <div
                  key={rem.id}
                  className={`p-4 rounded-xl border flex flex-col space-y-2.5 ${getReminderColor(rem.type)}`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-[9px] uppercase tracking-widest font-extrabold px-2 py-0.5 rounded-full bg-white/10">
                      {rem.type}
                    </span>
                    <div className="flex items-center space-x-1 text-[10px] opacity-80 font-bold">
                      <Clock className="w-3 h-3" />
                      <span>{rem.date}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-white leading-snug">{rem.title}</h4>
                    <p className="text-[10px] opacity-60 truncate">Source: {rem.documentTitle}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
export default TaskDashboard;
