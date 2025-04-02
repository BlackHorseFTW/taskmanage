"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { api } from '../../trpc/react';

// Define types for our task
type TaskStatus = 'pending' | 'in-progress' | 'completed';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  createdAt: string | Date;
}

export default function TasksComponent() {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [filter, setFilter] = useState<TaskStatus | undefined>(undefined);
  
  // Create query input based on filter
  const queryInput = useMemo(() => {
    return filter !== undefined 
      ? { limit: 20, status: filter } 
      : { limit: 20 };
  }, [filter]);
  
  // Query to fetch tasks with optional filter
  const { data, isLoading, error } = api.tasks.getTasks.useQuery(queryInput);
  
  // Log errors to console for debugging
  useEffect(() => {
    if (error) {
      console.error("Task query error:", error);
    }
  }, [error]);
  
  const utils = api.useContext();
  
  // Mutations
  const createTaskMutation = api.tasks.createTask.useMutation({
    onSuccess: () => {
      utils.tasks.getTasks.invalidate();
      // Clear form fields
      setNewTaskTitle('');
      setNewTaskDescription('');
    },
    onError: (err) => {
      console.error("Create task error:", err);
      alert("Failed to create task");
    }
  });
  
  const updateTaskMutation = api.tasks.updateTask.useMutation({
    onSuccess: () => {
      utils.tasks.getTasks.invalidate();
    },
    onError: (err) => {
      console.error("Update task error:", err);
      alert("Failed to update task");
    }
  });
  
  const deleteTaskMutation = api.tasks.deleteTask.useMutation({
    onSuccess: () => {
      utils.tasks.getTasks.invalidate();
    },
    onError: (err) => {
      console.error("Delete task error:", err);
      alert("Failed to delete task");
    }
  });
  
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    void createTaskMutation.mutate({
      title: newTaskTitle,
      description: newTaskDescription || undefined
    });
  };
  
  const handleUpdateStatus = (id: string, status: TaskStatus) => {
    void updateTaskMutation.mutate({ id, status });
  };
  
  const handleDeleteTask = (id: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      void deleteTaskMutation.mutate(id);
    }
  };
  
  // Show error state if there's an error
  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Error loading tasks</p>
          <p>{error.message}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-2 bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-6xl mx-auto ">
      <h1 className="text-2xl font-bold mb-4">Task Manager</h1>
      {/* Task Creation Form */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Add New Task</h2>
        <form onSubmit={handleCreateTask}>
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              id="title"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <button
            type="submit"
            disabled={createTaskMutation.isPending}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {createTaskMutation.isPending ? 'Adding...' : 'Add Task'}
          </button>
        </form>
      </div>
      
      {/* Task Filtering */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Filter Tasks</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter(undefined)}
            className={`px-3 py-1 rounded-md ${!filter ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1 rounded-md ${filter === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100'}`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('in-progress')}
            className={`px-3 py-1 rounded-md ${filter === 'in-progress' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'}`}
          >
            In Progress
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1 rounded-md ${filter === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}
          >
            Completed
          </button>
        </div>
      </div>
      
      {/* Task List */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Tasks</h2>
        
        {isLoading ? (
          <div className="text-center py-4">Loading tasks...</div>
        ) : !data?.tasks || data.tasks.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No tasks found</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {data.tasks.map((task: Task) => (
              <li key={task.id} className="py-4">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between">
                    <h3 className="text-lg font-medium">{task.title}</h3>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                  
                  {task.description && (
                    <p className="text-gray-600">{task.description}</p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-gray-500">
                        Created: {new Date(task.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex gap-2">
                      <select
                        value={task.status}
                        onChange={(e) => handleUpdateStatus(task.id, e.target.value as TaskStatus)}
                        className="block w-full pl-3 pr-10 py-1 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                      >
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        
        {data?.pagination && data.pagination.total > data.pagination.limit && (
          <div className="flex justify-between items-center mt-6">
            <span className="text-sm text-gray-700">
              Showing {data.tasks.length} of {data.pagination.total} tasks
            </span>
            {/* Add pagination controls here if needed */}
          </div>
        )}
      </div>
    </div>
  );
}