import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SkillForm from '../../components/skills/SkillForm';
import { addSkill } from '../../services/skills';
import useAuthStore from '../../stores/authStore';
import styles from './AddSkill.module.css';

const AddSkill = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [error, setError] = useState(null);

    const handleSubmit = async (data) => {
        console.log('AddSkill: Submitting with user:', user);
        console.log('AddSkill: Form data:', data);

        if (!user) {
            console.error('AddSkill: No user found!');
            setError('User not authenticated');
            return;
        }

        try {
            const result = await addSkill(user.uid, data);
            console.log('AddSkill: Result:', result);
            navigate(`/profile/${user.uid}`); // Redirect to profile to see the new skill
        } catch (err) {
            console.error('Error adding skill:', err);
            setError(err.message || t('common.error') || 'Failed to add skill');
        }
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.header}>
                <button
                    onClick={() => navigate(-1)}
                    className={styles.backButton}
                >
                    &larr; {t('common.back')}
                </button>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <SkillForm onSubmit={handleSubmit} />
        </div>
    );
};

export default AddSkill;
