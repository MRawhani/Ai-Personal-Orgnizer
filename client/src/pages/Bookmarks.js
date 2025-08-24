import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ExternalLink, Filter, Search } from 'lucide-react';
import axios from 'axios';

const Bookmarks = () => {
  const [bookmarks, setBookmarks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ category: '', search: '' });

  useEffect(() => {
    fetchBookmarks();
    fetchCategories();
  }, [filter]);

  const fetchBookmarks = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.category) params.append('category', filter.category);
      
      const response = await axios.get(`/api/bookmarks?${params}`);
      let filteredBookmarks = response.data;
      
      if (filter.search) {
        filteredBookmarks = filteredBookmarks.filter(bookmark => 
          bookmark.title.toLowerCase().includes(filter.search.toLowerCase()) ||
          bookmark.description?.toLowerCase().includes(filter.search.toLowerCase()) ||
          bookmark.tags?.toLowerCase().includes(filter.search.toLowerCase())
        );
      }
      
      setBookmarks(filteredBookmarks);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/bookmarks/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleAddBookmark = async (e) => {
    e.preventDefault();
    if (!url.trim() || !title.trim()) return;

    setLoading(true);
    try {
      const response = await axios.post('/api/bookmarks/add', { url, title });
      setBookmarks([response.data.bookmark, ...bookmarks]);
      setUrl('');
      setTitle('');
      fetchCategories();
    } catch (error) {
      console.error('Error adding bookmark:', error);
      alert('Error adding bookmark');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBookmark = async (id) => {
    if (!window.confirm('Are you sure you want to delete this bookmark?')) return;
    
    try {
      await axios.delete(`/api/bookmarks/${id}`);
      setBookmarks(bookmarks.filter(b => b.id !== id));
      fetchCategories();
    } catch (error) {
      console.error('Error deleting bookmark:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Bookmarks</h1>
        <div className="flex items-center space-x-2">
          <span className="text-lg font-semibold text-yellow-600">
            {bookmarks.length} bookmarks
          </span>
        </div>
      </div>

      {/* Add Bookmark */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Add Bookmark</h2>
        <form onSubmit={handleAddBookmark} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Bookmark title"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
                required
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || !url.trim() || !title.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              {loading ? 'Adding...' : 'Add Bookmark'}
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
              placeholder="Search bookmarks..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Bookmarks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bookmarks.map((bookmark) => (
          <div key={bookmark.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-3">
              <span className="inline-block px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                {bookmark.category || 'Uncategorized'}
              </span>
              <button
                onClick={() => handleDeleteBookmark(bookmark.id)}
                className="text-red-600 hover:text-red-800"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <h3 className="font-medium text-gray-800 mb-2">{bookmark.title}</h3>
            {bookmark.description && (
              <p className="text-sm text-gray-600 mb-3">{bookmark.description}</p>
            )}
            {bookmark.tags && (
              <div className="flex flex-wrap gap-1 mb-3">
                {bookmark.tags.split(',').map((tag, index) => (
                  <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                    {tag.trim()}
                  </span>
                ))}
              </div>
            )}
            <div className="flex justify-between items-center">
              <a
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 flex items-center"
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                Visit
              </a>
              <div className="text-xs text-gray-500">
                {new Date(bookmark.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
        {bookmarks.length === 0 && (
          <div className="col-span-full text-center text-gray-500 py-12">
            No bookmarks yet. Add your first bookmark above!
          </div>
        )}
      </div>
    </div>
  );
};

export default Bookmarks; 