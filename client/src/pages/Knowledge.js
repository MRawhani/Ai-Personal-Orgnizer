import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Filter, Search, Brain } from 'lucide-react';
import axios from 'axios';

const Knowledge = () => {
  const [knowledge, setKnowledge] = useState([]);
  const [categories, setCategories] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ category: '', search: '' });

  useEffect(() => {
    fetchKnowledge();
    fetchCategories();
  }, [filter]);

  const fetchKnowledge = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.category) params.append('category', filter.category);
      
      const response = await axios.get(`/api/knowledge?${params}`);
      let filteredKnowledge = response.data;
      
      if (filter.search) {
        filteredKnowledge = filteredKnowledge.filter(item => 
          item.title.toLowerCase().includes(filter.search.toLowerCase()) ||
          item.content.toLowerCase().includes(filter.search.toLowerCase()) ||
          item.tags?.toLowerCase().includes(filter.search.toLowerCase())
        );
      }
      
      setKnowledge(filteredKnowledge);
    } catch (error) {
      console.error('Error fetching knowledge:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/knowledge/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleAddKnowledge = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setLoading(true);
    try {
      const response = await axios.post('/api/knowledge/add', { title, content, source });
      setKnowledge([response.data.knowledge, ...knowledge]);
      setTitle('');
      setContent('');
      setSource('');
      fetchCategories();
    } catch (error) {
      console.error('Error adding knowledge:', error);
      alert('Error adding knowledge');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteKnowledge = async (id) => {
    if (!window.confirm('Are you sure you want to delete this knowledge item?')) return;
    
    try {
      await axios.delete(`/api/knowledge/${id}`);
      setKnowledge(knowledge.filter(k => k.id !== id));
      fetchCategories();
    } catch (error) {
      console.error('Error deleting knowledge:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Knowledge Base</h1>
        <div className="flex items-center space-x-2">
          <Brain className="w-6 h-6 text-indigo-600" />
          <span className="text-lg font-semibold text-indigo-600">
            {knowledge.length} items
          </span>
        </div>
      </div>

      {/* Add Knowledge */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Add Knowledge</h2>
        <form onSubmit={handleAddKnowledge} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Knowledge title"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source (optional)
              </label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="URL or source"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content (AI will summarize and categorize)
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste content or write your knowledge here..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
              required
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || !title.trim() || !content.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              {loading ? 'Processing...' : 'Add Knowledge'}
            </button>
          </div>
        </form>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-4">
          <Filter className="w-5 h-5 text-gray-600 mr-2" />
          <h2 className="text-xl font-semibold text-gray-800">Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            value={filter.category}
            onChange={(e) => setFilter({ ...filter, category: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.category} value={category.category}>
                {category.category} ({category.count})
              </option>
            ))}
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search knowledge..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Knowledge Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {knowledge.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-3">
              <span className="inline-block px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded">
                {item.category || 'Uncategorized'}
              </span>
              <button
                onClick={() => handleDeleteKnowledge(item.id)}
                className="text-red-600 hover:text-red-800"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <h3 className="font-medium text-gray-800 mb-2">{item.title}</h3>
            <p className="text-sm text-gray-600 mb-3">{item.content}</p>
            {item.tags && (
              <div className="flex flex-wrap gap-1 mb-3">
                {item.tags.split(',').map((tag, index) => (
                  <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                    {tag.trim()}
                  </span>
                ))}
              </div>
            )}
            <div className="flex justify-between items-center">
              {item.source && (
                <a
                  href={item.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  View Source
                </a>
              )}
              <div className="text-xs text-gray-500">
                {new Date(item.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
        {knowledge.length === 0 && (
          <div className="col-span-full text-center text-gray-500 py-12">
            No knowledge items yet. Add your first knowledge above!
          </div>
        )}
      </div>
    </div>
  );
};

export default Knowledge; 