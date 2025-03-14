// src/pages/HelpCenter/HelpCenter.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Search, 
  FileText, 
  Package, 
  Calendar, 
  Users, 
  Settings, 
  HelpCircle, 
  ChevronRight, 
  ChevronDown, 
  Copy, 
  CheckCircle,
  ExternalLink,
  X
} from 'lucide-react';
import DOMPurify from 'dompurify';
import { useSearchParams } from 'react-router-dom';

// Define types for the help system
interface HelpTopic {
  id: string;
  title: string;
  content: string;
  category: string;
  roles: string[];
}

interface HelpCategory {
  id: string;
  title: string;
  icon: React.ReactNode;
  topics: HelpTopic[];
  roles: string[];
}

// Help content structured according to the FAQ template
const helpData: HelpCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: <FileText size={18} />,
    roles: ['admin', 'manager', 'worker'],
    topics: [
      {
        id: 'welcome',
        title: 'Welcome to TrackFlow',
        category: 'getting-started',
        roles: ['admin', 'manager', 'worker'],
        content: `
          <p>TrackFlow is a production tracking system designed to improve workflow visibility and efficiency. It allows real-time monitoring of the production process by tracking:</p>
          <ol class="list-decimal pl-6 my-4 space-y-2">
            <li>Current, completed, and upcoming tasks within a project</li>
            <li>Deadlines to ensure timely completion</li>
            <li>Employee assignments, including who worked on each task (e.g., assemblers, welders, painters)</li>
            <li>Client information, linking projects to specific customers</li>
            <li>Part tracking via barcodes, where each part is assigned a unique barcode that workers scan to update its status</li>
          </ol>
          <p>The system helps streamline production by providing a clear overview of progress, responsibilities, and deadlines, ensuring that all stages are efficiently managed.</p>

          <div class="bg-amber-50 border-l-4 border-amber-500 p-4 my-4 rounded-r">
            <p class="text-sm text-amber-800">
              <strong>Tip:</strong> Use the search function at the top of the page to quickly find the questions troubling you.
            </p>
          </div>
        `
      },
      {
        id: 'sign-up',
        title: 'How to Sign Up',
        category: 'getting-started',
        roles: ['admin', 'manager', 'worker'],
        content: `
          <p>To get started with TrackFlow, follow these steps:</p>
          <ol class="list-decimal pl-6 my-4 space-y-2">
            <li>Ask your administrator to create an account for you</li>
            <li>Check your email for an invitation link from TrackFlow</li>
            <li>There will be your password and username</li>
            <li>Complete your profile with your name and job details</li>
            <li>Begin using TrackFlow to track your work!</li>
          </ol>
          
          <div class="bg-amber-50 border-l-4 border-amber-500 p-4 my-4 rounded-r">
            <p class="text-sm text-amber-800">
              <strong>Note:</strong> If you don't receive an invitation email, check your spam folder or contact your administrator.
            </p>
          </div>
        `
      }
    ]
  },
  {
    id: 'user-interface',
    title: 'User Interface',
    icon: <Package size={18} />,
    roles: ['admin', 'manager', 'worker'],
    topics: [
      {
        id: 'dashboard-overview',
        title: 'Dashboard Overview',
        category: 'user-interface',
        roles: ['admin', 'manager', 'worker'],
        content: `
          <p>The dashboard is your central hub for all TrackFlow activities:</p>
          <ol class="list-decimal pl-6 my-4 space-y-2">
            <li><strong>Navigation Bar</strong>: Access all main sections of the application</li>
            <li><strong>Quick Actions</strong>: Create new tasks, projects, or invite team members</li>
            <li><strong>Activity Feed</strong>: See recent updates across your projects</li>
            <li><strong>Task Summary</strong>: View tasks by status, priority, and due dates</li>
            <li><strong>Project Progress</strong>: Visual indicators of project completion</li>
          </ol>
        `
      },
      {
        id: 'projects-view',
        title: 'Projects View',
        category: 'user-interface',
        roles: ['admin', 'manager', 'worker'],
        content: `
          <p>The Projects view allows you to manage all your team's projects in one place:</p>
          <ol class="list-decimal pl-6 my-4 space-y-2">
            <li><strong>Create New Project</strong>: Start a new project with custom fields</li>
            <li><strong>Filter & Sort</strong>: Find projects by status, priority, or custom fields</li>
            <li><strong>Project Details</strong>: Click on any project to see its tasks and status</li>
            <li><strong>Batch Actions</strong>: Perform actions on multiple projects at once</li>
          </ol>
        `
      }
    ]
  },
  {
    id: 'task-management',
    title: 'Task Management',
    icon: <Calendar size={18} />,
    roles: ['admin', 'manager', 'worker'],
    topics: [
      {
        id: 'creating-tasks',
        title: 'Creating New Tasks',
        category: 'task-management',
        roles: ['admin', 'manager'],
        content: `
          <p>Tasks are the building blocks of projects in TrackFlow. Here's how to create them:</p>
          <ol class="list-decimal pl-6 my-4 space-y-2">
            <li>Click the "+ New Task" button in the header menu</li>
            <li>Select the project the task belongs to</li>
            <li>Enter a task title and description</li>
            <li>Assign the task to team members</li>
            <li>Set Priority (Low, Medium, High, Urgent)</li>
            <li>Click "Create Task" to save</li>
          </ol>
          
          <div class="bg-amber-50 border-l-4 border-amber-500 p-4 my-4 rounded-r">
            <p class="text-sm text-amber-800">
              <strong>Note:</strong> Only Managers and Admins can create new tasks.
            </p>
          </div>
        `
      },
      {
        id: 'task-statuses',
        title: 'Task Statuses Explained',
        category: 'task-management',
        roles: ['admin', 'manager', 'worker'],
        content: `
          <p>TrackFlow uses status labels to track the progress of tasks through your workflow.</p>
          <table class="min-w-full border border-gray-300 border-collapse">
            <thead>
              <tr class="bg-gray-100">
                <th class="border border-gray-300 px-4 py-2 text-left">Status</th>
                <th class="border border-gray-300 px-4 py-2 text-left">Description</th>
                <th class="border border-gray-300 px-4 py-2 text-left">When to Use</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="border border-gray-300 px-4 py-2">Backlog</td>
                <td class="border border-gray-300 px-4 py-2">Tasks not yet started</td>
                <td class="border border-gray-300 px-4 py-2">Future work that's been identified</td>
              </tr>
              <tr class="bg-gray-50">
                <td class="border border-gray-300 px-4 py-2">To Do</td>
                <td class="border border-gray-300 px-4 py-2">Tasks ready to start</td>
                <td class="border border-gray-300 px-4 py-2">Current sprint/planned work</td>
              </tr>
              <tr>
                <td class="border border-gray-300 px-4 py-2">In Progress</td>
                <td class="border border-gray-300 px-4 py-2">Tasks being worked on</td>
                <td class="border border-gray-300 px-4 py-2">When actively working on a task</td>
              </tr>
              <tr class="bg-gray-50">
                <td class="border border-gray-300 px-4 py-2">Review</td>
                <td class="border border-gray-300 px-4 py-2">Tasks waiting for approval</td>
                <td class="border border-gray-300 px-4 py-2">When ready for testing/review</td>
              </tr>
              <tr>
                <td class="border border-gray-300 px-4 py-2">Done</td>
                <td class="border border-gray-300 px-4 py-2">Completed tasks</td>
                <td class="border border-gray-300 px-4 py-2">When all requirements are met</td>
              </tr>
            </tbody>
          </table>
          <p>You can customize these statuses in your project settings.</p>
        `
      }
    ]
  },
  {
    id: 'team-management',
    title: 'Team Management',
    icon: <Users size={18} />,
    roles: ['admin', 'manager'],
    topics: [
      {
        id: 'inviting-team-members',
        title: 'Inviting Team Members',
        category: 'team-management',
        roles: ['admin', 'manager'],
        content: `
          <p>Collaborate with your colleagues by inviting them to your TrackFlow workspace:</p>
          <ol class="list-decimal pl-6 my-4 space-y-2">
            <li>Go to "Settings > Team Members"</li>
            <li>Click "Invite User"</li>
            <li>Enter their email address</li>
            <li>Select their role (Admin, Manager, or Worker)</li>
            <li>For workers, select their worker type (e.g., assembler, welder)</li>
            <li>Click "Send Invitation"</li>
          </ol>
          
          <div class="bg-amber-50 border-l-4 border-amber-500 p-4 my-4 rounded-r">
            <p class="text-sm text-amber-800">
              <strong>Note:</strong> Invitations expire after 7 days. If a user doesn't accept within that time, you'll need to send a new invitation.
            </p>
          </div>
        `
      },
      {
        id: 'user-roles',
        title: 'User Roles and Permissions',
        category: 'team-management',
        roles: ['admin', 'manager'],
        content: `
          <p>TrackFlow uses a role-based permission system to control what features and data users can access:</p>
          <ol class="list-decimal pl-6 my-4 space-y-2">
            <li><Strong>Admin Role</Strong>: Full system access, including user management and system settings</li>
            <li><Strong>Manager</Strong>: Can create and manage projects, tasks, and team assignments</li>
            <li><Strong>Worker</Strong>: Can view assigned projects and update task status</li>
          </ol>

          <div class="bg-amber-50 border-l-4 border-amber-500 p-4 my-4 rounded-r">
            <p class="text-sm text-amber-800">
              <strong>Important:</strong> Only Admins can create or modify Admin accounts. Managers can only create and modify Worker accounts.
            </p>
          </div>
        `
      }
    ]
  },
  {
    id: 'system-settings',
    title: 'Integrations',
    icon: <Settings size={18} />,
    roles: ['admin'],
    topics: [
      {
        id: 'system-configuration',
        title: 'Can TrackFlow integrate with other tools?',
        category: 'system-settings',
        roles: ['admin'],
        content: `
          <p>Yes! TrackFlow integrates with many popular tools:</p>
         <ol class="list-decimal pl-6 my-4 space-y-2">
            <li><Strong>Calendar Apps</Strong>: Google Calendar, Outlook</li>
            <li><Strong>Messaging</Strong>:Slack, Microsoft Teams</li>
            <li><Strong>Development</Strong>:GitHub, GitLab, Bitbucket</li>
            <li><Strong>File Storage</Strong>:Google Drive, Dropbox, OneDrive</li>
          </ol>
          
          <div class="bg-amber-50 border-l-4 border-amber-500 p-4 my-4 rounded-r">
            <p class="text-sm text-amber-800">
              <strong>Important:</strong> Changes to system settings affect all users and may require them to log out and back in.
            </p>
          </div>
        `
      },
      {
        id: 'Git set-up',
        title: 'Setting up the GitHub Integration',
        category: 'system-settings',
        roles: ['admin'],
        content: `
          <p>To connect TrackFlow with GitHub:</p>
          <ol class="list-decimal pl-6 my-4 space-y-2">
            <li>Go to "Settings > Integrations"</li>
            <li>Find GitHub in the list and click "Connect"</li>
            <li>Authorize TrackFlow in the GitHub authorization page</li>
            <li>Select which repositories to connect</li>
            <li>Configure automation rules (optional)</li>
          </ol>
        `
      }
    ]
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: <HelpCircle size={18} />,
    roles: ['admin', 'manager', 'worker'],
    topics: [
      {
        id: 'password-reset',
        title: 'Password Reset',
        category: 'troubleshooting',
        roles: ['admin', 'manager', 'worker'],
        content: `
          <p>If you've forgotten your password or need to reset it for any reason, follow these steps:</p>
          <ol class="list-decimal pl-6 my-4 space-y-2">
            <li>Click "Login" at the top of the page</li>
            <li>Select "Forgot Password"</li>
            <li>Enter your email address</li>
            <li>Check your email for a password reset link</li>
            <li>Follow the link to create a new password</li>
          </ol>
          
          <div class="bg-amber-50 border-l-4 border-amber-500 p-4 my-4 rounded-r">
            <p class="text-sm text-amber-800">
              <strong>Note:</strong> If you cannot access your email, contact your system administrator for assistance.
            </p>
          </div>
        `
      },
      {
        id: 'common-errors',
        title: 'Common issues',
        category: 'troubleshooting',
        roles: ['admin', 'manager', 'worker'],
        content: `
          <p>If you can't see a project, check the following:</p>
          <ol class="list-decimal pl-6 my-4 space-y-2">
            <li>Verify you have been invited to the project</li>
            <li>Check if the project has been archived</li>
            <li>Ensure your user role has permission to view the project</li>
            <li>Try refreshing your browser or clearing your cache</li>
          </ol>
          
          <p>Performance Issues:</p>
          <ol class="list-decimal pl-6 my-4 space-y-2">
            <li><strong>Slow loading</strong>: Try refreshing the page or clearing your browser cache</li>
            <li><strong>Features not working</strong>: Make sure you're using a supported browser (Chrome, Firefox, Edge, Safari)</li>
            <li><strong>Data not saving</strong>: Check your internet connection and try again</li>
          </ol>
          
          <p>Data Issues:</p>
          <ol class="list-decimal pl-6 my-4 space-y-2">
            <li><strong>Missing projects/tasks</strong>: Check your filters and search settings; you may have active filters limiting what you see</li>
            <li><strong>Can't edit content</strong>: Verify you have the necessary permissions for that item</li>
            <li><strong>Changes not visible to others</strong>: They may need to refresh their page to see your updates</li>
          </ol>
          
          <div class="bg-amber-50 border-l-4 border-amber-500 p-4 my-4 rounded-r">
            <p class="text-sm text-amber-800">
              <strong>Tip:</strong> For issues not listed here, try logging out and back in, or contact support at support@trackflow.example.com.
            </p>
          </div>
        `
      }
    ]
  }
];

