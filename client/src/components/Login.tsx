import React from 'react';

export const Login: React.FC = () => {
    const handleLogin = (provider: string) => {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        window.location.href = `${apiUrl}/auth/${provider}`;
    };

    return (
        <div className="join-container">
            <div style={{ textAlign: 'center' }}>
                <h1>Collaborative Editor</h1>
                <p style={{ color: '#888', marginTop: '10px' }}>Sign in to start coding together</p>
            </div>

            <div className="room-actions" style={{ gap: '1rem' }}>
                <button onClick={() => handleLogin('google')} className="primary-btn google-btn">
                    Login with Google
                </button>
                <button onClick={() => handleLogin('github')} className="primary-btn github-btn">
                    Login with GitHub
                </button>
            </div>
        </div>
    );
};
