import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

const Chat = () => {
  const [isChatting, setIsChatting] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState<{ sender: string; text: string }[]>([]);
  const [isBotChat, setIsBotChat] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const [usersWaiting, setUsersWaiting] = useState(0);

  useEffect(() => {
    socket.on('chatStarted', (data) => {
      setIsChatting(true);
      setIsBotChat(false);
      setLoading(false);
      setMessages((prevMessages) => [...prevMessages, { sender: 'System', text: data.message }]);
    });

    socket.on('newMessage', (data) => {
      setMessages((prevMessages) => [...prevMessages, { sender: data.sender, text: data.message }]);
    });

    socket.on('activeUsers', (data) => {
      setTotalUsers(data.count);
    });

    socket.on('waitingUsers', (data) => {
      setUsersWaiting(data.count);
    });

    socket.on('chatEnded', () => {
      setIsChatting(false);
      setMessages([]);
      setIsBotChat(false);
    });

    socket.on('waitingForUser', (data) => {
      setLoading(true);
      setMessages((prevMessages) => [...prevMessages, { sender: 'System', text: data.message }]);
    });

    socket.on('error', (err) => {
      setError(err.message || 'An error occurred.');
      setLoading(false);
    });

    return () => {
      socket.off('chatStarted');
      socket.off('newMessage');
      socket.off('chatEnded');
      socket.off('waitingForUser');
      socket.off('error');
    };
  }, []);

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      setMessages((prevMessages) => [...prevMessages, { sender: 'You', text: chatMessage }]);
      socket.emit('sendMessage', { message: chatMessage, isBot: isBotChat });
      setChatMessage('');
    }
  };

  const connectToRoom = () => {
    socket.emit('connectUser');
  };

  const handleBotChat = () => {
    setIsChatting(true);
    setIsBotChat(true);
    setLoading(false);
    setMessages((prevMessages) => [...prevMessages, { sender: 'System', text: 'You are now chatting with a bot.' }]);
  };

  return (
    <div className="chat-container p-6 bg-gray-100 min-h-screen flex flex-col items-center">
      {/* Chat Status */}

      <div className="chat-status mb-4 p-2 bg-white shadow-md rounded w-full max-w-lg">
        {loading && !isChatting && <p className="text-gray-500">Looking for a match... Please wait.</p>}
        {isChatting && <p>{isBotChat ? 'You are chatting with a bot.' : "You're chatting with another user."}</p>}
        {error && <p className="text-red-500 mt-2">{error}</p>}
        {!loading && !isChatting && <p>Welcome to Chatari!</p>}
      </div>

      {/* User Info */}
      <div className="user-info mb-4 p-2 bg-white shadow-md rounded w-full max-w-lg">
        <p>Total Users: {totalUsers}</p>
        <p>Users Waiting for a Room: {usersWaiting}</p>
      </div>

      {/* Message History */}
      <div className="message-history flex flex-col items-start mb-4 w-full max-w-lg bg-white p-4 rounded shadow-md h-96 overflow-y-auto">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message mb-2 ${
              msg.sender === 'You' ? 'self-end text-right bg-green-100' : 'self-start text-left bg-gray-100'
            } p-2 rounded`}
          >
            <strong>{msg.sender}:</strong> {msg.text}
          </div>
        ))}
      </div>

      {/* Message Input and Send Button */}
      {isChatting ? (
        <div className="chat-box flex items-center w-full max-w-lg">
          <input
            type="text"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder="Type a message"
            className="input input-bordered w-full p-2 border rounded mr-2 grow"
          />
          <button onClick={handleSendMessage} className="btn btn-primary bg-green-500 text-white py-2 px-6 rounded">
            Send
          </button>
        </div>
      ) : (
        !loading &&
        !isChatting && (
          <div className="w-full max-w-lg flex justify-around bg-white p-4 rounded shadow-md">
            <button onClick={connectToRoom} className="btn btn-secondary bg-blue-500 text-white py-2 px-4 rounded">
              Connect to a room
            </button>
            <button onClick={handleBotChat} className="btn btn-secondary bg-blue-500 text-white py-2 px-4 rounded">
              Chat with Bot
            </button>
          </div>
        )
      )}
    </div>
  );
};

export default Chat;