const HelpCenter: React.FC = () => {
  const { user } = useAuth();
  const userRole = user?.user_metadata?.role || 'worker';
  
  // Get URL parameters for direct linking
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get('category');
  const initialTopic = searchParams.get('topic');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(initialCategory);
  const [activeTopic, setActiveTopic] = useState<string | null>(initialTopic);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(initialCategory ? [initialCategory] : []);
  const loading = false;
  const [copied, setCopied] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Filter categories and topics based on user role
  const filteredCategories = useMemo(() => {
    return helpData.filter(category => 
      category.roles.includes(userRole)
    );
  }, [userRole]);
  
  // Set initial values if not set from URL
  useEffect(() => {
    if (!activeCategory && filteredCategories.length > 0) {
      const firstCategory = filteredCategories[0];
      setActiveCategory(firstCategory.id);
      setExpandedCategories([firstCategory.id]);
      
      if (firstCategory.topics.length > 0) {
        const firstTopic = firstCategory.topics.find(t => t.roles.includes(userRole));
        if (firstTopic) {
          setActiveTopic(firstTopic.id);
          // Update URL params to reflect the initial selection
          setSearchParams({ category: firstCategory.id, topic: firstTopic.id });
        }
      }
    }
  }, [filteredCategories, activeCategory, userRole, setSearchParams]);
  
  // Handle search functionality
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    const results: HelpTopic[] = [];
    
    filteredCategories.forEach(category => {
      category.topics.forEach(topic => {
        if (
          topic.roles.includes(userRole) &&
          (topic.title.toLowerCase().includes(query) ||
           topic.content.toLowerCase().includes(query))
        ) {
          results.push(topic);
        }
      });
    });
    
    return results;
  }, [searchQuery, filteredCategories, userRole]);
  
  // Handle category toggle
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };
  
  // Handle topic selection
  const selectTopic = (categoryId: string, topicId: string) => {
    setActiveCategory(categoryId);
    setActiveTopic(topicId);
    setIsMobileMenuOpen(false);
    
    // Ensure the category is expanded
    if (!expandedCategories.includes(categoryId)) {
      setExpandedCategories(prev => [...prev, categoryId]);
    }
    
      // Update URL parameters for direct linking
      setSearchParams({ category: categoryId, topic: topicId });
    };
  
  // Find the currently active topic
  const activeCategoryData = filteredCategories.find(c => c.id === activeCategory);
  const activeTopicData = activeCategoryData?.topics.find(t => t.id === activeTopic && t.roles.includes(userRole));
  
  // Handle copying the current page URL
  const copyPageUrl = () => {
    const url = `${window.location.origin}${window.location.pathname}?category=${activeCategory}&topic=${activeTopic}`;
    navigator.clipboard.writeText(url)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy URL:', err);
      });
  };
  
  return (

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-blue-50 p-6 border-b border-blue-100">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-blue-900">Help Center</h1>
            <button 
              className="md:hidden rounded-full p-2 hover:bg-blue-100 transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={20} /> : <HelpCircle size={20} />}
            </button>
          </div>
        </div>
        
        {/* Search bar */}
        <div className="p-6 border-b bg-white">
          <div className="relative max-w-3xl">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              className="w-full pl-10 pr-4 py-3 border rounded-md focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              placeholder="Search for help topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row">
          {/* Sidebar navigation - hidden on mobile unless menu button is clicked */}
          <div className={`
            w-full md:w-1/4 lg:w-1/5 border-r border-gray-200 p-6 overflow-y-auto
            ${isMobileMenuOpen ? 'block' : 'hidden md:block'}
          `} style={{ height: 'calc(70vh - 300px)', minHeight: '500px'}}>
            {searchQuery ? (
              // Search results
              <div>
                <h3 className="font-medium text-gray-800 mb-3">Search Results</h3>
                {searchResults.length === 0 ? (
                  <div className="p-3 bg-gray-50 rounded text-gray-600 text-sm">
                    <p>No results found for "{searchQuery}"</p>
                  </div>
                ) : (
                  <ul className="space-y-2 border-l-2 border-blue-100 pl-3">
                    {searchResults.map(topic => (
                      <li key={topic.id}>
                        <button
                          onClick={() => {
                            selectTopic(topic.category, topic.id);
                            setSearchQuery('');  // Clear search after selection
                          }}
                          className="text-left w-full py-2 px-3 rounded hover:bg-blue-50 text-sm text-blue-700 font-medium"
                        >
                          {topic.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 pt-2 border-t">
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Clear search
                  </button>
                </div>
              </div>
            ) : (
              // Category list
              <div className="space-y-2">
                {filteredCategories.map(category => (
                  <div key={category.id} className="rounded-md overflow-hidden">
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="w-full flex justify-between items-center px-3 py-2.5 bg-gray-50 hover:bg-gray-100 text-left font-medium rounded"
                    >
                      <span className="flex items-center">
                        {category.icon && <span className="mr-2.5 text-blue-700">{category.icon}</span>}
                        {category.title}
                      </span>
                      {expandedCategories.includes(category.id) ? (
                        <ChevronDown size={16} className="text-gray-500" />
                      ) : (
                        <ChevronRight size={16} className="text-gray-500" />
                      )}
                    </button>
                    
                    {expandedCategories.includes(category.id) && (
                      <ul className="pl-4 py-1 space-y-1">
                        {category.topics
                          .filter(topic => topic.roles.includes(userRole))
                          .map(topic => (
                            <li key={topic.id}>
                              <button
                                onClick={() => selectTopic(category.id, topic.id)}
                                className={`text-left w-full px-3.5 py-1.5 rounded text-sm ${
                                  activeTopic === topic.id
                                    ? "bg-blue-100 text-blue-700 font-medium"
                                    : "hover:bg-gray-50 text-gray-700"
                                }`}
                              >
                                {topic.title}
                              </button>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Content area */}
          <div className={`
            w-full md:w-3/4 lg:w-4/5 p-6 overflow-y-auto bg-white
            ${isMobileMenuOpen ? 'hidden md:block' : 'block'}
          `} style={{height: 'calc(70vh - 220px)', minHeight: '500px' }}>
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : activeTopicData ? (
              <div>
                <div className="mb-8">
                  <div className="flex justify-between items-start mb-6">
                    <div className="text-sm text-gray-500 flex items-center space-x-2">
                      <span 
                        className="hover:underline cursor-pointer" 
                        onClick={() => setActiveCategory(activeTopicData.category)}
                      >
                        {activeCategoryData?.title}
                      </span>
                      <span>›</span>
                      <span className="font-medium text-gray-700">{activeTopicData.title}</span>
                    </div>
                    
                    <button 
                      onClick={copyPageUrl}
                      className="flex items-center text-gray-500 hover:text-gray-700 text-sm"
                      title="Copy link to this topic"
                    >
                      {copied ? (
                        <>
                          <CheckCircle size={16} className="mr-1 text-green-500" />
                          <span className="text-green-500">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={16} className="mr-1" />
                          <span>Copy link</span>
                        </>
                      )}
                    </button>
                  </div>
                  
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">{activeTopicData.title}</h1>
                </div>
                
                <div 
                  className="prose prose-blue max-w-4xl"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(activeTopicData.content) }}
                />
                
                <div className="mt-8 pt-4 border-t border-gray-200 flex justify-between text-sm text-gray-500">
                  <div>
                    Last updated: March 12, 2025
                  </div>
                  <div>
                    <a href="#" className="flex items-center text-blue-600 hover:underline">
                      <ExternalLink size={14} className="mr-1" />
                      Suggest edits
                    </a>
                  </div>
                </div>
                
                {/* Feedback section */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <p className="text-gray-700 font-medium mb-2">Was this article helpful?</p>
                  <div className="flex space-x-4">
                    <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center">
                      <span className="mr-2">👍</span>
                      <span>Yes</span>
                    </button>
                    <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center">
                      <span className="mr-2">👎</span>
                      <span>No</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 py-20">
                <HelpCircle size={64} className="mb-4 opacity-50 text-blue-300" />
                {filteredCategories.length > 0 ? (
                  <p className="text-xl text-gray-600">Select a topic from the sidebar to view help content.</p>
                ) : (
                  <p className="text-xl text-gray-600">No help content available for your user role.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
  );
};

export default HelpCenter;