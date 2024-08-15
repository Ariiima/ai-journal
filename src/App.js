import React, { useState, useEffect, useRef, useCallback } from 'react';
import OpenAI from "openai";
import { Moon, Sun, Type, RefreshCw, Save } from 'lucide-react';

const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

const useTypewriter = (text, speed = 50) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    setDisplayedText('');
    if (!text) return;
    setIsTyping(true);
    let i = -1;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayedText((prev) => prev + text.charAt(i));
        i++;
      } else {
        clearInterval(timer);
        setIsTyping(false);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed]);
  return { displayedText, isTyping };
};

const GhostTextarea = React.forwardRef(({ value, suggestion, onChange, onKeyDown, placeholder, className }, ref) => {
  const ghostRef = useRef(null);
  console.log(suggestion)
  const { displayedText, isTyping } = useTypewriter(suggestion, 30);
  
  useEffect(() => {
    if (ghostRef.current && ref.current) {
      ghostRef.current.scrollTop = ref.current.scrollTop;
    }
  }, [value, displayedText, ref]);

  // Function to get the correct suggestion display
  const getSuggestionDisplay = () => {
    if (!displayedText) return '';
    const lastChar = value.slice(-1);
    const needsSpace = lastChar !== ' ' && lastChar !== '' && value.length > 0;
    return (needsSpace ? ' ' : '') + displayedText;
  };

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={`${className} relative z-10 bg-transparent`}
      />
      <div
        ref={ghostRef}
        className={`${className} absolute top-0 left-0 text-gray-400 pointer-events-none`}
        style={{
          zIndex: 5,
          whiteSpace: 'pre-wrap',
          overflowWrap: 'break-word',
          wordWrap: 'break-word'
        }}
      >
        {value}
        <span className="text-gray-400">
          {getSuggestionDisplay()}
        </span>
      </div>
    </div>
  );
});
export default function AIJournal() {
  const [entry, setEntry] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef(null);

  const getSuggestion = useCallback(async (text) => {
    setIsLoading(true);
    try {
      console.log('Fetching suggestion for:', text);
      const prompt = `Continue the following journal entry. Provide only the next few words to complete the current thought or sentence. Do not repeat any part of the existing text:\n\nJournal entry: ${text}`;
      
      const chatCompletion = await openai.chat.completions.create({
        messages: [
          { role: "system", content: "You are an AI writing assistant helping to continue journal entries. Your task is to provide short, contextual continuations to the user's input, focusing on completing the current thought or sentence without repeating any part of the existing text." },
          { role: "user", content: prompt }
        ],
        model: "gpt-4o-mini",
        max_tokens: 4,
        temperature: 0.7,
      });

      console.log('OpenAI response:', chatCompletion);

      if (chatCompletion.choices && chatCompletion.choices.length > 0) {
        let newSuggestion = chatCompletion.choices[0].message.content;
        newSuggestion = newSuggestion.trim();
        console.log('New suggestion:', newSuggestion);
        setSuggestion(newSuggestion);
      } else {
        console.log('No suggestion received from OpenAI');
        setSuggestion('');
      }
    } catch (error) {
      console.error('Error fetching suggestion:', error);
      setError(error.message || 'An error occurred while fetching the suggestion.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (entry.length > 0) {
        getSuggestion(entry);
      } else {
        setSuggestion('');
      }
    }, 500);

    return () => clearTimeout(debounce);
  }, [entry, getSuggestion]);

  const handleKeyDown = (e) => {
    if (e.key === 'Tab' && suggestion) {
      e.preventDefault();
      setEntry(prevEntry => prevEntry + " "+suggestion);
      setSuggestion('');
      textareaRef.current.focus();
    }
  };

  const handleInputChange = (e) => {
    setEntry(e.target.value);
    // Clear suggestion when user types
    setSuggestion('');
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'} transition-colors duration-300`}>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold flex items-center">
            <Type className="mr-2" /> AI Journal
          </h1>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-full ${darkMode ? 'bg-yellow-400 text-gray-900' : 'bg-gray-800 text-white'} transition-colors duration-300 hover:scale-110`}
          >
            {darkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </div>
        <div className={`bg-white shadow-2xl rounded-lg p-8 ${darkMode ? 'bg-gray-800' : ''} transition-colors duration-300`}>
          <GhostTextarea
            ref={textareaRef}
            value={entry}
            suggestion={suggestion}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Start writing your journal entry..."
            className={`w-full h-64 p-4 mb-6 text-lg border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 ${
              darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300'
            } hover:shadow-lg`}
          />
          {error && (
            <div className="mb-6 p-4 rounded bg-red-100 text-red-700 transition-colors duration-300 shadow-md">
              <p className="font-semibold">Error:</p>
              <p>{error}</p>
            </div>
          )}
          <div className="flex justify-between items-center">
            <button
              onClick={() => getSuggestion(entry)}
              disabled={isLoading}
              className={`px-6 py-3 rounded-full ${
                darkMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              } transition-all duration-300 flex items-center ${isLoading ? 'opacity-50 cursor-not-allowed' : ''} hover:shadow-lg`}
            >
              <RefreshCw size={18} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              New Suggestion
            </button>
            <button
              onClick={() => {/* Implement save functionality */}}
              className={`px-6 py-3 rounded-full ${
                darkMode
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              } transition-all duration-300 flex items-center hover:shadow-lg`}
            >
              <Save size={18} className="mr-2" />
              Save Entry
            </button>
            <button
              onClick={() => {
                setEntry('');
                setSuggestion('');
              }}
              className={`px-6 py-3 rounded-full ${
                darkMode
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              } transition-all duration-300 hover:shadow-lg`}
            >
              Clear Entry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}