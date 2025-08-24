import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Trash2, Search, Folder, FileText, Edit2, Save, X, 
  ChevronRight, ChevronDown, FolderPlus, FilePlus, ExternalLink,
  MoreVertical, Download, Share2, Star
} from 'lucide-react';
import axios from 'axios';

const Files = () => {
  const [fileTree, setFileTree] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [editingFile, setEditingFile] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAddFile, setShowAddFile] = useState(false);
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [addFileForm, setAddFileForm] = useState({ name: '', path: '', content: '' });
  const [addFolderForm, setAddFolderForm] = useState({ name: '', path: '' });
  const [language, setLanguage] = useState('auto'); // 'auto', 'ar', 'en'
  const textareaRef = useRef(null);

  useEffect(() => {
    fetchFileTree();
  }, []);

  const fetchFileTree = async () => {
    try {
      const response = await axios.get('/api/files/tree');
      setFileTree(response.data);
    } catch (error) {
      console.error('Error fetching file tree:', error);
    }
  };

  const handleAddFile = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setLoading(true);
    try {
      const response = await axios.post('/api/files/add', { text: inputText });
      setInputText('');
      fetchFileTree();
      alert(response.data.message);
    } catch (error) {
      console.error('Error adding file:', error);
      alert('Error adding file');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFileDirect = async (e) => {
    e.preventDefault();
    if (!addFileForm.name || !addFileForm.content) return;

    try {
      const response = await axios.post('/api/files/add-file', addFileForm);
      setShowAddFile(false);
      setAddFileForm({ name: '', path: '', content: '' });
      fetchFileTree();
      alert('File added successfully!');
    } catch (error) {
      console.error('Error adding file:', error);
      alert('Error adding file');
    }
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!addFolderForm.name) return;

    try {
      const response = await axios.post('/api/files/create-folder', addFolderForm);
      setShowAddFolder(false);
      setAddFolderForm({ name: '', path: '' });
      fetchFileTree();
      alert('Folder created successfully!');
    } catch (error) {
      console.error('Error creating folder:', error);
      alert('Error creating folder');
    }
  };

  const handleDeleteFile = async (id) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    
    try {
      await axios.delete(`/api/files/${id}`);
      setSelectedFile(null);
      fetchFileTree();
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const handleEditFile = (file) => {
    setEditingFile(file.id);
    setEditForm({
      name: file.name,
      content: file.content
    });
  };

  const handleSaveEdit = async () => {
    try {
      await axios.put(`/api/files/${editingFile}`, editForm);
      setEditingFile(null);
      setEditForm({});
      fetchFileTree();
      if (selectedFile && selectedFile.id === editingFile) {
        setSelectedFile({ ...selectedFile, ...editForm });
      }
    } catch (error) {
      console.error('Error updating file:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingFile(null);
    setEditForm({});
  };

  const toggleFolder = (folderPath) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  const renderTreeItem = (item, level = 0) => {
    const isExpanded = expandedFolders.has(item.path);
    const isSelected = selectedFile && selectedFile.id === item.id;

    if (item.type === 'folder') {
      return (
        <div key={item.id} className="select-none">
          <div
            className={`flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors ${
              isSelected ? 'bg-blue-50 border-r-2 border-blue-500' : ''
            }`}
            style={{ paddingLeft: `${level * 20 + 12}px` }}
            onClick={() => toggleFolder(item.path)}
          >
            <div className="flex items-center flex-1">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500 mr-2" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500 mr-2" />
              )}
              <Folder className="w-4 h-4 text-blue-500 mr-2" />
              <span className="text-sm font-medium text-gray-700">{item.name}</span>
            </div>
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setAddFileForm({ ...addFileForm, path: item.path });
                  setShowAddFile(true);
                }}
                className="p-1 hover:bg-gray-200 rounded"
                title="Add file to folder"
              >
                <FilePlus className="w-3 h-3 text-gray-600" />
              </button>
            </div>
          </div>
          {isExpanded && item.children && (
            <div className="ml-4">
              {item.children.map(child => renderTreeItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        key={item.id}
        className={`flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors ${
          isSelected ? 'bg-blue-50 border-r-2 border-blue-500' : ''
        }`}
        style={{ paddingLeft: `${level * 20 + 12}px` }}
        onClick={() => setSelectedFile(item)}
      >
        <div className="flex items-center flex-1">
          <FileText className="w-4 h-4 text-gray-600 mr-2" />
          <span className="text-sm text-gray-700">{item.name}</span>
        </div>
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEditFile(item);
            }}
            className="p-1 hover:bg-gray-200 rounded"
            title="Edit file"
          >
            <Edit2 className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteFile(item.id);
            }}
            className="p-1 hover:bg-gray-200 rounded"
            title="Delete file"
          >
            <Trash2 className="w-3 h-3 text-red-600" />
          </button>
        </div>
      </div>
    );
  };

  const extractUrls = (content) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return content.match(urlRegex) || [];
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - File Tree */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900 mb-4">File System</h1>
          
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={
                language === 'ar' ? 'البحث في الملفات...' : 
                language === 'en' ? 'Search files...' : 
                'البحث في الملفات... | Search files...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-right"
              dir={language === 'ar' ? 'rtl' : language === 'en' ? 'ltr' : 'auto'}
              style={{ direction: language === 'ar' ? 'rtl' : language === 'en' ? 'ltr' : 'auto' }}
            />
          </div>

          {/* Language Toggle */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
              <span>Language / اللغة</span>
            </div>
            <div className="flex space-x-1">
              <button
                onClick={() => setLanguage('auto')}
                className={`flex-1 py-2 px-2 rounded text-xs font-medium transition-colors ${
                  language === 'auto' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Auto
              </button>
              <button
                onClick={() => setLanguage('ar')}
                className={`flex-1 py-2 px-2 rounded text-xs font-medium transition-colors ${
                  language === 'ar' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                عربي
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`flex-1 py-2 px-2 rounded text-xs font-medium transition-colors ${
                  language === 'en' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                EN
              </button>
            </div>
          </div>

          {/* Add File Button */}
          <button
            onClick={() => setShowAddFile(true)}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center text-sm font-medium mb-2"
          >
            <Plus className="w-4 h-4 mr-2" />
            {language === 'ar' ? 'إضافة ملف' : language === 'en' ? 'Add File' : 'إضافة ملف | Add File'}
          </button>

          {/* Create Folder Button */}
          <button
            onClick={() => setShowAddFolder(true)}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center text-sm font-medium"
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            {language === 'ar' ? 'إنشاء مجلد' : language === 'en' ? 'Create Folder' : 'إنشاء مجلد | Create Folder'}
          </button>
        </div>

        {/* File Tree */}
        <div className="flex-1 overflow-y-auto">
          <div className="py-2">
            {fileTree.map(item => renderTreeItem(item))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedFile ? (
          <>
            {/* File Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="w-5 h-5 text-gray-600 mr-3" />
                  <div>
                    {editingFile === selectedFile.id ? (
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="text-lg font-semibold text-gray-900 border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                        dir="auto"
                        style={{ direction: 'auto' }}
                      />
                    ) : (
                      <h2 className="text-lg font-semibold text-gray-900">{selectedFile.name}</h2>
                    )}
                    <p className="text-sm text-gray-500">
                      {selectedFile.path ? `in ${selectedFile.path}` : 'in root'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {editingFile === selectedFile.id ? (
                    <>
                      <button
                        onClick={handleSaveEdit}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors flex items-center"
                      >
                        <Save className="w-4 h-4 mr-1" />
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 transition-colors flex items-center"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEditFile(selectedFile)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors flex items-center"
                      >
                        <Edit2 className="w-4 h-4 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteFile(selectedFile.id)}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors flex items-center"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* File Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                {editingFile === selectedFile.id ? (
                  <textarea
                    value={editForm.content}
                    onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                    rows={20}
                    className="w-full border border-gray-300 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm text-right"
                    placeholder={
                      language === 'ar' ? 'اكتب محتوى الملف هنا...' : 
                      language === 'en' ? 'Write file content here...' : 
                      'اكتب محتوى الملف هنا... | Write file content here...'
                    }
                    dir="auto"
                    style={{ direction: 'auto' }}
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="prose max-w-none">
                      <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 bg-gray-50 p-4 rounded-lg">
                        {selectedFile.content}
                      </pre>
                    </div>
                    
                    {/* Extract and display URLs */}
                    {extractUrls(selectedFile.content).length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                          <ExternalLink className="w-5 h-5 mr-2" />
                          Links
                        </h3>
                        <div className="space-y-2">
                          {extractUrls(selectedFile.content).map((url, index) => (
                            <a
                              key={index}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-blue-600 hover:text-blue-800 text-sm break-all flex items-center"
                            >
                              <ExternalLink className="w-3 h-3 mr-2 flex-shrink-0" />
                              {url}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No file selected</h3>
              <p className="text-gray-500">Select a file from the sidebar to view its content</p>
            </div>
          </div>
        )}
      </div>

      {/* AI Input Modal */}
      {showAddFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {language === 'ar' ? 'إضافة ملف جديد' : 'Add New File'}
            </h3>
            
            {/* AI Input Section */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                {language === 'ar' ? '🤖 إنشاء ملف بالذكاء الاصطناعي' : '🤖 AI-Powered File Creation'}
              </h4>
              <p className="text-sm text-blue-700 mb-3">
                {language === 'ar' ? 'صف ما تريد إنشاءه باللغة العربية أو الإنجليزية' : 'Describe what you want to create in Arabic or English'}
              </p>
              <form onSubmit={handleAddFile} className="space-y-3">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-right"
                  placeholder={
                    language === 'ar' ? 
                    'مثال: أضف هذا الرابط [https://example.com] في مجلد اليمن/صنعاء، اكتب أنه للمشاريع المحلية التي نعمل عليها' :
                    language === 'en' ? 
                    'Example: add this link [https://example.com] in yemen/sanaa folder, write it is for local projects we are working on' :
                    'مثال: أضف هذا الرابط [https://example.com] في مجلد yemen/sanaa، اكتب أنه للمشاريع المحلية التي نعمل عليها\n\nExample: add this link [https://example.com] in yemen/sanaa folder, write it is for local projects we are working on'
                  }
                  dir={language === 'ar' ? 'rtl' : language === 'en' ? 'ltr' : 'auto'}
                  style={{ direction: language === 'ar' ? 'rtl' : language === 'en' ? 'ltr' : 'auto' }}
                />
                <button
                  type="submit"
                  disabled={loading || !inputText.trim()}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? 
                    (language === 'ar' ? 'جاري الإنشاء...' : 'Creating...') : 
                    (language === 'ar' ? '🚀 إنشاء بالذكاء الاصطناعي' : '🚀 Create with AI')
                  }
                </button>
              </form>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                {language === 'ar' ? '📝 إنشاء ملف يدوياً' : '📝 Manual File Creation'}
              </h4>
              <form onSubmit={handleAddFileDirect} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'ar' ? 'اسم الملف' : 'File Name'}
                  </label>
                  <input
                    type="text"
                    value={addFileForm.name}
                    onChange={(e) => setAddFileForm({ ...addFileForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                    placeholder={
                      language === 'ar' ? 'مثال: مشروع-الوثائق' : 
                      language === 'en' ? 'Example: project-documentation' : 
                      'مثال: مشروع-الوثائق | Example: project-documentation'
                    }
                    dir="auto"
                    style={{ direction: 'auto' }}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'ar' ? 'مسار المجلد (اختياري)' : 'Folder Path (optional)'}
                  </label>
                  <input
                    type="text"
                    value={addFileForm.path}
                    onChange={(e) => setAddFileForm({ ...addFileForm, path: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                    placeholder={
                      language === 'ar' ? 'مثال: اليمن/صنعاء' : 
                      language === 'en' ? 'Example: projects/2024' : 
                      'مثال: yemen/sanaa | Example: projects/2024'
                    }
                    dir="auto"
                    style={{ direction: 'auto' }}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'ar' ? 'المحتوى' : 'Content'}
                  </label>
                  <textarea
                    value={addFileForm.content}
                    onChange={(e) => setAddFileForm({ ...addFileForm, content: e.target.value })}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-right"
                    placeholder={
                      language === 'ar' ? 'اكتب محتوى الملف هنا...' : 
                      language === 'en' ? 'Write file content here...' : 
                      'اكتب محتوى الملف هنا... | Write file content here...'
                    }
                    dir={language === 'ar' ? 'rtl' : language === 'en' ? 'ltr' : 'auto'}
                    style={{ direction: language === 'ar' ? 'rtl' : language === 'en' ? 'ltr' : 'auto' }}
                    required
                  />
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddFile(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {language === 'ar' ? 'إضافة ملف' : 'Add File'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {showAddFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {language === 'ar' ? 'إنشاء مجلد جديد' : 'Create New Folder'}
            </h3>
            
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'ar' ? 'اسم المجلد' : 'Folder Name'}
                </label>
                <input
                  type="text"
                  value={addFolderForm.name}
                  onChange={(e) => setAddFolderForm({ ...addFolderForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                  placeholder={
                    language === 'ar' ? 'مثال: المشاريع' : 
                    language === 'en' ? 'Example: projects' : 
                    'مثال: المشاريع | Example: projects'
                  }
                  dir="auto"
                  style={{ direction: 'auto' }}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'ar' ? 'المجلد الأب (اختياري)' : 'Parent Folder (optional)'}
                </label>
                <input
                  type="text"
                  value={addFolderForm.path}
                  onChange={(e) => setAddFolderForm({ ...addFolderForm, path: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                  placeholder={
                    language === 'ar' ? 'مثال: اليمن' : 
                    language === 'en' ? 'Example: yemen' : 
                    'مثال: اليمن | Example: yemen'
                  }
                  dir="auto"
                  style={{ direction: 'auto' }}
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddFolder(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  {language === 'ar' ? 'إنشاء مجلد' : 'Create Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Input Floating Button */}
      <div className="fixed bottom-6 right-6">
        <button
          onClick={() => {
            setInputText('');
            setShowAddFile(true);
          }}
          className="bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-colors duration-200"
          title={language === 'ar' ? 'إضافة ملف بالذكاء الاصطناعي' : 'Add file with AI'}
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default Files; 