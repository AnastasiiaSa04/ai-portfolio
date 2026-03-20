import React, { useState, useEffect } from 'react';

export const Typewriter = ({ text = '', speed = 20 }: { text?: string; speed?: number }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    if (!text) return;

    let i = 0;
    setDisplayedText(''); 
    
    const timer = setInterval(() => {
      if (text && i < text.length) {
        setDisplayedText((prev) => prev + text.charAt(i));
        i++;
      } else {
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed]);

  return <span>{displayedText}</span>;
};