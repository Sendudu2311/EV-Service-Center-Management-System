import React, { useState, useEffect } from 'react';
import { contactsAPI } from '../services/api';
import toast from 'react-hot-toast';

interface Contact {
  _id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'open' | 'in-progress' | 'closed';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  formattedSubject: string;
  formattedStatus: string;
  timeAgo: string;
  notes: Array<{
    content: string;
    addedBy: {
      _id: string;
      firstName: string;
      lastName: string;
    };
    addedAt: string;
  }>;
}

interface ContactStats {
  total: number;
  unread: number;
  today: number;
  byStatus: {
    open: number;
    'in-progress': number;
    closed: number;
  };
}

const ContactManagementPage: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState<ContactStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'in-progress' | 'closed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteContent, setNoteContent] = useState('');

  useEffect(() => {
    loadContacts();
    loadStats();
  }, [filterStatus, searchTerm, currentPage]);

  const loadContacts = async () => {
    try {
      const response = await contactsAPI.getAll({
        status: filterStatus,
        search: searchTerm || undefined,
        page: currentPage,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      setContacts(response.data.data.contacts);
      setTotalPages(response.data.data.pagination.totalPages);
    } catch (error: any) {
      toast.error('Failed to load contacts');
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await contactsAPI.getStats();
      setStats(response.data.data);
    } catch (error: any) {
      console.error('Error loading stats:', error);
    }
  };

  const handleStatusChange = async (contactId: string, newStatus: string, assignedTo?: string) => {
    try {
      await contactsAPI.updateStatus(contactId, {
        status: newStatus as any,
        assignedTo: assignedTo || undefined,
      });

      toast.success('Contact status updated');
      loadContacts();
      loadStats();

      if (selectedContact && selectedContact._id === contactId) {
        setSelectedContact(null);
      }
    } catch (error: any) {
      toast.error('Failed to update contact status');
      console.error('Error updating status:', error);
    }
  };

  const handleAddNote = async () => {
    if (!selectedContact || !noteContent.trim()) return;

    try {
      await contactsAPI.addNote(selectedContact._id, { content: noteContent.trim() });
      toast.success('Note added successfully');
      setNoteContent('');
      setShowNoteModal(false);
      loadContacts();
    } catch (error: any) {
      toast.error('Failed to add note');
      console.error('Error adding note:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Contact Management</h1>
          <p className="text-gray-600">Manage customer inquiries and support messages</p>
        </div>
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contacts List and Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contacts List */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Contact Messages</h2>
            </div>
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {contacts.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No contacts found
                </div>
              ) : (
                contacts.map((contact) => (
                  <div
                    key={contact._id}
                    onClick={() => setSelectedContact(contact)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedContact?._id === contact._id ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                    } ${!contact.isRead ? 'bg-blue-25' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-900 truncate">{contact.name}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(contact.status)}`}>
                        {contact.formattedStatus}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{contact.email}</p>
                    <p className="text-sm text-gray-800 mb-2 line-clamp-2">{contact.message}</p>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>{contact.timeAgo}</span>
                      <span className={`font-medium ${getPriorityColor(contact.priority)}`}>
                        {contact.priority.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-gray-200 flex justify-between items-center">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Contact Detail */}
          <div className="bg-white rounded-lg shadow">
            {selectedContact ? (
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedContact.name}</h2>
                    <p className="text-gray-600">{selectedContact.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={selectedContact.status}
                      onChange={(e) => handleStatusChange(selectedContact._id, e.target.value)}
                      className="px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="open">Open</option>
                      <option value="in-progress">In Progress</option>
                      <option value="closed">Closed</option>
                    </select>
                    <button
                      onClick={() => setShowNoteModal(true)}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Add Note
                    </button>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-center gap-4 mb-4">
                    <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(selectedContact.status)}`}>
                      {selectedContact.formattedStatus}
                    </span>
                    <span className="text-sm text-gray-600">
                      {selectedContact.formattedSubject}
                    </span>
                    <span className={`text-sm font-medium ${getPriorityColor(selectedContact.priority)}`}>
                      {selectedContact.priority.toUpperCase()} PRIORITY
                    </span>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Message</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedContact.message}</p>
                  </div>
                </div>

                {/* Notes Section */}
                {selectedContact.notes && selectedContact.notes.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Notes</h3>
                    <div className="space-y-3">
                      {selectedContact.notes.map((note, index) => (
                        <div key={index} className="bg-blue-50 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-sm font-medium text-blue-900">
                              {note.addedBy.firstName} {note.addedBy.lastName}
                            </span>
                            <span className="text-xs text-blue-600">
                              {new Date(note.addedAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-blue-800">{note.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-sm text-gray-500">
                  Created: {new Date(selectedContact.createdAt).toLocaleString()}
                  {selectedContact.updatedAt !== selectedContact.createdAt && (
                    <span className="ml-4">
                      Updated: {new Date(selectedContact.updatedAt).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                Select a contact to view details
              </div>
            )}
          </div>
        </div>

        {/* Add Note Modal */}
        {showNoteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Add Note</h3>
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Enter your note..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowNoteModal(false);
                    setNoteContent('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddNote}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add Note
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactManagementPage;