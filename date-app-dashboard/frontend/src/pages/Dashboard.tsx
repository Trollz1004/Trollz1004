import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Dashboard.css';

interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  bio: string;
  age: number;
  location: string;
  photos: string[];
  interests: string[];
  distance: number;
}

interface Match {
  id: string;
  profile: Profile;
  matchedAt: string;
}

export const Dashboard: React.FC = () => {
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'discover' | 'matches' | 'profile'>('discover');
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/profiles/discover', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCurrentProfile(response.data.profile);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load profiles');
      } finally {
        setLoading(false);
      }
    };

    loadProfiles();
  }, [token]);

  const handleLike = async () => {
    if (!currentProfile) return;

    try {
      const response = await axios.post(
        `/api/matches/like/${currentProfile.id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.match) {
        // New match!
        alert(`It's a match with ${currentProfile.firstName}!`);
      }

      // Load next profile
      loadNextProfile();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to like profile');
    }
  };

  const handlePass = async () => {
    if (!currentProfile) return;

    try {
      await axios.post(
        `/api/matches/pass/${currentProfile.id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      loadNextProfile();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to pass profile');
    }
  };

  const loadNextProfile = async () => {
    try {
      const response = await axios.get('/api/profiles/discover', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCurrentProfile(response.data.profile);
    } catch (err: any) {
      setError(err.response?.data?.message || 'No more profiles to show');
    }
  };

  useEffect(() => {
    if (activeTab === 'matches') {
      loadMatches();
    }
  }, [activeTab]);

  const loadMatches = async () => {
    try {
      const response = await axios.get('/api/matches', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMatches(response.data.matches);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load matches');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading">Loading profiles...</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <h1>Anti-AI Dating</h1>
        </div>
        <div className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === 'discover' ? 'active' : ''}`}
            onClick={() => setActiveTab('discover')}
          >
            Discover
          </button>
          <button
            className={`nav-tab ${activeTab === 'matches' ? 'active' : ''}`}
            onClick={() => setActiveTab('matches')}
          >
            Matches {matches.length > 0 && <span className="badge">{matches.length}</span>}
          </button>
          <button
            className={`nav-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
        </div>
        <button className="btn-logout" onClick={handleLogout}>
          Logout
        </button>
      </nav>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      {/* DISCOVER TAB */}
      {activeTab === 'discover' && currentProfile && (
        <div className="discover-container">
          <div className="profile-card">
            <div className="profile-images">
              {currentProfile.photos.map((photo, index) => (
                <img
                  key={index}
                  src={photo}
                  alt={`${currentProfile.firstName} ${index}`}
                  className="profile-image"
                />
              ))}
            </div>

            <div className="profile-info">
              <h2>
                {currentProfile.firstName}, {currentProfile.age}
              </h2>
              <p className="location">
                📍 {currentProfile.location} ({currentProfile.distance} miles away)
              </p>

              <div className="bio">
                <h3>About</h3>
                <p>{currentProfile.bio}</p>
              </div>

              <div className="interests">
                <h3>Interests</h3>
                <div className="interest-tags">
                  {currentProfile.interests.map(interest => (
                    <span key={interest} className="interest-tag">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="action-buttons">
              <button className="btn-pass" onClick={handlePass}>
                Pass 👋
              </button>
              <button className="btn-like" onClick={handleLike}>
                Like 💕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MATCHES TAB */}
      {activeTab === 'matches' && (
        <div className="matches-container">
          <h2>Your Matches</h2>
          {matches.length === 0 ? (
            <div className="empty-state">
              <p>No matches yet. Keep discovering! 👀</p>
            </div>
          ) : (
            <div className="matches-grid">
              {matches.map(match => (
                <div key={match.id} className="match-card">
                  <img src={match.profile.photos[0]} alt={match.profile.firstName} />
                  <div className="match-info">
                    <h3>{match.profile.firstName}</h3>
                    <p>{match.profile.location}</p>
                    <button
                      className="btn-message"
                      onClick={() => navigate(`/messages/${match.id}`)}
                    >
                      Message 💬
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PROFILE TAB */}
      {activeTab === 'profile' && (
        <div className="my-profile-container">
          <h2>Your Profile</h2>
          <div className="my-profile-card">
            <div className="profile-header">
              <h3>
                {user?.email}
              </h3>
              <button
                className="btn-edit"
                onClick={() => navigate('/edit-profile')}
              >
                Edit Profile
              </button>
            </div>

            <div className="profile-section">
              <h4>Account Status</h4>
              <ul>
                <li>Email: {user?.email}</li>
                <li>Age Verified: ✓</li>
                <li>Phone Verified: ✓</li>
                <li>TOS Accepted: ✓</li>
              </ul>
            </div>

            <div className="profile-section">
              <h4>Subscription</h4>
              <button className="btn-upgrade">
                Upgrade to Premium
              </button>
            </div>

            <div className="profile-section">
              <h4>Settings</h4>
              <button className="btn-secondary">
                Privacy Settings
              </button>
              <button className="btn-secondary">
                Notification Settings
              </button>
              <button className="btn-secondary">
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
