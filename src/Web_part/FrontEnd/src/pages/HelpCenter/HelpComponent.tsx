// src/components/HelpCenter/HelpCenter.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import DOMPurify from 'dompurify';

// Types for our component
interface Section {
  id: string;
  title: string;
  level: number;
  content: string;
}

const contentStyle = {
  overflowAnchor: 'none', // Prevents scroll position jumps
  scrollBehavior: 'auto', // Let our custom scrolling handle it
  willChange: 'scroll-position' // Optimize for scroll animations
} as React.CSSProperties;

const HelpCenter: React.FC = () => {
  // State for the component
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [parsedSections, setParsedSections] = useState<Section[]>([]);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ref for the main content area for scrolling
  const contentRef = useRef<HTMLDivElement>(null);

  // Function to discover available documentation files
  useEffect(() => {
    const discoverDocumentationFiles = async () => {
      try {
        // Set loading state
        setIsLoading(true);
        
        // Fetch the list of documentation files from the server
        // This assumes the backend serves a directory listing or has an API endpoint
        const response = await fetch('/src/pages/FAQ/FAQpages/');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch documentation files: ${response.status}`);
        }
        
        // Parse the directory listing response
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Extract markdown files from the directory listing
        const links = Array.from(doc.querySelectorAll('a'));
        const mdFiles = links
          .filter(link => link.href.endsWith('.md'))
          .map(link => {
            const path = `/src/pages/FAQ/FAQpages/${link.textContent}`;
            // Convert filename to readable name
            const name = link.textContent?.replace('.md', '')
              .split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || '';
            return { path, name };
          });
        
        // If no markdown files found, try a fallback to a known directory
        if (mdFiles.length === 0) {
          // Add at least the template file we know exists
          mdFiles.push({
            path: '/src/pages/FAQ/FAQpages/Template/FAQ-template.md',
            name: 'User Guide'
          });
        }
        
        
        // Set default document to load
        if (mdFiles.length > 0 && !activeTopic) {
          setActiveTopic(mdFiles[0].path);
        }
      } catch (err) {
        console.error('Error discovering documentation files:', err);
        setError('Failed to load documentation list. Using default documentation.');
        
        // Fallback to the template file we know exists
        const fallbackDoc = {
          path: '/src/pages/FAQ/FAQpages/Template/FAQ-template.md',
          name: 'User Guide'
        };
        
        
        if (!activeTopic) {
          setActiveTopic(fallbackDoc.path);
        }
      } finally {
        setIsLoading(false);
      }
    };

    discoverDocumentationFiles();
  }, [activeTopic]);
  
  // Handle setting the initial active section
useEffect(() => {
  if (parsedSections.length > 0 && !activeSection) {
    setActiveSection(parsedSections[0].id);
  }
}, [parsedSections, activeSection]);

  // Load markdown content when the active topic changes
  useEffect(() => {
    if (!activeTopic) return;
    
    const loadMarkdownContent = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Make a fetch call to load the markdown file
        const response = await fetch(activeTopic);
        
        if (!response.ok) {
          throw new Error(`Failed to load documentation: ${response.status}`);
        }
        
        const content = await response.text();
        
        // Parse sections from the markdown content
        const sections = parseMarkdownSections(content);
        setParsedSections(sections);
        
        // Set first section as active if none is selected
        if (!activeSection && sections.length > 0) {
          setActiveSection(sections[0].id);
        }

        // Expand top-level sections by default
        const initialExpanded: Record<string, boolean> = {};
        sections.forEach(section => {
          if (section.level === 1) {
            initialExpanded[section.id] = true;
          }
        });
        setExpandedSections(initialExpanded);
        
      } catch (err) {
        console.error('Error loading documentation:', err);
        setError('Failed to load documentation. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadMarkdownContent();
  }, [activeTopic]);

  // Parse markdown sections
  const parseMarkdownSections = (markdown: string): Section[] => {
    const lines = markdown.split('\n');
    const sections: Section[] = [];
    let currentSection: Section | null = null;
    let content = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for headers using regex
      const h1Match = line.match(/^# (.+)$/);
      const h2Match = line.match(/^## (.+)$/);
      const h3Match = line.match(/^### (.+)$/);
      
      if (h1Match || h2Match || h3Match) {
        // Save previous section if exists
        if (currentSection) {
          sections.push({
            ...currentSection,
            content: content.trim()
          });
          content = '';
        }
        
        const title = h1Match ? h1Match[1] : h2Match ? h2Match[1] : h3Match![1];
        const level = h1Match ? 1 : h2Match ? 2 : 3;
        const id = title.toLowerCase().replace(/[^\w]+/g, '-');
        
        currentSection = {
          id,
          title,
          level,
          content: ''
        };
      } else if (currentSection) {
        content += line + '\n';
      }
    }
    
    // Add the last section
    if (currentSection) {
      sections.push({
        ...currentSection,
        content: content.trim()
      });
    }
    
    return sections;
  };

  // Toggle section expansion - prevent event propagation
  const toggleSection = useCallback((e: React.MouseEvent, sectionId: string) => {
    e.stopPropagation();
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  }, []);

// Navigate to a section
const navigateToSection = useCallback((e: React.MouseEvent, sectionId: string) => {
  e.preventDefault();
  
  // Only update state if it's actually changing
  if (activeSection !== sectionId) {
    setActiveSection(sectionId);
  }
  
  // Immediately scroll without waiting for re-render
  scrollToSection(sectionId);
}, [activeSection]);

// Add this helper function
const scrollToSection = useCallback((sectionId: string) => {
  if (contentRef.current) {
    const element = document.getElementById(sectionId);
    if (element) {
      const container = contentRef.current;
      const elementPosition = element.offsetTop;
      
      // Smooth scroll with JS instead of scrollIntoView
      const startPosition = container.scrollTop;
      const distance = elementPosition - startPosition;
      const duration = 300; // ms
      let start: number | null = null;
      
      const step = (timestamp: number) => {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        const percentage = Math.min(progress / duration, 1);
        
        // Easing function for smoother scroll
        const easeInOutQuad = (t: number) => 
          t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        
        container.scrollTop = startPosition + distance * easeInOutQuad(percentage);
        
        if (progress < duration) {
          window.requestAnimationFrame(step);
        }
      };
      
      window.requestAnimationFrame(step);
    }
  }
}, []);

  // Check if a section should be shown based on active section
  const shouldShowSection = (section: Section): boolean => {
    // For H1 headers, always show them as main categories
    if (section.level === 1) return true;
    
    // For H2/H3, only show them if they belong to active H1 section or if they are expanded
    const h1Sections = parsedSections.filter(s => s.level === 1);
    
    for (let i = 0; i < h1Sections.length; i++) {
      const currentH1 = h1Sections[i];
      const nextH1 = h1Sections[i + 1];
      const currentH1Index = parsedSections.findIndex(s => s.id === currentH1.id);
      const nextH1Index = nextH1 ? parsedSections.findIndex(s => s.id === nextH1.id) : parsedSections.length;
      
      const sectionIndex = parsedSections.findIndex(s => s.id === section.id);
      
      // Check if this section is within the expanded H1 section
      if (sectionIndex > currentH1Index && sectionIndex < nextH1Index) {
        // If the parent H1 is expanded, show this section
        if (expandedSections[currentH1.id]) {
          return true;
        }
        
        // If this is the active section or its parent is active, show it
        if (section.id === activeSection || 
            (section && 
             sectionIndex > currentH1Index && 
             sectionIndex < nextH1Index)) {
          return true;
        }
      }
    }
    
    return false;
  };

// Format content for rendering - handling tables, lists, etc.
const formatContent = (content: string): string => {
  let formattedContent = content
    // Handle tables - process complete tables at once
    .replace(/(^\|.*\|$\n?)+/gm, (tableBlock) => {
      const rows = tableBlock.trim().split('\n');
      
      // Check if we have enough rows for a valid table
      if (rows.length < 2) return tableBlock;
      
      // Check if the second row looks like a delimiter row
      const delimiterRowRegex = /^\|[-:\s|]+\|$/;
      const hasDelimiterRow = rows.length > 1 && delimiterRowRegex.test(rows[1]);
      
      // Process header (first row)
      const headerCells = rows[0]
        .split('|')
        .filter((_, i) => i > 0 && i < rows[0].split('|').length - 1)
        .map(cell => `<th class="border border-gray-300 px-4 py-2">${cell.trim()}</th>`)
        .join('');
      
      // Process body rows (skip the delimiter row if it exists)
      const startIndex = hasDelimiterRow ? 2 : 1;
      const bodyRows = rows.slice(startIndex).map(row => {
        const cells = row
          .split('|')
          .filter((_, i) => i > 0 && i < row.split('|').length - 1)
          .map(cell => `<td class="border border-gray-300 px-4 py-2">${cell.trim()}</td>`)
          .join('');
        
        return `<tr>${cells}</tr>`;
      }).join('');
      
      // Return the complete table HTML
      return `<div class="overflow-x-auto my-4">
        <table class="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr class="bg-gray-100">${headerCells}</tr>
          </thead>
          <tbody>
            ${bodyRows}
          </tbody>
        </table>
      </div>`;
    })
    // Unordered lists
    .replace(/^(-\s.*)$/gm, '<li class="ml-6 list-disc my-1">$1</li>')
    // Blockquotes
    .replace(/^>\s(.*)$/gm, '<blockquote class="pl-4 border-l-4 border-blue-500 italic text-gray-600 my-4">$1</blockquote>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 p-4 rounded-md overflow-x-auto my-4"><code>$1</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded text-sm font-mono">$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
    // Paragraphs (anything that's not already wrapped)
    .replace(/^(?!<[h|l|b|p|c|t|d])(.+)$/gm, '<p class="my-2">$1</p>');
  
  // Sanitize content
  return DOMPurify.sanitize(formattedContent);
};

  return (
    <div className="bg-white p-6 rounded-lg shadow-md w-full h-[calc(100vh-160px)] overflow-hidden">
      <div className="flex flex-col lg:flex-row h-full overflow-hidden">
        {/* Sidebar navigation */}
        <div className="w-full lg:w-80 bg-gray-50 border-r border-gray-200 overflow-auto flex flex-col">
          {/* Navigation sections */}
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
              Overview
            </h3>
            
            {isLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 p-3 rounded-md text-red-700 text-sm flex items-start">
                <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            ) : (
              <div>
                {parsedSections.filter(section => shouldShowSection(section)).map((section) => (
                  <div key={section.id} className={`pl-${(section.level - 1) * 3}`}>
                    <div className="flex items-center">
                      <button
                        onClick={(e) => navigateToSection(e, section.id)}
                        className={`flex items-center justify-between w-full text-left px-2 py-1.5 rounded-md ${
                          activeSection === section.id 
                            ? 'bg-blue-50 text-blue-700 font-medium' 
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <span className={`${section.level > 1 ? 'text-sm' : 'font-medium'}`}>
                          {section.title}
                        </span>
                        
                        {section.level === 1 && (
                          <button
                            onClick={(e) => toggleSection(e, section.id)}
                            className="p-0.5 rounded-full hover:bg-gray-200"
                          >
                            {expandedSections[section.id] ? (
                              <ChevronUp size={14} />
                            ) : (
                              <ChevronDown size={14} />
                            )}
                          </button>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Main content */}
        <div 
          ref={contentRef}
          className="flex-1 overflow-auto py-4 pl-15 pr-4 relative"
          style = {contentStyle}
        >
          <div className="max-w-4xl mx-full">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 p-4 rounded-md text-red-700">
                <p className="font-medium">Error</p>
                <p>{error}</p>
              </div>
            ) : (
              <>
                {/* Render content based on active section */}
                <div className="space-y-4">
                  {parsedSections.map(section => {
                    // Only render sections that match active section
                    if (!shouldShowSection(section)) return null;
                    
                    // Identify heading level for styling
                    const HeadingTag = `h${section.level}` as keyof React.JSX.IntrinsicElements;
                    
                    return (
                      <div 
                        key={section.id} 
                        id={section.id} 
                        className={`mb-1 pt-1 ${section.level === 1 ? 'border-t border-gray-200 first:border-t-0' : ''}`}
                      >
                        <HeadingTag className={`
                          scroll-mt-6
                          ${section.level === 1 ? 'text-2xl font-bold mt-1 mb-3 text-blue-900' : ''}
                          ${section.level === 2 ? 'text-xl font-bold mt-3 mb-2 text-gray-800' : ''}
                          ${section.level === 3 ? 'text-lg font-bold mt-2 mb-1 text-gray-700' : ''}
                        `}>
                          {section.title}
                        </HeadingTag>
                        
                        {/* Format and display section content */}
                        <div 
                          className="prose prose-blue max-w-none text-gray-600"
                          dangerouslySetInnerHTML={{ __html: formatContent(section.content) }}
                        />
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;