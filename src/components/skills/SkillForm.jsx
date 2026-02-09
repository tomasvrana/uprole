import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import TagInput from '../common/TagInput/TagInput';
import styles from './SkillForm.module.css';

// Constants
import {
    CATEGORIES,
    SUBCATEGORIES,
    STYLES_SUGGESTIONS,
    SOURCES,
    PRACTISING_FREQUENCIES,
    SKILL_LEVELS,
    MONTHS,
    YEARS,
    currentYear
} from '../../constants/skills';

// Validation Schema
const skillSchema = z.object({
    category: z.string().min(1, 'Category is required'),
    subcategory: z.string().min(1, 'Subcategory is required'),
    skillLevel: z.string().min(1, 'Skill level is required'),
    startMonth: z.string().or(z.number()).transform(v => Number(v)),
    startYear: z.string().or(z.number()).transform(v => Number(v)),
    styles: z.array(z.string()),
    source: z.string().min(1, 'Source is required'),
    influences: z.array(z.string()),
    equipment: z.array(z.string()),
    practising: z.string().min(1, 'Practising frequency is required'),
    youtubeLinks: z.array(z.string()).optional(),
    extras: z.object({
        canReadNotes: z.boolean().optional(),
        openForNudes: z.boolean().optional(),
        openForDisgrace: z.boolean().optional(),
    }).optional(),
});

