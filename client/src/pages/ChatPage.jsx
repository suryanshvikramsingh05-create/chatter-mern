import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import ChatList from '../components/ChatList';
import UserSearch from '../components/UserSearch';
import MessageWindow from '../components/MessageWindow';
import GroupChatModal from '../components/GroupChatModal';
import getAvatarUrl from '../utils/getAvatarUrl';

const ChatPage = () => {
  const { user, logout, updateUser } = useAuth();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUser, setTypingUser] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [messagesPage, setMessagesPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const socketRef = useRef(null);
  const selectedChatRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  const fetchChats = async () => {
    const { data } = await api.get('/api/chats');
    setChats(data);
  };

  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL);
    socketRef.current = socket;
    socket.emit('setup', user._id);

    socket.on('online users', (list) => setOnlineUsers(new Set(list)));
    socket.on('user online', (userId) => {
      setOnlineUsers((prev) => new Set(prev).add(userId));
    });
    socket.on('user offline', ({ userId }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    socket.on('message received', (message) => {
      const currentChat = selectedChatRef.current;
      if (currentChat && currentChat._id === message.chat._id) {
        setMessages((prev) => [...prev, message]);
      }
      fetchChats();
    });

    socket.on('messages read', ({ chatId, readerId }) => {
      const currentChat = selectedChatRef.current;
      if (!currentChat || currentChat._id !== chatId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.readBy.includes(readerId) ? m : { ...m, readBy: [...m.readBy, readerId] }
        )
      );
    });

    socket.on('typing', (chatId) => {
      if (selectedChatRef.current?._id === chatId) setTypingUser('Someone');
    });
    socket.on('stop typing', (chatId) => {
      if (selectedChatRef.current?._id === chatId) setTypingUser(null);
    });

    return () => socket.disconnect();
  }, [user._id]);

  const handleSelectChat = async (chat) => {
    setSelectedChat(chat);
    setMessages([]);
    setMessagesPage(1);
    setHasMoreMessages(false);
    socketRef.current?.emit('join chat', chat._id);
    const { data } = await api.get(`/api/messages/${chat._id}?page=1`);
    setMessages(data.messages);
    setHasMoreMessages(data.hasMore);
  };

  const handleLoadMore = async () => {
    if (!selectedChat || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = messagesPage + 1;
      const { data } = await api.get(`/api/messages/${selectedChat._id}?page=${nextPage}`);
      setMessages((prev) => [...data.messages, ...prev]);
      setMessagesPage(nextPage);
      setHasMoreMessages(data.hasMore);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSelectUser = async (otherUser) => {
    const { data } = await api.post('/api/chats', { userId: otherUser._id });
    setChats((prev) => {
      const exists = prev.find((c) => c._id === data._id);
      return exists ? prev : [data, ...prev];
    });
    handleSelectChat(data);
  };

  const handleSendMessage = async (content) => {
    const { data } = await api.post('/api/messages', {
      content,
      chatId: selectedChat._id,
    });
    setMessages((prev) => [...prev, data]);
    socketRef.current?.emit('new message', data);
    fetchChats();
  };

  const handleTyping = () => {
    if (!selectedChat) return;
    socketRef.current?.emit('typing', selectedChat._id);

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('stop typing', selectedChat._id);
    }, 2000);
  };

  const handleGroupCreated = (chat) => {
    setChats((prev) => [chat, ...prev]);
    setShowGroupModal(false);
    handleSelectChat(chat);
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('pic', file);

    setAvatarUploading(true);
    try {
      const { data } = await api.post('/api/users/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser({ pic: data.pic });
    } catch (err) {
      alert(err.response?.data?.message || 'Avatar upload failed');
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="chat-page">
      <aside className="sidebar">
        <div className="sidebar-header">
          <label className="avatar-upload">
            {getAvatarUrl(user.pic) ? (
              <img src={getAvatarUrl(user.pic)} alt="" className="avatar" />
            ) : (
              <div className="avatar avatar-placeholder">{user.username[0].toUpperCase()}</div>
            )}
            <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleAvatarChange} />
          </label>
          <span>{avatarUploading ? 'Uploading...' : user.username}</span>
          <button onClick={() => setShowGroupModal(true)}>New Group</button>
          <button onClick={logout}>Log out</button>
        </div>
        <UserSearch onSelectUser={handleSelectUser} />
        <ChatList
          chats={chats}
          currentUserId={user._id}
          selectedChat={selectedChat}
          onSelectChat={handleSelectChat}
          onlineUsers={onlineUsers}
        />
      </aside>
      <MessageWindow
        chat={selectedChat}
        messages={messages}
        currentUserId={user._id}
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
        typingUser={typingUser}
        onlineUsers={onlineUsers}
        hasMoreMessages={hasMoreMessages}
        onLoadMore={handleLoadMore}
        loadingMore={loadingMore}
      />
      {showGroupModal && (
        <GroupChatModal onClose={() => setShowGroupModal(false)} onCreated={handleGroupCreated} />
      )}
    </div>
  );
};

export default ChatPage;
