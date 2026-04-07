'use client';
import React, { useEffect, useState } from 'react';

interface LoaderWrapperProps {
    isLoading: boolean;
    text?: string;
}

export default function LoaderWrapper({ isLoading, text }: LoaderWrapperProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isLoading) {
            setIsVisible(true);
        } else {
            const timer = setTimeout(() => setIsVisible(false), 500);
            return () => clearTimeout(timer);
        }
    }, [isLoading]);

    if (!isVisible) return null;

    const loaderText = "Uzbekistan Airports";
    
    return (
        <div 
            className={`loader-overlay ${isLoading ? 'active' : ''}`}
            style={{ opacity: isLoading ? 1 : 0 }}
        >
            <div className="loader-wrapper">
                {loaderText.split('').map((char, index) => (
                    <span 
                        key={index} 
                        className="loader-letter" 
                        style={{ animationDelay: `${0.1 + (index * 0.1)}s` }}
                    >
                        {char === ' ' ? '\u00A0' : char}
                    </span>
                ))}
                <div className="loader-main"></div>
            </div>
            {text && <p className="loading-text">{text}</p>}
        </div>
    );
}
