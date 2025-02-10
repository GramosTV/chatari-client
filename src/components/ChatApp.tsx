import { useEffect, useRef, useState } from 'react';
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
  const [roomMateTyping, setRoomMateTyping] = useState(false);
  const messageEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    socket.on('chatStarted', (data) => {
      setIsChatting(true);
      setIsBotChat(false);
      setLoading(false);
      setMessages((prevMessages) => [{ sender: 'System', text: data.message }]);
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

    socket.on('chatEnded', (data) => {
      setMessages((prevMessages) => [...prevMessages, { sender: data.sender, text: data.message }]);
      setIsChatting(false);
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

    socket.on('typing', (data) => {
      setRoomMateTyping(true);
    });

    socket.on('stopTyping', () => {
      setRoomMateTyping(false);
    });

    return () => {
      socket.off('chatStarted');
      socket.off('newMessage');
      socket.off('chatEnded');
      socket.off('waitingForUser');
      socket.off('error');
      socket.off('typing');
      socket.off('stopTyping');
    };
  }, []);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const connectToRoom = () => {
    socket.emit('connectUser');
  };

  const handleBotChat = () => {
    setIsChatting(true);
    setIsBotChat(true);
    setLoading(false);
    setMessages((prevMessages) => [{ sender: 'System', text: 'You are now chatting with a bot.' }]);
  };

  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTyping = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing');
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('stopTyping');
    }, 2500);
  };

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      socket.emit('stopTyping');
      setMessages((prevMessages) => [...prevMessages, { sender: 'You', text: chatMessage }]);
      socket.emit('sendMessage', { message: chatMessage, isBot: isBotChat });
      setChatMessage('');
    }
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && isChatting) {
        handleSendMessage();
      } else if (e.key === 'Escape' && isChatting) {
        handleDisconnect();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [chatMessage]);

  const handleDisconnect = () => {
    if (window.confirm('Are you sure you want to leave the chat?')) {
      socket.emit('leaveRoom');
      setIsChatting(false);
      if (isBotChat) {
        setMessages((prevMessages) => [...prevMessages, { sender: 'System', text: 'You have left the bot chat.' }]);
      }
      setIsBotChat(false);
    }
  };

  return (
    <div className="chat-container p-6 min-h-screen flex flex-col items-center">
      {/* Chat Status */}

      <div className="chat-status mb-4 p-2 bg-white shadow-md rounded w-full max-w-lg">
        {loading && !isChatting && <p className="text-gray-500">Looking for a match... Please wait.</p>}
        {isChatting && <p>{isBotChat ? 'You are chatting with a bot.' : "You're chatting with another user."}</p>}
        {error && <p className="text-red-500 mt-2">{error}</p>}
        {!loading && !isChatting && <p>Welcome to Chatari!</p>}
      </div>

      {/* User Info */}
      <div className="user-info mb-4 p-2 bg-white shadow-md rounded w-full max-w-lg">
        <p>Online Users: {totalUsers}</p>
        <p>Users Waiting for a Room: {usersWaiting}</p>
      </div>

      {/* Message History */}
      <div className="wrapper w-full max-w-lg">
        <div className="message-history flex flex-col items-start mb-4 w-full max-w-lg bg-white p-4 rounded shadow-md h-96 overflow-y-auto">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`message mb-2 ${
                msg.sender === 'You'
                  ? 'self-end text-right bg-green-100'
                  : msg.sender === 'System'
                  ? 'self-center text-center bg-yellow-100'
                  : 'self-start text-left bg-gray-100'
              } p-2 rounded`}
            >
              <strong>{msg.sender}:</strong> {msg.text}
            </div>
          ))}
          <div ref={messageEndRef} />
        </div>

        {roomMateTyping && isChatting && (
          <div className="typing-indicator-container">
            <div className="typing-indicator">
              <div className="typing-circle"></div>
              <div className="typing-circle"></div>
              <div className="typing-circle"></div>
              {/* <div className="typing-shadow"></div>
            <div className="typing-shadow"></div>
            <div className="typing-shadow"></div> */}
            </div>
          </div>
        )}
      </div>

      {/* Message Input and Send Button */}
      {isChatting ? (
        <div className="chat-box flex items-center w-full max-w-lg">
          <button onClick={handleDisconnect} className="btn bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600">
            X
          </button>
          <input
            type="text"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyDown={handleTyping}
            placeholder="Type a message"
            className="input input-bordered w-full p-2 border rounded mx-2 grow"
          />
          <button
            onClick={handleSendMessage}
            className="btn btn-primary bg-green-500 text-white py-2 px-6 rounded hover:bg-green-600"
          >
            Send
          </button>
        </div>
      ) : (
        !loading &&
        !isChatting && (
          <div className="w-full max-w-lg flex justify-around bg-white p-4 rounded shadow-md">
            <button
              onClick={connectToRoom}
              className="btn btn-secondary bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
            >
              Connect to a room
            </button>
            <button
              onClick={handleBotChat}
              className="btn btn-secondary bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
            >
              Chat with Bot
            </button>
          </div>
        )
      )}
    </div>
  );
};

export default Chat;
