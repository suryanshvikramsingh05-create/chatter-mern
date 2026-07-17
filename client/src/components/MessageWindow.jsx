import { useEffect, useRef, useState } from 'react';
import { getChatName, getOtherUser } from './ChatList';

const formatLastSeen = (lastSeen) => {
  if (!lastSeen) return 'offline';
  const diffMs = Date.now() - new Date(lastSeen).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'last seen just now';
  if (minutes < 60) return `last seen ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `last seen ${hours}h ago`;
  return `last seen ${new Date(lastSeen).toLocaleDateString()}`;
};

const MessageWindow = ({
  chat,
  messages,
  currentUserId,
  onSendMessage,
  onTyping,
  typingUser,
  onlineUsers,
  hasMoreMessages,
  onLoadMore,
  loadingMore,
}) => {
  const [content, setContent] = useState('');
  const bottomRef = useRef(null);
  const lastMessageId = messages[messages.length - 1]?._id;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessageId]);

  if (!chat) {
    return (
      <div className="message-window empty-state">
        <p>Select a chat to start messaging</p>
      </div>
    );
  }

  const otherUser = getOtherUser(chat, currentUserId);
  const isOtherOnline = otherUser && onlineUsers?.has(otherUser._id);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    onSendMessage(content.trim());
    setContent('');
  };

  return (
    <div className="message-window">
      <div className="message-window-header">
        <h2>{getChatName(chat, currentUserId)}</h2>
        {otherUser && (
          <span className="status">
            {isOtherOnline ? 'online' : formatLastSeen(otherUser.lastSeen)}
          </span>
        )}
      </div>

      <div className="messages">
        {hasMoreMessages && (
          <button className="load-more" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading...' : 'Load older messages'}
          </button>
        )}
        {messages.map((message) => {
          const isOwn = message.sender._id === currentUserId;
          const seenByOther = message.readBy.some((id) => id !== message.sender._id);
          return (
            <div key={message._id} className={`message ${isOwn ? 'own' : ''}`}>
              <span className="sender">{message.sender.username}</span>
              <p>{message.content}</p>
              {isOwn && <span className="receipt">{seenByOther ? '✓✓' : '✓'}</span>}
            </div>
          );
        })}
        {typingUser && <p className="typing-indicator">{typingUser} is typing...</p>}
        <div ref={bottomRef} />
      </div>

      <form className="message-input" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Type a message..."
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            onTyping?.();
          }}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

export default MessageWindow;
