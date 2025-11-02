import React, { useState } from 'react';
import { Icons } from './Icons';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
  placeholder: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading, placeholder }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading) {
      onSearch(query);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full text-lg md:text-xl p-4 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition"
        disabled={isLoading}
      />
      <button
        type="submit"
        disabled={isLoading}
        className="bg-sky-600 text-white p-4 rounded-lg hover:bg-sky-700 disabled:bg-slate-400 disabled:cursor-wait transition-colors"
        aria-label="Search"
      >
        <Icons.Search className="w-7 h-7" />
      </button>
    </form>
  );
};
