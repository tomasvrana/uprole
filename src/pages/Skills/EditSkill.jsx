import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SkillForm from '../../components/skills/SkillForm';
import { getSkill, updateSkill } from '../../services/skills';
import useAuthStore from '../../stores/authStore';
import styles from './AddSkill.module.css';

const EditSkill = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { skillId } = useParams();
    const { user } = useAuthStore();
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [skillData, setSkillData] = useState(null);

    useEffect(() => {
        const fetchSkill = async () => {
            if (!user || !skillId) return;
            try {
                const skill = await getSkill(user.uid, skillId);
                if (skill) {
                    setSkillData(skill);
                } else {
                    setError('Skill not found');
                }
            } catch (err) {
                console.error('Error fetching skill:', err);
                setError('Failed to load skill');
            } finally {
                setLoading(false);
            }
        };
        fetchSkill();
    }, [user, skillId]);

    const handleSubmit = async (data) => {
        if (!user || !skillId) return;

        try {
            await updateSkill(user.uid, skillId, data);
            navigate(`/profile/${user.uid}`);
        } catch (err) {
            console.error('Error updating skill:', err);
            setError(err.message || t('common.error') || 'Failed to update skill');
        }
    };

    if (loading) {
        return (
            <div className={styles.pageContainer}>
                <div className={styles.loading}>{t('common.loading')}</div>
            </div>
        );
    }

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

            {skillData && <SkillForm onSubmit={handleSubmit} defaultValues={skillData} />}
        </div>
    );
};

export default EditSkill;
