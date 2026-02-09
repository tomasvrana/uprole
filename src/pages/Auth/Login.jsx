import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { loginWithEmail, loginWithGoogle } from '../../services/auth';
import styles from './Auth.module.css';

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

const Login = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data) => {
        setLoading(true);
        setError('');
        try {
            await loginWithEmail(data.email, data.password);
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            await loginWithGoogle();
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.authPage}>
            <div className={styles.authContainer}>
                <div className={styles.authCard}>
                    <div className={styles.authHeader}>
                        <h1 className={styles.authTitle}>{t('auth.login.title')}</h1>
                        <p className={styles.authSubtitle}>{t('auth.login.subtitle')}</p>
                    </div>

                    {error && <div className={styles.authError}>{error}</div>}

                    <form className={styles.authForm} onSubmit={handleSubmit(onSubmit)}>
                        <div className={styles.formGroup}>
                            <label htmlFor="email">{t('auth.login.email')}</label>
                            <input
                                type="email"
                                id="email"
                                placeholder="you@example.com"
                                {...register('email')}
                            />
                            {errors.email && (
                                <span className={styles.errorMessage}>{errors.email.message}</span>
                            )}
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="password">{t('auth.login.password')}</label>
                            <input
                                type="password"
                                id="password"
                                placeholder="••••••••"
                                {...register('password')}
                            />
                            {errors.password && (
                                <span className={styles.errorMessage}>{errors.password.message}</span>
                            )}
                        </div>

                        <div className={styles.forgotPassword}>
                            <Link to="/forgot-password">{t('auth.login.forgotPassword')}</Link>
                        </div>

                        <button
                            type="submit"
                            className={`btn btn-primary btn-lg ${styles.submitBtn}`}
                            disabled={loading}
                        >
                            {loading ? t('common.loading') : t('auth.login.submit')}
                        </button>
                    </form>

                    <div className={styles.divider}>
                        <span>{t('auth.or')}</span>
                    </div>

                    <button
                        type="button"
                        className={styles.googleBtn}
                        onClick={handleGoogleLogin}
                        disabled={loading}
                    >
                        <svg viewBox="0 0 24 24">
                            <path
                                fill="currentColor"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="currentColor"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        {t('auth.google')}
                    </button>

                    <div className={styles.authFooter}>
                        {t('auth.login.noAccount')}{' '}
                        <Link to="/register">{t('auth.login.signUp')}</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
