//src/Web_part/FrontEnd/src/pages/HelpCnter/HelpCenter.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Book, ChevronDown, ChevronUp,} from 'lucide-react';

interface Section {
  id: string;
  title: string;
  level: number;
  content: string;
}

const HelpPage: React.FC = () => {
  const [searchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [parsedSections, setParsedSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load the markdown file
  useEffect(() => {
    const loadMarkdownContent = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch:
        const response = await fetch('/src/pages/FAQ/FAQpages/Template/FAQ-template.md');
        
        if (!response.ok) {
          throw new Error('Failed to load documentation');
        }
        
        const content = await response.text();
        
        // Parse sections from the markdown content
        const sections = parseMarkdownSections(content);
        setParsedSections(sections);
        
        // Set first section as active if none is selected
        if (!activeSection && sections.length > 0) {
          setActiveSection(sections[0].id);
        }
      } catch (err) {
        console.error('Error loading documentation:', err);
        setError('Failed to load documentation. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadMarkdownContent();
  }, [activeSection]);

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
  
  // Filter sections based on search query
  const filteredSections = useMemo(() => {
    if (!searchQuery) return parsedSections;
    
    return parsedSections.filter(section => 
      section.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      section.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [parsedSections, searchQuery]);

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Navigate to a section
  const navigateToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  // Check if a section should be shown based on active section and search
  const shouldShowSection = (section: Section): boolean => {
    if (searchQuery) {
      return true; // Show all sections when searching
    }
    
    const activeSectionObj = parsedSections.find(s => s.id === activeSection);
    if (!activeSectionObj) return true;
    
    // For H1 headers, always show them as main categories
    if (section.level === 1) return true;
    
    // For H2/H3, only show them if they belong to active H1 section
    const h1Sections = parsedSections.filter(s => s.level === 1);
    
    for (let i = 0; i < h1Sections.length; i++) {
      const currentH1 = h1Sections[i];
      const nextH1 = h1Sections[i + 1];
      const currentH1Index = parsedSections.findIndex(s => s.id === currentH1.id);
      const nextH1Index = nextH1 ? parsedSections.findIndex(s => s.id === nextH1.id) : parsedSections.length;
      
      const sectionIndex = parsedSections.findIndex(s => s.id === section.id);
      const activeSectionIndex = parsedSections.findIndex(s => s.id === activeSection);
      
      if (sectionIndex > currentH1Index && sectionIndex < nextH1Index &&
          activeSectionIndex >= currentH1Index && activeSectionIndex < nextH1Index) {
        return true;
      }
    }
    
    return false;
  };

  return (
    <div className="flex flex-col lg:flex-row h-full max-h-[calc(100vh-160px)] overflow-hidden">
      {/* Sidebar navigation */}
      <div className="w-full lg:w-110 bg-gray-50 border-r border-gray-200 overflow-auto">
        <div className="p-4">
          <div className="flex items-center space-x-2 mb-6">
            <Book size={24} className="text-blue-600" />
            <h1 className="text-xl font-bold text-gray-800">Documentation</h1>
          </div>
          
          {/* Navigation sections */}
          <div className="space-y-2">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            ) : (
              filteredSections.filter(section => shouldShowSection(section)).map((section) => (
                <div key={section.id} className={`rounded-md overflow-hidden pl-${(section.level - 1) * 3}`}>
                  <button
                    onClick={() => {
                      navigateToSection(section.id);
                      toggleSection(section.id);
                    }}
                    className={`flex items-center justify-between w-full p-2 text-left hover:bg-gray-100 ${
                      activeSection === section.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <span className={`font-medium ${section.level > 1 ? 'text-sm' : ''}`}>
                      {section.title}
                    </span>
                    
                    {section.level === 1 && (
                      expandedSections[section.id] ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
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
              {/* Render content based on active section or search */}
              {filteredSections.map(section => {
                // Only render sections that match active section or search
                if (!shouldShowSection(section) && !searchQuery) return null;
                
                // Identify heading level for styling
                const HeadingTag = `h${section.level}` as keyof React.JSX.IntrinsicElements;
                
                return (
                  <div 
                    key={section.id} 
                    id={section.id} 
                    className={`mb-8 ${
                      searchQuery && section.title.toLowerCase().includes(searchQuery.toLowerCase()) 
                        ? 'bg-yellow-50 p-4 rounded-lg' 
                        : ''
                    }`}
                  >
                    <HeadingTag className={`
                      ${section.level === 1 ? 'text-3xl font-bold mt-6 mb-4' : ''}
                      ${section.level === 2 ? 'text-2xl font-bold mt-5 mb-3' : ''}
                      ${section.level === 3 ? 'text-xl font-bold mt-4 mb-2' : ''}
                    `}>
                      {section.title}
                    </HeadingTag>
                    
                    {/* Format and display section content */}
                    <div className="prose prose-blue max-w-none">
                      {formatContent(section.content)}
                    </div>
                  </div>
                );
              })}
              
              <div className="mt-6 text-center text-gray-500 text-sm">
                Last updated: March 28, 2025
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function to format content
const formatContent = (content: string): React.ReactElement => {

  const formattedContent = content
    .replace(/^(\d+\.\s.*)$/gm, '<li class="ml-6 list-decimal">$1</li>')
    .replace(/^(-\s.*)$/gm, '<li class="ml-6 list-disc">$1</li>')
    .replace(/^>\s(.*)$/gm, '<blockquote class="pl-4 border-l-4 border-blue-500 italic text-gray-600">$1</blockquote>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 p-4 rounded-md overflow-x-auto"><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/^(?!<[h|l|b|p|c])(.+)$/gm, '<p class="my-2">$1</p>');
  
  return <div dangerouslySetInnerHTML={{ __html: formattedContent }} />;
};

export default HelpPage;