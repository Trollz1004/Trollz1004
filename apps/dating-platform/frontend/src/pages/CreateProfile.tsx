import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Auth.css';

interface ProfileData {
  firstName: string;
  lastName: string;
  bio: string;
  gender: string;
  interestedIn: string;
  location: string;
  photos: File[];
  interests: string[];
}

export const CreateProfile: React.FC = () => {
  const [profile, setProfile] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    bio: '',
    gender: '',
    interestedIn: '',
    location: '',
    photos: [],
    interests: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string[]>([]);
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const INTERESTS = [
    'Hiking',
    'Gaming',
    'Reading',
    'Cooking',
    'Travel',
    'Art',
    'Music',
    'Fitness',
    'Movies',
    'Sports',
    'Photography',
    'Volunteering',
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + profile.photos.length > 6) {
      setError('Maximum 6 photos allowed');
      return;
    }

    const previews: string[] = [];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        previews.push(reader.result as string);
        if (previews.length === files.length) {
          setPhotoPreview(prev => [...prev, ...previews]);
        }
      };
      reader.readAsDataURL(file);
    });

    setProfile(prev => ({
      ...prev,
      photos: [...prev.photos, ...files],
    }));
  };

  const handleInterestToggle = (interest: string) => {
    setProfile(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate
      if (!profile.firstName || !profile.lastName || !profile.bio || !profile.gender || 
          !profile.interestedIn || !profile.location || profile.photos.length === 0) {
        setError('Please fill in all fields and upload at least one photo');
        setLoading(false);
        return;
      }

      if (profile.bio.length < 10) {
        setError('Bio must be at least 10 characters');
        setLoading(false);
        return;
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('firstName', profile.firstName);
      formData.append('lastName', profile.lastName);
      formData.append('bio', profile.bio);
      formData.append('gender', profile.gender);
      formData.append('interestedIn', profile.interestedIn);
      formData.append('location', profile.location);
      formData.append('interests', JSON.stringify(profile.interests));

      profile.photos.forEach((photo, index) => {
        formData.append(`photo_${index}`, photo);
      });

      // POST to backend
      const response = await axios.post('/api/profiles', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 201) {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card wide">
        <h1>Create Your Profile</h1>

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Basic Info */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name *</label>
              <input
                id="firstName"
                type="text"
                name="firstName"
                value={profile.firstName}
                onChange={handleInputChange}
                placeholder="Your first name"
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Last Name *</label>
              <input
                id="lastName"
                type="text"
                name="lastName"
                value={profile.lastName}
                onChange={handleInputChange}
                placeholder="Your last name"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Gender & Interests */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="gender">Gender *</label>
              <select
                id="gender"
                name="gender"
                value={profile.gender}
                onChange={handleInputChange}
                disabled={loading}
                required
              >
                <option value="">Select...</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non-binary">Non-binary</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="interestedIn">Interested In *</label>
              <select
                id="interestedIn"
                name="interestedIn"
                value={profile.interestedIn}
                onChange={handleInputChange}
                disabled={loading}
                required
              >
                <option value="">Select...</option>
                <option value="male">Men</option>
                <option value="female">Women</option>
                <option value="non-binary">Non-binary</option>
                <option value="everyone">Everyone</option>
              </select>
            </div>
          </div>

          {/* Location */}
          <div className="form-group">
            <label htmlFor="location">Location (City, State) *</label>
            <input
              id="location"
              type="text"
              name="location"
              value={profile.location}
              onChange={handleInputChange}
              placeholder="e.g., San Francisco, CA"
              disabled={loading}
              required
            />
          </div>

          {/* Bio */}
          <div className="form-group">
            <label htmlFor="bio">Bio (10-500 characters) *</label>
            <textarea
              id="bio"
              name="bio"
              value={profile.bio}
              onChange={handleInputChange}
              placeholder="Tell us about yourself..."
              disabled={loading}
              rows={4}
              required
            />
            <small>{profile.bio.length}/500</small>
          </div>

          {/* Interests */}
          <div className="form-group">
            <label>Select Your Interests</label>
            <div className="interests-grid">
              {INTERESTS.map(interest => (
                <button
                  key={interest}
                  type="button"
                  className={`interest-btn ${profile.interests.includes(interest) ? 'active' : ''}`}
                  onClick={() => handleInterestToggle(interest)}
                  disabled={loading}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          {/* Photos */}
          <div className="form-group">
            <label htmlFor="photos">Upload Photos (1-6, Max 5MB each) *</label>
            <input
              id="photos"
              type="file"
              multiple
              accept="image/*"
              onChange={handlePhotoUpload}
              disabled={loading}
              required
            />
            <div className="photo-preview">
              {photoPreview.map((preview, index) => (
                <img key={index} src={preview} alt={`Preview ${index}`} />
              ))}
            </div>
            <small>{profile.photos.length}/6 photos</small>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading} 
            className="btn-primary"
          >
            {loading ? 'Creating Profile...' : 'Create Profile & Start Exploring'}
          </button>
        </form>
      </div>
    </div>
  );
};