const SkillForm = ({ onSubmit, defaultValues }) => {
    const { t } = useTranslation();

    // Default form values
    const initialValues = defaultValues || {
        category: '',
        subcategory: '',
        skillLevel: '',
        startMonth: new Date().getMonth() + 1,
        startYear: currentYear,
        styles: [],
        source: '',
        influences: [],
        equipment: [],
        practising: '',
        extras: {
            canReadNotes: false,
            openForNudes: false,
            openForDisgrace: false,
        },
        youtubeLinks: [],
    };

    const {
        register,
        control,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(skillSchema),
        defaultValues: initialValues,
    });

    const selectedCategory = watch('category');
    const startMonth = watch('startMonth');
    const startYear = watch('startYear');

    // Reset subcategory when category changes
    useEffect(() => {
        if (selectedCategory && !SUBCATEGORIES[selectedCategory]?.includes(watch('subcategory'))) {
            setValue('subcategory', '');
        }
    }, [selectedCategory, setValue, watch]);

    const calculateTimePassed = (month, year) => {
        if (!month || !year) return '';
        const now = new Date();
        const start = new Date(year, month - 1);
        const diff = now - start;

        const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365));
        const months = Math.floor((diff % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));

        if (years > 0) return `${years} years${months > 0 ? ` and ${months} months` : ''}`;
        if (months > 0) return `${months} months`;
        return 'Less than a month';
    };

    const timePassed = calculateTimePassed(startMonth, startYear);

    return (
        <div className={styles.formContainer}>
            <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>{defaultValues ? t('skillForm.editTitle') : t('skillForm.title')}</h2>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className={styles.formForm}>

                {/* Field (Category) */}
                <div className={styles.formSection}>
                    <h3 className={styles.sectionTitle}>{t('skillForm.field')}</h3>
                    <div className={styles.formGroup}>
                        <label>{t('skillForm.field')}</label>
                        <select {...register('category')}>
                            <option value="">{t('skillForm.selectField') || 'Select Field'}</option>
                            {Object.values(CATEGORIES).map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        {errors.category && <span className={styles.errorMessage}>{errors.category.message}</span>}
                    </div>

                    {/* Subcategory */}
                    {selectedCategory && (
                        <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
                            <label>{t('skillForm.specialization')}</label>
                            <select {...register('subcategory')}>
                                <option value="">{t('skillForm.selectOption') || 'Select Option'}</option>
                                {SUBCATEGORIES[selectedCategory]?.map(sub => (
                                    <option key={sub} value={sub}>{sub}</option>
                                ))}
                            </select>
                            {errors.subcategory && <span className={styles.errorMessage}>{errors.subcategory.message}</span>}
                        </div>
                    )}
                </div>

                {/* Experience */}
                <div className={styles.formSection}>
                    <h3 className={styles.sectionTitle}>{t('skillForm.experience')}</h3>
                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label>{t('skillForm.startedMonth')}</label>
                            <select {...register('startMonth')}>
                                {MONTHS.map(m => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label>{t('skillForm.startedYear')}</label>
                            <select {...register('startYear')}>
                                {YEARS.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {timePassed && <div className={styles.timePassed}>{t('skillForm.experience')}: {timePassed}</div>}
                    {errors.startYear && <span className={styles.errorMessage}>{t('skillForm.invalidDate') || 'Invalid date'}</span>}

                    <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
                        <label>{t('skillForm.skillLevel') || 'Skill Level'}</label>
                        <select {...register('skillLevel')}>
                            <option value="">{t('skillForm.selectLevel') || 'Select Level'}</option>
                            {SKILL_LEVELS.map(level => (
                                <option key={level} value={level}>{level}</option>
                            ))}
                        </select>
                        {errors.skillLevel && <span className={styles.errorMessage}>{errors.skillLevel.message}</span>}
                    </div>
                </div>

                {/* Style */}
                <div className={styles.formSection}>
                    <h3 className={styles.sectionTitle}>{t('skillForm.style')}</h3>
                    <div className={styles.formGroup}>
                        <label>{t('skillForm.styles')}</label>
                        <Controller
                            control={control}
                            name="styles"
                            render={({ field }) => (
                                <TagInput
                                    value={field.value}
                                    onChange={field.onChange}
                                    suggestions={selectedCategory ? STYLES_SUGGESTIONS[selectedCategory] : []}
                                    placeholder={t('skillForm.addStyles') || "Add styles..."}
                                    error={errors.styles?.message}
                                />
                            )}
                        />
                    </div>
                </div>

                {/* Details */}
                <div className={styles.formSection}>
                    <h3 className={styles.sectionTitle}>{t('skillForm.details') || 'Details'}</h3>
                    <div className={styles.formGroup}>
                        <label>{t('skillForm.source')}</label>
                        <select {...register('source')}>
                            <option value="">{t('skillForm.selectSource') || 'Select Source'}</option>
                            {SOURCES.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                        {errors.source && <span className={styles.errorMessage}>{errors.source.message}</span>}
                    </div>

                    <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
                        <label>{t('skillForm.influences')}</label>
                        <Controller
                            control={control}
                            name="influences"
                            render={({ field }) => (
                                <TagInput
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder={t('skillForm.addInfluences') || "Add idols..."}
                                />
                            )}
                        />
                    </div>

                    <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
                        <label>{t('skillForm.equipment')}</label>
                        <Controller
                            control={control}
                            name="equipment"
                            render={({ field }) => (
                                <TagInput
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder={t('skillForm.addEquipment') || "Add gear..."}
                                />
                            )}
                        />
                    </div>

                    <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
                        <label>{t('skillForm.practising')}</label>
                        <select {...register('practising')}>
                            <option value="">{t('skillForm.selectFrequency') || 'Select Frequency'}</option>
                            {PRACTISING_FREQUENCIES.map(f => (
                                <option key={f} value={f}>{f}</option>
                            ))}
                        </select>
                        {errors.practising && <span className={styles.errorMessage}>{errors.practising.message}</span>}
                    </div>
                </div>

                {/* Extras */}
                {selectedCategory && (selectedCategory === CATEGORIES.MUSIC || selectedCategory === CATEGORIES.STAGE) && (
                    <div className={styles.formSection}>
                        <h3 className={styles.sectionTitle}>{t('skillForm.extras')}</h3>
                        <div className={styles.formGroup}>
                            {selectedCategory === CATEGORIES.MUSIC && (
                                <div className={styles.checkboxGroup}>
                                    <input type="checkbox" id="canReadNotes" {...register('extras.canReadNotes')} />
                                    <label htmlFor="canReadNotes">{t('skillForm.canReadNotes')}</label>
                                </div>
                            )}
                            {selectedCategory === CATEGORIES.STAGE && (
                                <>
                                    <div className={styles.checkboxGroup}>
                                        <input type="checkbox" id="openForNudes" {...register('extras.openForNudes')} />
                                        <label htmlFor="openForNudes">{t('skillForm.openForNudes')}</label>
                                    </div>
                                    <div className={styles.checkboxGroup} style={{ marginTop: '0.5rem' }}>
                                        <input type="checkbox" id="openForDisgrace" {...register('extras.openForDisgrace')} />
                                        <label htmlFor="openForDisgrace">{t('skillForm.openForDisgrace')}</label>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* YouTube Links */}
                <div className={styles.formSection}>
                    <h3 className={styles.sectionTitle}>{t('skillForm.youtubeLinks') || 'YouTube Videos'}</h3>
                    <Controller
                        control={control}
                        name="youtubeLinks"
                        render={({ field }) => (
                            <div className={styles.youtubeLinksContainer}>
                                {(field.value || []).map((link, index) => (
                                    <div key={index} className={styles.youtubeLinkRow}>
                                        <input
                                            type="url"
                                            value={link}
                                            onChange={(e) => {
                                                const newLinks = [...(field.value || [])];
                                                newLinks[index] = e.target.value;
                                                field.onChange(newLinks);
                                            }}
                                            placeholder="https://www.youtube.com/watch?v=..."
                                            className={styles.youtubeLinkInput}
                                        />
                                        <button
                                            type="button"
                                            className={styles.removeYoutubeBtn}
                                            onClick={() => {
                                                const newLinks = (field.value || []).filter((_, i) => i !== index);
                                                field.onChange(newLinks);
                                            }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    className={styles.addYoutubeBtn}
                                    onClick={() => field.onChange([...(field.value || []), ''])}
                                >
                                    + {t('skillForm.addYoutubeLink') || 'Add YouTube Link'}
                                </button>
                            </div>
                        )}
                    />
                </div>

                <button type="submit" className={styles.submitBtn}>
                    {t('skillForm.save')}
                </button>
            </form>
        </div>
    );
};

export default SkillForm;
