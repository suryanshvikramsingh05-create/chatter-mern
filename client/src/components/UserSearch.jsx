import { useState } from 'react';
import api from '../api/axios';

const UserSearch = ({ onSelectUser }) => {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    const value = e.target.value;
    setTerm(value);

    if (!value.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.get(`/api/users?search=${encodeURIComponent(value)}`);
      setResults(data);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (user) => {
    setTerm('');
    setResults([]);
    onSelectUser(user);
  };

  return (
    <div className="user-search">
      <input
        type="text"
        placeholder="Search users to chat with..."
        value={term}
        onChange={handleSearch}
      />
      {loading && <p className="empty">Searching...</p>}
      {results.map((user) => (
        <div key={user._id} className="search-result" onClick={() => handleSelect(user)}>
          {user.username} <span className="preview">{user.email}</span>
        </div>
      ))}
    </div>
  );
};

export default UserSearch;
