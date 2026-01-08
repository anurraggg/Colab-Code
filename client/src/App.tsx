import { useState, useEffect } from 'react';
import './App.css';
import { CodeEditor } from './components/Editor';
import { Login } from './components/Login';

interface User {
  id: string;
  name: string;
  avatar: string;
}

function App() {
  const [roomId, setRoomId] = useState('');
  const [joined, setJoined] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [recentRooms, setRecentRooms] = useState<string[]>([]);
  const [theme, setTheme] = useState('cyberpunk');

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    fetch(`${apiUrl}/auth/user`, { credentials: 'include' })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Not authenticated');
      })
      .then(data => {
        setUser(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });

    const savedRooms = localStorage.getItem('recentRooms');
    if (savedRooms) {
      setRecentRooms(JSON.parse(savedRooms));
    }
  }, []);

  const addToRecentRooms = (id: string) => {
    const updated = [id, ...recentRooms.filter(r => r !== id)].slice(0, 5);
    setRecentRooms(updated);
    localStorage.setItem('recentRooms', JSON.stringify(updated));
  };

  const generateRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const createRoom = () => {
    const newRoomId = generateRoomCode();
    setRoomId(newRoomId);
    addToRecentRooms(newRoomId);
    setJoined(true);
  };

  const joinRoom = (id?: string) => {
    const roomToJoin = id || roomId;
    if (roomToJoin.trim()) {
      setRoomId(roomToJoin);
      addToRecentRooms(roomToJoin);
      setJoined(true);
    }
  };

  const handleLogout = async () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    await fetch(`${apiUrl}/auth/logout`, { method: 'POST', credentials: 'include' });
    window.location.href = '/';
  };

  if (loading) return <div className="app-container">Loading...</div>;

  if (!user) {
    return <Login />;
  }

  return (
    <div className="app-container">
      {!joined ? (
        <div className="join-container">
          <div className="user-profile">
            <img src={user.avatar} alt={user.name} className="avatar" />
            <h2>Welcome, {user.name}!</h2>

            <div style={{ marginTop: '15px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'var(--surface-color)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '0.9rem'
                }}
              >
                <option value="cyberpunk">Cyberpunk</option>
                <option value="midnight">Midnight</option>
                <option value="light">Light</option>
              </select>
              <button onClick={handleLogout} className="logout-btn" style={{ marginTop: 0 }}>Logout</button>
            </div>
          </div>

          <h1>Collaborative Code Editor</h1>

          <div className="room-actions">
            {!showJoinInput ? (
              <>
                <div className="action-buttons">
                  <button onClick={createRoom} className="primary-btn">
                    Create New Room
                  </button>
                  <button onClick={() => setShowJoinInput(true)} className="secondary-btn">
                    Join Existing Room
                  </button>
                </div>

                {recentRooms.length > 0 && (
                  <div className="recent-rooms">
                    <h3>Recent Rooms</h3>
                    <div className="recent-list">
                      {recentRooms.map(room => (
                        <button key={room} onClick={() => joinRoom(room)} className="recent-room-btn">
                          {room}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="join-input-group">
                <input
                  type="text"
                  placeholder="Enter Room Code"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  maxLength={6}
                />
                <div className="button-group">
                  <button onClick={() => joinRoom()} disabled={!roomId.trim()}>Join</button>
                  <button onClick={() => setShowJoinInput(false)} className="cancel-btn">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <header className="app-header">
            <div className="header-left">
              <h3>Room: {roomId}</h3>
              <button
                className="copy-btn"
                onClick={() => navigator.clipboard.writeText(roomId)}
                title="Copy Room Code"
              >
                📋
              </button>
            </div>
            <div className="header-right">
              <div className="user-info">
                <img src={user.avatar} alt={user.name} className="small-avatar" />
                <span>{user.name}</span>
              </div>
              <button onClick={() => setJoined(false)} className="leave-btn">Leave Room</button>
            </div>
          </header>
          <CodeEditor roomId={roomId} user={user} />
        </>
      )}
    </div>
  );
}

export default App;
