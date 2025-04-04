"use client";

import { useEffect, useState } from 'react';
import { validateClientRequest } from "~/server/auth/lucia-client";
import { api } from '../../utils/api';
import Link from 'next/link';

interface TaskItem {
  task: {
    id: string;
    title: string;
    description: string | null;
    status: 'pending' | 'in-progress' | 'completed';
    createdAt: string | Date;
  };
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(undefined);
  
  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { user } = await validateClientRequest();
        if (user && user.role === "admin") {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Execute the function and handle the Promise
    void checkAdmin();
  }, []);
  
  // Create query input based on filters
  const queryInput = {
    userId: selectedUserId,
    status: selectedStatus as "pending" | "in-progress" | "completed" | undefined,
    limit: 50
  };
  
  // Query to fetch all tasks
  const tasksQuery = api.tasks.getAllTasks.useQuery(queryInput, {
    enabled: isAdmin === true,
  });
  
  const { data, isLoading: isTasksLoading, error } = tasksQuery;
  
  // Get list of users for the filter dropdown
  const usersQuery = api.users.getUsers.useQuery(undefined, {
    enabled: isAdmin === true
  });
  
  const userData = usersQuery.data;
  
  const utils = api.useContext();
  
  const handleStatusChange = (status: string) => {
    setSelectedStatus(status === "all" ? undefined : status);
  };
  
  const handleUserChange = (userId: string) => {
    setSelectedUserId(userId === "all" ? undefined : userId);
  };
  
  // Setup mutations
  const updateTaskMutation = api.tasks.updateTask.useMutation({
    onSuccess: async () => {
      await utils.tasks.getAllTasks.invalidate();
    }
  });
  
  const deleteTaskMutation = api.tasks.deleteTask.useMutation({
    onSuccess: async () => {
      await utils.tasks.getAllTasks.invalidate();
    }
  });
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-8">
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Show unauthorized state
  if (isAdmin === false) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Unauthorized</p>
          <p>You need admin privileges to access this page.</p>
          <Link href="/" className="text-red-700 underline mt-2 inline-block">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }
  
  // Show error state if there's an error
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="userFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by User
            </label>
            <select
              id="userFilter"
              value={selectedUserId ?? "all"}
              onChange={(e) => handleUserChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">All Users</option>
              {userData?.users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name ?? user.email}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Status
            </label>
            <select
              id="statusFilter"
              value={selectedStatus ?? "all"}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Tasks Table */}
      <div className="bg-white shadow rounded-lg p-6 overflow-hidden">
        <h2 className="text-xl font-semibold mb-4">All Tasks</h2>
        
        {isTasksLoading ? (
          <div className="text-center py-4">Loading tasks...</div>
        ) : !data?.tasks || data.tasks.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No tasks found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Task
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(data.tasks as TaskItem[]).map((item) => (
                  <tr key={item.task.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{item.task.title}</div>
                      {item.task.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">{item.task.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{item.user.name ?? 'No Name'}</div>
                      <div className="text-sm text-gray-500">{item.user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        item.task.status === 'completed' ? 'bg-green-100 text-green-800' :
                        item.task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.task.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(item.task.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          // Call updateTask mutation here
                          const newStatus = 
                            item.task.status === 'pending' ? 'in-progress' : 
                            item.task.status === 'in-progress' ? 'completed' : 'pending';
                            
                          updateTaskMutation.mutate({
                            id: item.task.id,
                            status: newStatus
                          });
                        }}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Change Status
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this task?')) {
                            deleteTaskMutation.mutate(item.task.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {data?.pagination && (
          <div className="py-3 flex items-center justify-between border-t border-gray-200 mt-4">
            <div className="text-sm text-gray-700">
              Showing {data.tasks.length} of {data.pagination.total} tasks
            </div>
            {/* Pagination controls could go here */}
          </div>
        )}
      </div>
    </div>
  );
} 