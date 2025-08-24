import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  DollarSign, 
  StickyNote, 
  FolderOpen, 
  Bookmark, 
  Brain, 
  FileText,
  TrendingUp,
  Calendar,
  Search
} from 'lucide-react';
import axios from 'axios';

const Dashboard = () => {
  const [stats, setStats] = useState({
    money: { count: 0, total: 0 },
    notes: { count: 0 },
    references: { count: 0, projects: 0 },
    bookmarks: { count: 0 },
    knowledge: { count: 0 },
    files: { count: 0 }
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch money stats
      const moneyRes = await axios.get('/api/money/transactions');
      const moneySummary = await axios.get('/api/money/summary');
      const total = moneySummary.data.reduce((sum, item) => sum + parseFloat(item.total), 0);
      
      // Fetch other stats
      const notesRes = await axios.get('/api/notes');
      const referencesRes = await axios.get('/api/references/projects');
      const bookmarksRes = await axios.get('/api/bookmarks');
      const knowledgeRes = await axios.get('/api/knowledge');
      const filesRes = await axios.get('/api/files');

      setStats({
        money: { count: moneyRes.data.length, total },
        notes: { count: notesRes.data.length },
        references: { count: referencesRes.data.length, projects: referencesRes.data.length },
        bookmarks: { count: bookmarksRes.data.length },
        knowledge: { count: knowledgeRes.data.length },
        files: { count: filesRes.data.length }
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const features = [
    {
      title: 'Money Organizer',
      description: 'Track expenses with AI-powered categorization',
      icon: DollarSign,
      path: '/money',
      color: 'bg-green-500',
      stats: `${stats.money.count} transactions • $${stats.money.total.toFixed(2)} total`
    },
    {
      title: 'Notes',
      description: 'Smart note-taking with topic organization',
      icon: StickyNote,
      path: '/notes',
      color: 'bg-blue-500',
      stats: `${stats.notes.count} notes`
    },
    {
      title: 'References',
      description: 'Project-based reference management',
      icon: FolderOpen,
      path: '/references',
      color: 'bg-purple-500',
      stats: `${stats.references.projects} projects • ${stats.references.count} references`
    },
    {
      title: 'Bookmarks',
      description: 'AI-categorized bookmark collection',
      icon: Bookmark,
      path: '/bookmarks',
      color: 'bg-yellow-500',
      stats: `${stats.bookmarks.count} bookmarks`
    },
    {
      title: 'Knowledge',
      description: 'Summarized knowledge base',
      icon: Brain,
      path: '/knowledge',
      color: 'bg-indigo-500',
      stats: `${stats.knowledge.count} items`
    },
    {
      title: 'Files',
      description: 'Important file management',
      icon: FileText,
      path: '/files',
      color: 'bg-red-500',
      stats: `${stats.files.count} files`
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Personal AI Organizer
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Your intelligent personal assistant for organizing money, notes, references, bookmarks, knowledge, and files.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
            <DollarSign className="w-6 h-6 text-green-600 mr-3" />
            <span className="text-green-800 font-medium">Add Expense</span>
          </button>
          <button className="flex items-center p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
            <StickyNote className="w-6 h-6 text-blue-600 mr-3" />
            <span className="text-blue-800 font-medium">Quick Note</span>
          </button>
          <button className="flex items-center p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors">
            <Bookmark className="w-6 h-6 text-purple-600 mr-3" />
            <span className="text-purple-800 font-medium">Save Bookmark</span>
          </button>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Link
              key={feature.path}
              to={feature.path}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center mb-4">
                <div className={`${feature.color} p-3 rounded-lg mr-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">{feature.title}</h3>
              </div>
              <p className="text-gray-600 mb-4">{feature.description}</p>
              <div className="flex items-center text-sm text-gray-500">
                <TrendingUp className="w-4 h-4 mr-1" />
                {feature.stats}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Recent Activity</h2>
        <div className="space-y-3">
          <div className="flex items-center p-3 bg-gray-50 rounded-lg">
            <Calendar className="w-4 h-4 text-gray-500 mr-3" />
            <span className="text-gray-700">No recent activity</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 