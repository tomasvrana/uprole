import { useState, KeyboardEvent } from 'react';
import styles from './TagInput.module.css';

const TagInput = ({
    value = [],
    onChange,
    suggestions = [],
    placeholder = 'Type and press Enter...',
    error,
    maxTags = 20,
}) => {
    const [inputValue, setInputValue] = useState('');

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(inputValue);
        } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
            removeTag(value.length - 1);
        }
    };

    const addTag = (tag) => {
        const trimmedTag = tag.trim();
        if (
            trimmedTag &&
            !value.includes(trimmedTag) &&
            value.length < maxTags
        ) {
            onChange([...value, trimmedTag]);
            setInputValue('');
        }
    };

    const removeTag = (indexToRemove) => {
        onChange(value.filter((_, index) => index !== indexToRemove));
    };

    return (
        <div className={styles.tagInputContainer}>
            <div className={styles.tagsWrapper}>
                {value.map((tag, index) => (
                    <span key={index} className={styles.tag}>
                        {tag}
                        <button
                            type="button"
                            onClick={() => removeTag(index)}
                            className={styles.removeTag}
                            aria-label={`Remove ${tag}`}
                        >
                            &times;
                        </button>
                    </span>
                ))}
                <input
                    type="text"
                    className={styles.input}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={value.length === 0 ? placeholder : ''}
                />
            </div>

            {suggestions.length > 0 && (
                <div className={styles.suggestions}>
                    {suggestions
                        .filter((s) => !value.includes(s))
                        .map((suggestion) => (
                            <button
                                key={suggestion}
                                type="button"
                                className={styles.suggestionPill}
                                onClick={() => addTag(suggestion)}
                            >
                                + {suggestion}
                            </button>
                        ))}
                </div>
            )}

            {error && <span className={styles.error}>{error}</span>}
        </div>
    );
};

export default TagInput;
