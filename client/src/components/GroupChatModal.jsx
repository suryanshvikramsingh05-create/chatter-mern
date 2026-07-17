import { useState } from 'react';
import api from '../api/axios';

const GroupChatModal = ({ onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [term, setTerm] = useState('');
  const [results, setResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    const value = e.target.value;
    setTerm(value);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    const { data } = await api.get(`/api/users?search=${encodeURIComponent(value)}`);
    setResults(data);
  };

  const toggleUser = (user) => {
    setSelectedUsers((prev) =>
      prev.some((u) => u._id === user._id)
        ? prev.filter((u) => u._id !== user._id)
        : [...prev, user]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || selectedUsers.length < 2) {
      setError('Give the group a name and pick at least 2 members');
      return;
    }

    try {
      const { data } = await api.post('/api/chats/group', {
        name: name.trim(),
        userIds: selectedUsers.map((u) => u._id),
      });
      onCreated(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create group');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>New Group Chat</h2>
        {error && <p className="error">{error}</p>}
        <input
          type="text"
          placeholder="Group name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="text"
          placeholder="Search users to add..."
          value={term}
          onChange={handleSearch}
        />

        {selectedUsers.length > 0 && (
          <div className="selected-users">
            {selectedUsers.map((u) => (
              <span key={u._id} className="chip" onClick={() => toggleUser(u)}>
                {u.username} &times;
              </span>
            ))}
          </div>
        )}

        <div className="search-results">
          {results.map((user) => (
            <div key={user._id} className="search-result" onClick={() => toggleUser(user)}>
              {selectedUsers.some((u) => u._id === user._id) ? '✓ ' : ''}
              {user.username}
            </div>
          ))}
        </div>

        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit">Create Group</button>
        </div>
      </form>
    </div>
  );
};

export default GroupChatModal;
