import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import axios from 'axios';

const References = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [references, setReferences] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchReferences(selectedProject.id);
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      const response = await axios.get('/api/references/projects');
      setProjects(response.data);
      if (response.data.length > 0 && !selectedProject) {
        setSelectedProject(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchReferences = async (projectId) => {
    try {
      const response = await axios.get(`/api/references/project/${projectId}`);
      setReferences(response.data);
    } catch (error) {
      console.error('Error fetching references:', error);
    }
  };

  const handleAddReference = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setLoading(true);
    try {
      const response = await axios.post('/api/references/add', { text: inputText });
      setReferences([response.data.reference, ...references]);
      setInputText('');
      fetchProjects();
    } catch (error) {
      console.error('Error adding reference:', error);
      alert('Error adding reference');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReference = async (id) => {
    if (!window.confirm('Are you sure you want to delete this reference?')) return;
    
    try {
      await axios.delete(`/api/references/${id}`);
      setReferences(references.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error deleting reference:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">References</h1>
        <div className="flex items-center space-x-2">
          <span className="text-lg font-semibold text-purple-600">
            {projects.length} projects • {references.length} references
          </span>
        </div>
      </div>

      {/* Add Reference */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Add Reference</h2>
        <form onSubmit={handleAddReference} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Describe your reference (AI will organize it by project)
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="e.g., add this to my React project: https://example.com/tutorial"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !inputText.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                {loading ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Projects and References */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Projects</h2>
          <div className="space-y-2">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => setSelectedProject(project)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedProject?.id === project.id
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="font-medium">{project.name}</div>
                <div className="text-sm text-gray-500">{project.description}</div>
              </button>
            ))}
            {projects.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No projects yet. Add your first reference above!
              </div>
            )}
          </div>
        </div>

        {/* References List */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {selectedProject ? `${selectedProject.name} References` : 'Select a Project'}
          </h2>
          <div className="space-y-3">
            {references.map((reference) => (
              <div key={reference.id} className="flex justify-between items-start p-4 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-gray-800">{reference.name}</div>
                  {reference.description && (
                    <div className="text-sm text-gray-600 mt-1">{reference.description}</div>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    {new Date(reference.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  {reference.url && (
                    <a
                      href={reference.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={() => handleDeleteReference(reference.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {selectedProject && references.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No references in this project yet. Add your first reference above!
              </div>
            )}
            {!selectedProject && (
              <div className="text-center text-gray-500 py-8">
                Select a project to view its references
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default References; 