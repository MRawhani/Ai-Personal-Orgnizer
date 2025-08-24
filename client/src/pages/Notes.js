import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Search, Filter, Edit2, Save, X, Hash, MessageSquare, MoreVertical } from 'lucide-react';
import axios from 'axios';

const Notes = () => {
  const [notes, setNotes] = useState([]);
  const [topics, setTopics] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ topic: '', search: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 });
  const [cursorPosition, setCursorPosition] = useState(0);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteForm, setEditingNoteForm] = useState({});
  const textareaRef = useRef(null);
  const noteRefs = useRef({});

  const modernColors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
  ];

  // Assign colors to topics
  const getTopicColor = (topic) => {
    const topicIndex = topics.indexOf(topic);
    return modernColors[topicIndex % modernColors.length];
  };

  useEffect(() => {
    fetchNotes();
    fetchTopics();
  }, [filter]);

  // Focus on input when component mounts
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Focus on note when editing starts
  useEffect(() => {
    if (editingNoteId && noteRefs.current[editingNoteId]) {
      const noteElement = noteRefs.current[editingNoteId];
      noteElement.focus();
      // Place cursor at the end of the text
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(noteElement);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }, [editingNoteId]);

  const fetchNotes = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.topic) params.append('topic', filter.topic);
      
      const response = await axios.get(`/api/notes?${params}`);
      let filteredNotes = response.data;
      
      if (filter.search) {
        filteredNotes = filteredNotes.filter(note => 
          note.topic.toLowerCase().includes(filter.search.toLowerCase()) ||
          note.content.toLowerCase().includes(filter.search.toLowerCase())
        );
      }
      
      setNotes(filteredNotes);
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  const fetchTopics = async () => {
    try {
      const response = await axios.get('/api/notes/topics/list');
      setTopics(response.data);
    } catch (error) {
      console.error('Error fetching topics:', error);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setLoading(true);
    try {
      const response = await axios.post('/api/notes/add', { text: inputText });
      
      // Add all new notes to the list
      if (response.data.notes && response.data.notes.length > 0) {
        setNotes([...response.data.notes, ...notes]);
      }
      
      setInputText('');
      fetchTopics();
      
      // Focus on the first newly created note for editing
      if (response.data.notes && response.data.notes.length > 0) {
        const firstNewNote = response.data.notes[0];
        setTimeout(() => {
          setEditingNoteId(firstNewNote.id);
          setEditingNoteForm({
            topic: firstNewNote.topic,
            content: firstNewNote.content,
            color: firstNewNote.color
          });
        }, 100);
      }
      
      // Show success message
      if (response.data.notes.length > 1) {
        alert(`Successfully added ${response.data.notes.length} note cards!`);
      }
    } catch (error) {
      console.error('Error adding note:', error);
      alert('Error adding note');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async (topic, content) => {
    try {
      const response = await axios.post('/api/notes/add-card', { topic, content, color: getTopicColor(topic) });
      const newNote = response.data.note;
      setNotes([newNote, ...notes]);
      fetchTopics();
      
      // Focus on the newly added note for editing
      setTimeout(() => {
        setEditingNoteId(newNote.id);
        setEditingNoteForm({
          topic: newNote.topic,
          content: newNote.content,
          color: newNote.color
        });
      }, 100);
    } catch (error) {
      console.error('Error adding card:', error);
      alert('Error adding card');
    }
  };

  const handleDeleteNote = async (id) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    
    try {
      await axios.delete(`/api/notes/${id}`);
      setNotes(notes.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const handleEditNote = (note) => {
    setEditingNoteId(note.id);
    setEditingNoteForm({
      topic: note.topic,
      content: note.content,
      color: note.color
    });
  };

  const handleSaveNoteEdit = async () => {
    try {
      const response = await axios.put(`/api/notes/${editingNoteId}`, editingNoteForm);
      setNotes(notes.map(n => 
        n.id === editingNoteId ? { ...n, ...editingNoteForm } : n
      ));
      setEditingNoteId(null);
      setEditingNoteForm({});
      fetchTopics();
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  const handleCancelNoteEdit = () => {
    setEditingNoteId(null);
    setEditingNoteForm({});
  };

  const handleTextareaChange = (e) => {
    const value = e.target.value;
    setInputText(value);
    
    // Check for @ symbol for autocomplete
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    
    if (atIndex !== -1 && atIndex < cursorPos) {
      const query = textBeforeCursor.substring(atIndex + 1);
      if (query.length > 0) {
        const rect = e.target.getBoundingClientRect();
        const lineHeight = 20;
        const lines = textBeforeCursor.split('\n').length;
        
        setAutocompletePosition({
          top: rect.top + (lines * lineHeight),
          left: rect.left + (atIndex * 8) // Approximate character width
        });
        setShowAutocomplete(true);
        setCursorPosition(cursorPos);
      } else {
        setShowAutocomplete(false);
      }
    } else {
      setShowAutocomplete(false);
    }
  };

  const handleAutocompleteSelect = (topic) => {
    const beforeAt = inputText.substring(0, inputText.lastIndexOf('@'));
    const afterCursor = inputText.substring(cursorPosition);
    const newText = beforeAt + '@' + topic + ' ' + afterCursor;
    setInputText(newText);
    setShowAutocomplete(false);
    
    // Focus back to textarea
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const filteredTopics = topics.filter(topic => 
    topic.toLowerCase().includes(inputText.substring(inputText.lastIndexOf('@') + 1).toLowerCase())
  );

  const clearFilters = () => {
    setFilter({ topic: '', search: '' });
  };

  // Group notes by topic
  const notesByTopic = notes.reduce((acc, note) => {
    if (!acc[note.topic]) {
      acc[note.topic] = [];
    }
    acc[note.topic].push(note);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Notes</h1>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-sm text-gray-600">Total Notes</div>
            <div className="text-lg font-semibold text-blue-600">{notes.length}</div>
          </div>
        </div>
      </div>

      {/* Add Note Form */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />
          Add New Note
        </h2>
        <form onSubmit={handleAddNote} className="space-y-4">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Describe your note (use @topic for categorization)
            </label>
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={handleTextareaChange}
              placeholder="Examples:&#10;• @meeting call with john tomorrow at 3pm&#10;• @todo buy groceries&#10;• @project finish react app&#10;• @meeting discuss budget&#10;  - review expenses&#10;  - plan next quarter"
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={loading}
            />
            
            {/* Autocomplete Dropdown */}
            {showAutocomplete && (
              <div 
                className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                style={{ 
                  top: `${autocompletePosition.top}px`, 
                  left: `${autocompletePosition.left}px`,
                  minWidth: '200px'
                }}
              >
                {filteredTopics.map((topic, index) => (
                  <div
                    key={index}
                    onClick={() => handleAutocompleteSelect(topic)}
                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center">
                      <Hash className="w-3 h-3 mr-2 text-blue-600" />
                      {topic}
                    </div>
                  </div>
                ))}
                {filteredTopics.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    No matching topics
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Use @topic to categorize. AI will fix typos and split multiple notes intelligently.
            </div>
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-lg font-medium"
            >
              <Plus className="w-5 h-5 mr-2" />
              {loading ? 'Processing...' : 'Add Note'}
            </button>
          </div>
        </form>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search notes..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filter.topic}
            onChange={(e) => setFilter({ ...filter, topic: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Topics</option>
            {topics.map((topic, index) => (
              <option key={index} value={topic}>{topic}</option>
            ))}
          </select>
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex space-x-6 overflow-x-auto pb-4">
                 {Object.entries(notesByTopic).map(([topic, topicNotes]) => (
           <div
             key={topic}
             className="flex-shrink-0 w-80 rounded-xl p-4 border border-gray-200"
             style={{ 
               backgroundColor: `${getTopicColor(topic)}15`, // 15% opacity
               borderColor: getTopicColor(topic)
             }}
           >
                         {/* Topic Header */}
             <div className="flex items-center justify-between mb-4">
               <div className="flex items-center">
                 <Hash className="w-5 h-5 mr-2" style={{ color: getTopicColor(topic) }} />
                 <h3 className="font-semibold text-gray-800 text-lg">{topic}</h3>
                 <span 
                   className="ml-2 text-xs px-2 py-1 rounded-full text-white font-medium"
                   style={{ backgroundColor: getTopicColor(topic) }}
                 >
                   {topicNotes.length}
                 </span>
               </div>
                             <button
                 onClick={() => handleAddCard(topic, 'New note...')}
                 className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                 style={{ color: getTopicColor(topic) }}
               >
                 <Plus className="w-4 h-4" />
               </button>
            </div>

            {/* Notes in this topic */}
            <div className="space-y-3">
              {topicNotes.map((note) => (
                                 <div
                   key={note.id}
                   className={`rounded-lg shadow-sm border p-3 transition-all duration-200 cursor-pointer group ${
                     editingNoteId === note.id 
                       ? 'bg-white border-blue-300 shadow-md' 
                       : 'bg-white border-gray-200 hover:shadow-md hover:border-gray-300'
                   }`}
                   style={{ borderLeft: `3px solid ${getTopicColor(topic)}` }}
                 >
                                    <div>
                    <div className="flex items-start justify-between mb-2">
                                             <div 
                         ref={(el) => noteRefs.current[note.id] = el}
                         className="text-gray-700 text-sm leading-relaxed flex-1 outline-none focus:ring-1 focus:ring-blue-500 focus:bg-blue-50 rounded px-1 py-1"
                         contentEditable={editingNoteId === note.id}
                         suppressContentEditableWarning={true}
                         onBlur={(e) => {
                           if (editingNoteId === note.id) {
                             setEditingNoteForm({ ...editingNoteForm, content: e.target.textContent });
                           }
                         }}
                         onKeyDown={(e) => {
                           if (e.key === 'Enter' && !e.shiftKey) {
                             e.preventDefault();
                             handleSaveNoteEdit();
                           }
                           if (e.key === 'Escape') {
                             handleCancelNoteEdit();
                           }
                         }}
                       >
                        {note.content}
                      </div>
                      <div className="flex space-x-1 ml-2">
                                                 {editingNoteId === note.id ? (
                           <>
                             <button
                               onClick={handleSaveNoteEdit}
                               className="text-green-600 hover:text-green-800 p-1 hover:bg-green-50 rounded transition-colors"
                               title="Save changes"
                             >
                               <Save className="w-3 h-3" />
                             </button>
                             <button
                               onClick={handleCancelNoteEdit}
                               className="text-gray-600 hover:text-gray-800 p-1 hover:bg-gray-50 rounded transition-colors"
                               title="Cancel editing"
                             >
                               <X className="w-3 h-3" />
                             </button>
                           </>
                         ) : (
                          <>
                            <button
                              onClick={() => handleEditNote(note)}
                              className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition-colors"
                              title="Edit note"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded transition-colors"
                              title="Delete note"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(note.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {notes.length === 0 && (
        <div className="text-center text-gray-500 py-12">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No notes found</p>
          <p className="text-sm">Try adjusting your filters or add a new note</p>
        </div>
      )}

             {/* Quick Add Card Button */}
       <div className="fixed bottom-6 right-6">
         <button
           onClick={() => handleAddCard('general', 'New note...')}
           className="bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-colors duration-200"
         >
           <Plus className="w-6 h-6" />
         </button>
       </div>
    </div>
  );
};

export default Notes; 