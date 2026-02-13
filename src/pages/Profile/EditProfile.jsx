import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../stores/authStore';
import { updateUserProfile, isUsernameAvailable } from '../../services/users';
import { getUserSkills, deleteSkill } from '../../services/skills';
import { uploadFile } from '../../services/storage';
import MediaUpload from '../../components/common/MediaUpload/MediaUpload';
import styles from './EditProfile.module.css';

// Debounce helper
const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

const EditProfile = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, profile, updateProfile } = useAuthStore();

    const [formData, setFormData] = useState({
        displayName: '',
        username: '',
        bio: '',
        location: {
            city: '',
            country: ''
        },
        languages: [],
        availability: 'available'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [selectedAvatar, setSelectedAvatar] = useState([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [usernameStatus, setUsernameStatus] = useState({
        status: 'idle', // 'idle', 'checking', 'available', 'taken', 'invalid'
        message: ''
    });

    const [skills, setSkills] = useState([]);

    useEffect(() => {
        if (profile) {
            setFormData({
                displayName: profile.displayName || '',
                username: profile.username || '',
                bio: profile.bio || '',
                location: {
                    city: profile.location?.city || '',
                    country: profile.location?.country || ''
                },
                languages: profile.languages || [],
                availability: profile.availability || 'available'
            });

            // Fetch skills
            getUserSkills(user.uid)
                .then(setSkills)
                .catch(err => console.error('Error fetching skills:', err));
        }
    }, [profile, user.uid]);

    const checkUsername = useCallback(
        debounce(async (username) => {
            if (!username) {
                setUsernameStatus({ status: 'idle', message: '' });
                return;
            }

            // Basic regex for username: alphanumeric and underscore, 3-20 chars
            const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
            if (!usernameRegex.test(username)) {
                setUsernameStatus({
                    status: 'invalid',
                    message: t('profile.usernameInvalid')
                });
                return;
            }

            // If it's the same as the current username, it's available
            if (username.toLowerCase() === profile?.username?.toLowerCase()) {
                setUsernameStatus({ status: 'available', message: t('profile.usernameAvailable') });
                return;
            }

            setUsernameStatus({ status: 'checking', message: '' });
            try {
                const available = await isUsernameAvailable(username);
                if (available) {
                    setUsernameStatus({ status: 'available', message: t('profile.usernameAvailable') });
                } else {
                    setUsernameStatus({ status: 'taken', message: t('profile.usernameTaken') });
                }
            } catch (err) {
                console.error('Error checking username:', err);
            }
        }, 500),
        [profile, t]
    );

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'username') {
            const sanitizedValue = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
            setFormData(prev => ({ ...prev, username: sanitizedValue }));
            checkUsername(sanitizedValue);
        } else if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: {
                    ...prev[parent],
                    [child]: value
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleLanguageChange = (e) => {
        const value = e.target.value;
        const langs = value.split(',').map(s => s.trim()).filter(s => s !== '');
        setFormData(prev => ({
            ...prev,
            languages: langs
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) return;

        if (formData.username && usernameStatus.status !== 'available' && formData.username !== profile?.username) {
            setError(t('profile.usernameTaken'));
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            let finalPhotoURL = profile?.photoURL || '';

            // 1. Upload new avatar if selected
            if (selectedAvatar.length > 0) {
                finalPhotoURL = await uploadFile(selectedAvatar[0], `avatars/${user.uid}`, (progress) => {
                    setUploadProgress(progress);
                });
            }

            // 2. Geocode location if city/country changed or missing coords
            let locationUpdates = {
                city: formData.location.city || '',
                country: formData.location.country || '',
            };

            // Preserve existing coords from profile as a baseline
            if (profile?.location?.lat != null && !isNaN(profile.location.lat)) {
                locationUpdates.lat = profile.location.lat;
            }
            if (profile?.location?.lng != null && !isNaN(profile.location.lng)) {
                locationUpdates.lng = profile.location.lng;
            }

            // Only geocode if we have a city and it's different from profile
            const locationChanged =
                formData.location.city !== profile?.location?.city ||
                formData.location.country !== profile?.location?.country;

            if (locationChanged && formData.location.city) {
                try {
                    const query = `${formData.location.city}, ${formData.location.country}`;
                    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
                    if (response.ok) {
                        const data = await response.json();
                        if (data && data.length > 0) {
                            locationUpdates.lat = parseFloat(data[0].lat);
                            locationUpdates.lng = parseFloat(data[0].lon);
                        }
                    }
                } catch (geoError) {
                    console.error('Geocoding error:', geoError);
                    // Continue saving with existing coords
                }
            } else if (locationChanged && !formData.location.city) {
                // City was cleared — remove coords
                delete locationUpdates.lat;
                delete locationUpdates.lng;
            }

            // Strip any undefined or NaN values to prevent Firestore errors
            Object.keys(locationUpdates).forEach(key => {
                const v = locationUpdates[key];
                if (v === undefined || (typeof v === 'number' && isNaN(v))) {
                    delete locationUpdates[key];
                }
            });

            const updates = {
                ...formData,
                location: locationUpdates,
                photoURL: finalPhotoURL,
                updatedAt: new Date()
            };

            await updateUserProfile(user.uid, updates);
            updateProfile(updates);
            navigate(`/@${formData.username}`);
        } catch (err) {
            console.error('Error updating profile:', err);
            setError(err.message || t('common.error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    if (!profile) return <div className={styles.loading}>{t('common.loading')}</div>;

    return (
        <div className={styles.editProfilePage}>
            <div className={styles.editProfileHeader}>
                <h1 className={styles.editProfileTitle}>{t('profile.editProfile')}</h1>
                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => navigate('/profile')}
                >
                    {t('common.back')}
                </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.formContainer}>
                {error && <div className="alert alert-error">{error}</div>}

                <div className={styles.avatarSection}>
                    <div className={styles.avatarLabel}>{t('profile.profilePicture') || 'Profile Picture'}</div>
                    <MediaUpload
                        onFilesSelected={setSelectedAvatar}
                        currentFiles={selectedAvatar.length > 0 ? selectedAvatar : (profile.photoURL ? [profile.photoURL] : [])}
                        maxFiles={1}
                        multiple={false}
                        allowedTypes={['image/jpeg', 'image/png', 'image/webp']}
                    />
                    {isSubmitting && uploadProgress > 0 && uploadProgress < 100 && (
                        <div className={styles.uploadProgress}>
                            {Math.round(uploadProgress)}%
                        </div>
                    )}
                </div>

                <div className={styles.formGrid}>
                    <div className={styles.formGroup + ' ' + styles.formGroupFull}>
                        <label className={styles.label}>{t('auth.register.name')}</label>
                        <input
                            type="text"
                            name="displayName"
                            value={formData.displayName}
                            onChange={handleChange}
                            className={styles.input}
                            placeholder="Your full name"
                            required
                        />
                    </div>

                    <div className={styles.formGroup + ' ' + styles.formGroupFull}>
                        <label className={styles.label}>{t('profile.username')}</label>
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            className={`${styles.input} ${styles[usernameStatus.status]}`}
                            placeholder="username"
                            required
                        />
                        {usernameStatus.message && (
                            <span className={`${styles.statusMessage} ${styles[usernameStatus.status]}`}>
                                {usernameStatus.message}
                            </span>
                        )}
                        <span className={styles.infoText}>{t('profile.usernameHint')}</span>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>{t('profile.location')} - City</label>
                        <input
                            type="text"
                            name="location.city"
                            value={formData.location.city}
                            onChange={handleChange}
                            className={styles.input}
                            placeholder="City"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>{t('profile.location')} - Country</label>
                        <input
                            type="text"
                            name="location.country"
                            value={formData.location.country}
                            onChange={handleChange}
                            className={styles.input}
                            placeholder="Country"
                        />
                    </div>

                    <div className={styles.formGroup + ' ' + styles.formGroupFull}>
                        <label className={styles.label}>{t('profile.languages')}</label>
                        <input
                            type="text"
                            value={formData.languages.join(', ')}
                            onChange={handleLanguageChange}
                            className={styles.input}
                            placeholder="English, Czech, Spanish (separate with commas)"
                        />
                        <span className={styles.infoText}>Separate languages with commas</span>
                    </div>

                    <div className={styles.formGroup + ' ' + styles.formGroupFull}>
                        <label className={styles.label}>{t('profile.availability')}</label>
                        <select
                            name="availability"
                            value={formData.availability}
                            onChange={handleChange}
                            className={styles.input}
                        >
                            <option value="available">{t('profile.availabilityOptions.available') || 'Available'}</option>
                            <option value="maybe">{t('profile.availabilityOptions.maybe') || 'Maybe'}</option>
                            <option value="busy">{t('profile.availabilityOptions.busy') || 'Busy'}</option>
                        </select>
                    </div>

                    <div className={styles.formGroup + ' ' + styles.formGroupFull}>
                        <label className={styles.label}>{t('profile.about')}</label>
                        <textarea
                            name="bio"
                            value={formData.bio}
                            onChange={handleChange}
                            className={styles.textarea}
                            placeholder="Tell us about yourself and your performing experience..."
                        />
                    </div>
                </div>

                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>{t('profile.skills') || 'Skills'}</h2>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => navigate('/profile/add-skill')}
                    >
                        {t('profile.addSkill') || 'Add Skill'}
                    </button>
                </div>

                <div className={styles.skillsList}>
                    {skills.length > 0 ? (
                        skills.map(skill => (
                            <div key={skill.id} className={styles.skillItem}>
                                <div className={styles.skillInfo}>
                                    <span className={styles.skillCategory}>{skill.category}</span>
                                    <span className={styles.skillName}>{skill.subcategory}</span>
                                    {skill.skillLevel && <span className={styles.skillLevel}>{skill.skillLevel}</span>}
                                </div>
                                <div className={styles.skillActions}>
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-small"
                                        onClick={() => navigate(`/profile/edit-skill/${skill.id}`)}
                                        title="Edit Skill"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-danger btn-small"
                                        onClick={async () => {
                                            if (window.confirm('Are you sure you want to delete this skill?')) {
                                                try {
                                                    await deleteSkill(user.uid, skill.id);
                                                    setSkills(prev => prev.filter(s => s.id !== skill.id));
                                                } catch (err) {
                                                    console.error('Error deleting skill:', err);
                                                    setError('Failed to delete skill');
                                                }
                                            }
                                        }}
                                        title="Delete Skill"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className={styles.noSkills}>{t('profile.noSkills') || 'No skills added yet.'}</p>
                    )}
                </div>

                <div className={styles.formActions}>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => navigate('/profile')}
                        disabled={isSubmitting}
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isSubmitting || (formData.username && usernameStatus.status !== 'available' && formData.username !== profile?.username)}
                    >
                        {isSubmitting ? t('common.loading') : t('common.save')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditProfile;
