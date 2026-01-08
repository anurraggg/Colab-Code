import React from 'react';

interface LoginProps {
    loading?: boolean;
}

export const Login: React.FC<LoginProps> = ({ loading }) => {
    const handleLogin = (provider: string) => {
        if (loading) return;
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        window.location.href = `${apiUrl}/auth/${provider}`;
    };

    return (
        <div className="join-container">
            <div style={{ textAlign: 'center' }}>
                <h1>Collaborative Editor</h1>
                <p style={{ color: '#888', marginTop: '10px' }}>
                    {loading ? 'Checking session...' : 'Sign in to start coding together'}
                </p>
            </div>

            <div className="room-actions" style={{ gap: '1rem' }}>
                <button
                    onClick={() => handleLogin('google')}
                    className="primary-btn google-btn"
                    disabled={loading}
                    style={{ opacity: loading ? 0.7 : 1, cursor: loading ? 'wait' : 'pointer' }}
                >
                    {loading ? 'Please wait...' : 'Login with Google'}
                </button>
                <button
                    onClick={() => handleLogin('github')}
                    className="primary-btn github-btn"
                    disabled={loading}
                    style={{ opacity: loading ? 0.7 : 1, cursor: loading ? 'wait' : 'pointer' }}
                >
                    {loading ? 'Please wait...' : 'Login with GitHub'}
                </button>
            </div>
        </div>
    );
};
