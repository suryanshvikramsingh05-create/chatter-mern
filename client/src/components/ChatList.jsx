const getChatName = (chat, currentUserId) => {
  if (chat.isGroupChat) return chat.chatName;
  const other = chat.users.find((u) => u._id !== currentUserId);
  return other ? other.username : 'Unknown user';
};

const getOtherUser = (chat, currentUserId) => {
  if (chat.isGroupChat) return null;
  return chat.users.find((u) => u._id !== currentUserId) || null;
};

const ChatList = ({ chats, currentUserId, selectedChat, onSelectChat, onlineUsers }) => {
  return (
    <div className="chat-list">
      <h2>Chats</h2>
      {chats.length === 0 && <p className="empty">No chats yet. Search a user to start one.</p>}
      {chats.map((chat) => {
        const other = getOtherUser(chat, currentUserId);
        const isOnline = other && onlineUsers?.has(other._id);
        return (
          <div
            key={chat._id}
            className={`chat-list-item ${selectedChat?._id === chat._id ? 'active' : ''}`}
            onClick={() => onSelectChat(chat)}
          >
            <span className="name">
              {isOnline && <span className="online-dot" />}
              {getChatName(chat, currentUserId)}
            </span>
            {chat.latestMessage && (
              <span className="preview">{chat.latestMessage.content}</span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export { getChatName, getOtherUser };
export default ChatList;
