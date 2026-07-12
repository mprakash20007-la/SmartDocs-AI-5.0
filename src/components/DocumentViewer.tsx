import React, { useState, useEffect, useRef } from 'react';
import { 
  Highlighter, 
  StickyNote, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Save, 
  Pin, 
  Search, 
  X, 
  Sparkles, 
  AlertCircle, 
  Check, 
  FileText,
  RotateCcw,
  Palette,
  Eye,
  BookOpen,
  Copy,
  Download,
  Filter,
  BarChart3,
  BookOpenCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DocumentItem, Annotation } from '../types';
import GlassCard from './GlassCard';
import Markdown from 'react-markdown';
import { jsPDF } from 'jspdf';

interface DocumentViewerProps {
  activeDoc: DocumentItem;
  onAnnotationsUpdated?: () => void;
}

interface PageData {
  pageNumber: number;
  title: string;
  content: string;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({ activeDoc, onAnnotationsUpdated }) => {
  const [pages, setPages] = useState<PageData[]>([]);
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Annotations state
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Active tools
  const [interactionMode, setInteractionMode] = useState<'highlight' | 'note' | 'read'>('read');
  const [sidebarTab, setSidebarTab] = useState<'all' | 'highlights' | 'notes' | 'synthesis'>('all');
  const [colorFilter, setColorFilter] = useState<string | null>(null);

  // Text selection popover state
  const [selectionPopover, setSelectionPopover] = useState<{
    x: number;
    y: number;
    selectedText: string;
    startIndex: number;
    endIndex: number;
  } | null>(null);

  // Selected note detail view
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [noteDraftText, setNoteDraftText] = useState<string>('');

  // AI Synthesis state
  const [synthesisText, setSynthesisText] = useState<string | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // Search annotations filter
  const [searchTerm, setSearchTerm] = useState('');

  const pageContainerRef = useRef<HTMLDivElement>(null);

  // Color schemas with specific educational meanings
  const highlightColors = [
    { name: 'Core Concept', color: 'rgba(253, 224, 71, 0.45)', bgClass: 'bg-yellow-300/40 text-yellow-300 border-yellow-400/30' },
    { name: 'Supporting Fact', color: 'rgba(34, 211, 238, 0.45)', bgClass: 'bg-cyan-400/40 text-cyan-300 border-cyan-400/30' },
    { name: 'Key Vocabulary', color: 'rgba(74, 222, 128, 0.45)', bgClass: 'bg-green-400/40 text-green-300 border-green-400/30' },
    { name: 'Important Formula', color: 'rgba(244, 114, 182, 0.45)', bgClass: 'bg-pink-400/40 text-pink-300 border-pink-400/30' }
  ];

  const noteColors = [
    { name: 'Amber', hex: '#f59e0b', textClass: 'text-amber-400', bgClass: 'bg-amber-500/20 border-amber-500/30' },
    { name: 'Cyan', hex: '#06b6d4', textClass: 'text-cyan-400', bgClass: 'bg-cyan-500/20 border-cyan-500/30' },
    { name: 'Emerald', hex: '#10b981', textClass: 'text-emerald-400', bgClass: 'bg-emerald-500/20 border-emerald-500/30' },
    { name: 'Purple', hex: '#a855f7', textClass: 'text-purple-400', bgClass: 'bg-purple-500/20 border-purple-500/30' }
  ];

  // Fetch parsed pages & annotations
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch pages layout
        const pagesRes = await fetch(`/api/documents/${activeDoc.id}/pages`);
        if (!pagesRes.ok) throw new Error('Failed to parse document page structure.');
        const pagesData = await pagesRes.json();
        setPages(pagesData);

        // Fetch saved annotations
        const annotationsRes = await fetch(`/api/documents/${activeDoc.id}/annotations`);
        if (annotationsRes.ok) {
          const annData = await annotationsRes.json();
          setAnnotations(annData);
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load document content.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    setCurrentPageNum(1);
    setSelectionPopover(null);
    setActiveNoteId(null);
    setSynthesisText(null);
  }, [activeDoc.id]);

  // Handle saving annotations to backend
  const saveAnnotations = async (updatedAnnotations: Annotation[]) => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/documents/${activeDoc.id}/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ annotations: updatedAnnotations })
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
        if (onAnnotationsUpdated) onAnnotationsUpdated();
      }
    } catch (err) {
      console.error('Failed to save annotations:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Monitor text selection to trigger highlighter popup
  const handleTextSelection = (e: React.MouseEvent) => {
    if (interactionMode === 'note') return; // Clicking is reserved for placing sticky notes

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setSelectionPopover(null);
      return;
    }

    const selectedText = selection.toString().trim();
    const activePage = pages.find(p => p.pageNumber === currentPageNum);
    
    if (selectedText.length > 0 && activePage) {
      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Offset relative to page content viewport
        if (pageContainerRef.current) {
          const containerRect = pageContainerRef.current.getBoundingClientRect();
          const pageBodyElement = pageContainerRef.current.querySelector('.page-body-content');
          
          let startIndex = 0;
          let endIndex = 0;

          if (pageBodyElement) {
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(pageBodyElement);
            preCaretRange.setEnd(range.startContainer, range.startOffset);
            startIndex = preCaretRange.toString().length;
            endIndex = startIndex + selectedText.length;
          } else {
            // Fallback
            startIndex = activePage.content.indexOf(selectedText);
            endIndex = startIndex + selectedText.length;
          }

          setSelectionPopover({
            x: rect.left - containerRect.left + (rect.width / 2),
            y: rect.top - containerRect.top - 45, // above text
            selectedText,
            startIndex,
            endIndex
          });
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Add a text highlight
  const addHighlight = (colorHex: string) => {
    if (!selectionPopover) return;

    const newAnn: Annotation = {
      id: 'ann_' + Math.random().toString(36).substring(2, 11),
      type: 'highlight',
      text: selectionPopover.selectedText,
      color: colorHex,
      page: currentPageNum,
      startIndex: selectionPopover.startIndex,
      endIndex: selectionPopover.endIndex,
      createdAt: new Date().toISOString()
    };

    const nextAnnotations = [...annotations, newAnn];
    setAnnotations(nextAnnotations);
    saveAnnotations(nextAnnotations);

    // Clear selection state
    setSelectionPopover(null);
    window.getSelection()?.removeAllRanges();
  };

  // Drop a sticky note click handler
  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (interactionMode !== 'note') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newNoteId = 'ann_' + Math.random().toString(36).substring(2, 11);
    const newNote: Annotation = {
      id: newNoteId,
      type: 'note',
      color: noteColors[0].hex, // Default amber
      page: currentPageNum,
      x,
      y,
      noteText: '',
      createdAt: new Date().toISOString()
    };

    const nextAnnotations = [...annotations, newNote];
    setAnnotations(nextAnnotations);
    saveAnnotations(nextAnnotations);

    setActiveNoteId(newNoteId);
    setNoteDraftText('');
    setInteractionMode('read'); // return to read after placing
  };

  // Edit/Save a sticky note content
  const handleSaveNoteText = (id: string, text: string) => {
    const updated = annotations.map(ann => {
      if (ann.id === id) {
        return { ...ann, noteText: text };
      }
      return ann;
    });
    setAnnotations(updated);
    saveAnnotations(updated);
    setActiveNoteId(null);
  };

  // Delete an annotation
  const handleDeleteAnnotation = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const filtered = annotations.filter(ann => ann.id !== id);
    setAnnotations(filtered);
    saveAnnotations(filtered);
    if (activeNoteId === id) setActiveNoteId(null);
  };

  // High-fidelity partition-based renderer mapping selections accurately to character index boundaries
  const renderHighlightedContent = (rawText: string) => {
    if (!rawText) return null;

    // Get highlights for current page with valid start/end offsets
    const pageHighlights = annotations.filter(
      ann => ann.type === 'highlight' && ann.page === currentPageNum && ann.startIndex !== undefined && ann.endIndex !== undefined
    ) as Required<Pick<Annotation, 'id' | 'startIndex' | 'endIndex' | 'color' | 'text'>>[];

    // Fallback to legacy string replace if no indexed highlights exist yet
    if (pageHighlights.length === 0) {
      const legacyHighlights = annotations.filter(
        ann => ann.type === 'highlight' && ann.page === currentPageNum && ann.text && (ann.startIndex === undefined || ann.endIndex === undefined)
      );

      if (legacyHighlights.length === 0) {
        return <p className="whitespace-pre-line text-sm md:text-base text-gray-200 leading-relaxed font-normal">{rawText}</p>;
      }

      // legacy substring-match
      const sortedLegacy = [...legacyHighlights].sort((a, b) => (b.text?.length || 0) - (a.text?.length || 0));
      const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      let htmlContent = rawText;
      const replacements: { [key: string]: { text: string; color: string } } = {};

      sortedLegacy.forEach((hl, idx) => {
        const placeholder = `___HIGHLIGHT_PLACEHOLDER_${idx}___`;
        const escapedText = escapeRegExp(hl.text || '');
        const regex = new RegExp(`(${escapedText})`, 'gi');
        if (htmlContent.match(regex)) {
          replacements[placeholder] = { text: hl.text || '', color: hl.color };
          htmlContent = htmlContent.replace(regex, placeholder);
        }
      });

      Object.keys(replacements).forEach(placeholder => {
        const { text, color } = replacements[placeholder];
        const styleBlock = `<mark style="background-color: ${color}; color: #000; border-radius: 4px; padding: 1px 3px; font-weight: 500;" class="transition-all duration-200">${text}</mark>`;
        htmlContent = htmlContent.replaceAll(placeholder, styleBlock);
      });

      return (
        <div 
          dangerouslySetInnerHTML={{ __html: htmlContent }} 
          className="whitespace-pre-line text-sm md:text-base text-gray-200 leading-relaxed font-normal"
        />
      );
    }

    // Sort index-based highlights by startIndex ascending
    const sortedActive = [...pageHighlights].sort((a, b) => a.startIndex - b.startIndex);

    // Filter out overlapping intervals to ensure seamless rendering sequence
    const nonOverlapping: typeof sortedActive = [];
    let lastEnd = 0;
    sortedActive.forEach(hl => {
      if (hl.startIndex >= lastEnd) {
        nonOverlapping.push(hl);
        lastEnd = hl.endIndex;
      }
    });

    const parts: React.ReactNode[] = [];
    let currentIndex = 0;

    nonOverlapping.forEach((hl, idx) => {
      // Add preceding plain text
      if (hl.startIndex > currentIndex) {
        parts.push(
          <span key={`text-pre-${idx}`}>
            {rawText.substring(currentIndex, hl.startIndex)}
          </span>
        );
      }

      // Add highlighted text with matching color tag styling
      parts.push(
        <mark
          key={`mark-${hl.id}`}
          style={{ backgroundColor: hl.color, color: '#000', borderRadius: '4px', padding: '1px 3px', fontWeight: 500 }}
          className="transition-all duration-200"
        >
          {rawText.substring(hl.startIndex, hl.endIndex)}
        </mark>
      );

      currentIndex = hl.endIndex;
    });

    // Add remaining plain text
    if (currentIndex < rawText.length) {
      parts.push(
        <span key="text-post">
          {rawText.substring(currentIndex)}
        </span>
      );
    }

    return (
      <div className="whitespace-pre-line text-sm md:text-base text-gray-200 leading-relaxed font-normal">
        {parts}
      </div>
    );
  };

  // Call Gemini study-guide synthesis endpoint
  const handleSynthesizeHighlights = async () => {
    const highlightsOnly = annotations.filter(ann => ann.type === 'highlight' && ann.text);
    if (highlightsOnly.length === 0) {
      alert("Please highlight some key segments in Reader mode first!");
      return;
    }

    setIsSynthesizing(true);
    setSidebarTab('synthesis');
    try {
      const res = await fetch(`/api/documents/${activeDoc.id}/synthesize-highlights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ highlights: highlightsOnly })
      });
      if (!res.ok) throw new Error("Could not synthesize highlights.");
      const data = await res.json();
      setSynthesisText(data.synthesis);
    } catch (err: any) {
      alert(err.message || "Failed to synthesize highlights.");
    } finally {
      setIsSynthesizing(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(label);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const downloadSynthesis = () => {
    if (!synthesisText) return;
    const blob = new Blob([synthesisText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeDoc.title.replace(/\.[^/.]+$/, "")}_study_guide.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let currentY = 30;

      const checkPageOverflow = (neededHeight: number) => {
        if (currentY + neededHeight > pageHeight - margin) {
          doc.addPage();
          // Draw header on new page
          doc.setFont("Helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(156, 163, 175); // gray-400
          doc.text(`${activeDoc.title} | Study Export`, margin, 12);
          doc.line(margin, 15, pageWidth - margin, 15);
          currentY = 25;
        }
      };

      // 1. Cover Page Content
      doc.setFillColor(139, 92, 246); // brand-purple (#8b5cf6)
      doc.rect(margin, 20, contentWidth, 8, 'F');

      currentY = 45;
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(31, 41, 55); // gray-800
      const titleLines = doc.splitTextToSize(activeDoc.title, contentWidth);
      for (const tLine of titleLines) {
        doc.text(tLine, margin, currentY);
        currentY += 10;
      }

      currentY += 2;
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128); // gray-500
      doc.text("COMPREHENSIVE STUDY REPORT & EXPORT", margin, currentY);
      currentY += 8;

      // Divider line
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.5);
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 12;

      // Metadata section
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(55, 65, 81); // gray-700
      doc.text("METADATA", margin, currentY);
      currentY += 8;

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(75, 85, 99); // gray-600

      doc.text(`• Exported On: ${new Date().toLocaleString()}`, margin + 5, currentY);
      currentY += 6.5;
      doc.text(`• Total Document Pages: ${pages.length}`, margin + 5, currentY);
      currentY += 6.5;
      doc.text(`• Highlight Count: ${totalHighlightsCount}`, margin + 5, currentY);
      currentY += 6.5;
      doc.text(`• Sticky Comment Pins: ${totalNotesCount}`, margin + 5, currentY);
      currentY += 15;

      // Report Overview section
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(55, 65, 81);
      doc.text("REPORT OVERVIEW", margin, currentY);
      currentY += 8;

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      const introText = "This study companion document consolidates the complete extracted text pages of the original reference, integrated chronologically with your customized visual highlights and active sticky-note annotation blocks. Use this compiled material for comprehensive review, revision sessions, and self-evaluation syncs.";
      const introLines = doc.splitTextToSize(introText, contentWidth);
      for (const iLine of introLines) {
        doc.text(iLine, margin, currentY);
        currentY += 6;
      }
      currentY += 15;

      // 2. Loop over pages
      for (const page of pages) {
        doc.addPage();
        currentY = 25;

        // Page title header
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(31, 41, 55); // gray-800
        doc.text(`Page ${page.pageNumber}: ${page.title || 'Untitled Page'}`, margin, currentY);
        currentY += 6;

        // Light divider under page header
        doc.setDrawColor(243, 244, 246); // gray-100
        doc.setLineWidth(0.5);
        doc.line(margin, currentY, pageWidth - margin, currentY);
        currentY += 10;

        // Print page body content
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(55, 65, 81); // gray-700
        const pageContentLines = doc.splitTextToSize(page.content, contentWidth);
        for (const line of pageContentLines) {
          checkPageOverflow(6);
          doc.text(line, margin, currentY);
          currentY += 6;
        }

        // Get annotations for this page
        const pageHighlights = annotations.filter(a => a.type === 'highlight' && a.page === page.pageNumber);
        const pageNotes = annotations.filter(a => a.type === 'note' && a.page === page.pageNumber);

        // Print page highlights
        if (pageHighlights.length > 0) {
          currentY += 6;
          checkPageOverflow(12);
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(11);
          doc.setTextColor(139, 92, 246); // brand-purple (#8b5cf6)
          doc.text("✦ HIGHLIGHTS ON THIS PAGE", margin, currentY);
          currentY += 8;

          doc.setFont("Helvetica", "oblique");
          doc.setFontSize(9.5);

          for (const ann of pageHighlights) {
            if (!ann.text) continue;
            const highlightLines = doc.splitTextToSize(`"${ann.text}"`, contentWidth - 10);
            const boxHeight = (highlightLines.length * 5) + 5;
            checkPageOverflow(boxHeight + 6);

            // Draw light yellow highlight box background
            doc.setFillColor(254, 240, 138); // yellow-100
            doc.rect(margin, currentY, contentWidth, boxHeight, 'F');

            // Draw left golden border line
            doc.setDrawColor(234, 179, 8); // yellow-500
            doc.setLineWidth(1.5);
            doc.line(margin, currentY, margin, currentY + boxHeight);

            // Write quote text inside
            doc.setTextColor(31, 41, 55); // gray-800
            let textY = currentY + 5;
            for (const hLine of highlightLines) {
              doc.text(hLine, margin + 5, textY);
              textY += 5;
            }
            currentY += boxHeight + 6;
          }
        }

        // Print page sticky notes
        if (pageNotes.length > 0) {
          currentY += 6;
          checkPageOverflow(12);
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(11);
          doc.setTextColor(6, 182, 212); // brand-cyan (#06b6d4)
          doc.text("✦ STICKY NOTES ON THIS PAGE", margin, currentY);
          currentY += 8;

          doc.setFont("Helvetica", "normal");
          doc.setFontSize(9.5);

          for (const ann of pageNotes) {
            if (!ann.noteText) continue;
            const noteLines = doc.splitTextToSize(ann.noteText, contentWidth - 10);
            const boxHeight = (noteLines.length * 5) + 5;
            checkPageOverflow(boxHeight + 6);

            // Draw light cyan box background
            doc.setFillColor(224, 242, 254); // cyan-50
            doc.rect(margin, currentY, contentWidth, boxHeight, 'F');

            // Draw left cyan border line
            doc.setDrawColor(6, 182, 212); // cyan-500
            doc.setLineWidth(1.5);
            doc.line(margin, currentY, margin, currentY + boxHeight);

            // Write comment text inside
            doc.setTextColor(15, 23, 42); // slate-900
            let textY = currentY + 5;
            for (const nLine of noteLines) {
              doc.text(nLine, margin + 5, textY);
              textY += 5;
            }
            currentY += boxHeight + 6;
          }
        }
      }

      // 3. Post-process: add footer pagination with "Page X of Y" to all pages
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175); // gray-400
        const footerText = `Page ${i} of ${totalPages}`;
        const textWidth = doc.getTextWidth(footerText);
        doc.text(footerText, (pageWidth - textWidth) / 2, pageHeight - 10);
      }

      // Save PDF
      doc.save(`${activeDoc.title.replace(/\.[^/.]+$/, "")}_study_notes.pdf`);
    } catch (err: any) {
      console.error(err);
      alert("Failed to export PDF study guide.");
    } finally {
      setIsExporting(false);
    }
  };

  const activePage = pages.find(p => p.pageNumber === currentPageNum);

  // Filters sidebars by tab, color, search query
  const filteredAnnotations = annotations.filter(ann => {
    if (sidebarTab === 'highlights' && ann.type !== 'highlight') return false;
    if (sidebarTab === 'notes' && ann.type !== 'note') return false;
    
    // Color filter (only for highlights)
    if (colorFilter && ann.type === 'highlight' && ann.color !== colorFilter) return false;

    // Search query filter
    if (searchTerm === '') return true;
    if (ann.type === 'highlight' && ann.text) {
      return ann.text.toLowerCase().includes(searchTerm.toLowerCase());
    }
    if (ann.type === 'note' && ann.noteText) {
      return ann.noteText.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return false;
  });

  // Calculate statistics of page highlights
  const totalHighlightsCount = annotations.filter(a => a.type === 'highlight').length;
  const totalNotesCount = annotations.filter(a => a.type === 'note').length;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 animate-fade-in" id="document-preview-workspace">
      
      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="xl:col-span-4 py-24 flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center">
            <RotateCcw className="w-8 h-8 text-brand-purple animate-spin" />
          </div>
          <div className="text-center">
            <h4 className="text-base font-bold text-white">Synthesizing Document Stream...</h4>
            <p className="text-xs text-gray-400 mt-1">Gemini is rendering clean extracted page typography...</p>
          </div>
        </div>
      ) : error ? (
        <GlassCard className="xl:col-span-4 p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto animate-bounce" />
          <h3 className="text-lg font-bold text-white">Parsing Error</h3>
          <p className="text-sm text-gray-400 max-w-md mx-auto">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-5 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purple/90 text-xs font-bold text-white"
          >
            Retry Parse
          </button>
        </GlassCard>
      ) : (
        <>
          {/* Left Column: Interactive Reader Content Sheet */}
          <div className="xl:col-span-3 space-y-6">
            
            {/* Main Action Bar */}
            <GlassCard className="p-4 flex flex-wrap items-center justify-between gap-4">
              
              {/* Pagination controls */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setCurrentPageNum(prev => Math.max(1, prev - 1));
                    setSelectionPopover(null);
                  }}
                  disabled={currentPageNum === 1}
                  className="p-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold text-gray-300 px-2 min-w-[70px] text-center">
                  Page {currentPageNum} of {pages.length}
                </span>
                <button
                  onClick={() => {
                    setCurrentPageNum(prev => Math.min(pages.length, prev + 1));
                    setSelectionPopover(null);
                  }}
                  disabled={currentPageNum === pages.length}
                  className="p-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Title file tag */}
              <div className="hidden md:flex items-center space-x-2.5 bg-brand-purple/10 px-3 py-1.5 rounded-xl border border-brand-purple/20 max-w-xs truncate">
                <FileText className="w-3.5 h-3.5 text-brand-purple shrink-0" />
                <span className="text-[11px] font-bold text-gray-200 truncate">{activeDoc.title}</span>
              </div>

              {/* Reader mode / annotation controllers */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setInteractionMode('read');
                    setSelectionPopover(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 border ${
                    interactionMode === 'read'
                      ? 'bg-brand-purple text-white border-brand-purple/40 shadow-md shadow-brand-purple/15'
                      : 'bg-white/5 text-gray-400 border-white/5 hover:text-white'
                  }`}
                  title="Read & highlight text selection"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Reader Mode</span>
                </button>

                <button
                  onClick={() => {
                    setInteractionMode('note');
                    setSelectionPopover(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 border ${
                    interactionMode === 'note'
                      ? 'bg-brand-cyan text-black border-brand-cyan/40 shadow-md shadow-brand-cyan/15'
                      : 'bg-white/5 text-gray-400 border-white/5 hover:text-white'
                  }`}
                  title="Click to drop a sticky comment pin"
                >
                  <StickyNote className="w-3.5 h-3.5" />
                  <span>Drop Sticky Note</span>
                </button>

                {/* Gemini Study Synthesizer launcher button */}
                <button
                  onClick={handleSynthesizeHighlights}
                  disabled={totalHighlightsCount === 0}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 hover:bg-gradient-to-r hover:from-brand-purple hover:to-brand-cyan hover:text-white text-gray-300 border border-white/5 disabled:opacity-20 disabled:pointer-events-none transition-all flex items-center space-x-1.5"
                  title="Synthesize highlights with Gemini intelligence"
                >
                  <Sparkles className="w-3.5 h-3.5 text-brand-cyan" />
                  <span className="hidden sm:inline">AI Study Guide</span>
                </button>

                {/* Export study document PDF button */}
                <button
                  onClick={handleExportPDF}
                  disabled={isExporting}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 transition-all flex items-center space-x-1.5 active:scale-95 disabled:opacity-50"
                  title="Export document with highlights & sticky notes to a beautiful study PDF"
                  id="btn-export-pdf"
                >
                  {isExporting ? (
                    <RotateCcw className="w-3.5 h-3.5 text-brand-purple animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5 text-brand-purple" />
                  )}
                  <span>Export PDF</span>
                </button>
              </div>

              {/* Sync check indicator */}
              <div className="flex items-center text-[10px] text-gray-500 font-mono font-bold">
                {isSaving ? (
                  <span className="text-brand-cyan flex items-center space-x-1">
                    <RotateCcw className="w-2.5 h-2.5 animate-spin" />
                    <span>syncing...</span>
                  </span>
                ) : saveSuccess ? (
                  <span className="text-green-400 flex items-center space-x-1">
                    <Check className="w-2.5 h-2.5" />
                    <span>vault updated</span>
                  </span>
                ) : (
                  <span className="text-gray-500">synced</span>
                )}
              </div>
            </GlassCard>

            {/* Instruction Banner alerts */}
            {interactionMode === 'note' && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="p-3 bg-brand-cyan/10 border border-brand-cyan/20 rounded-xl text-[11px] text-cyan-300 flex items-center space-x-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-brand-cyan animate-pulse shrink-0" />
                <span><strong>Sticky Pinning Enabled</strong>: Hover and click anywhere inside the document text sheet below to place a pin.</span>
              </motion.div>
            )}

            {interactionMode === 'read' && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="p-3 bg-brand-purple/10 border border-brand-purple/20 rounded-xl text-[11px] text-brand-purple flex items-center space-x-2"
              >
                <Highlighter className="w-3.5 h-3.5 text-brand-purple shrink-0 animate-pulse" />
                <span><strong>Interactive Selection Highlighter</strong>: Select text with your cursor inside the sheet, then pick a custom highlighter color!</span>
              </motion.div>
            )}

            {/* Digital Page Sheet Frame */}
            <div className="relative" ref={pageContainerRef}>
              
              {/* Floating selection range popup widget */}
              <AnimatePresence>
                {selectionPopover && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    style={{ 
                      position: 'absolute', 
                      left: selectionPopover.x, 
                      top: selectionPopover.y, 
                      transform: 'translateX(-50%)' 
                    }}
                    className="z-50 bg-neutral-950 border border-white/10 rounded-2xl shadow-2xl p-2.5 flex items-center space-x-2"
                  >
                    <div className="flex flex-col space-y-1 pr-2 border-r border-white/10">
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider font-mono">Highlight Mode:</span>
                      <span className="text-[10px] text-gray-300 font-medium max-w-[100px] truncate italic">"{selectionPopover.selectedText}"</span>
                    </div>

                    {/* Color options */}
                    <div className="flex items-center space-x-1.5">
                      {highlightColors.map((color) => (
                        <button
                          key={color.name}
                          onClick={() => addHighlight(color.color)}
                          className={`w-5.5 h-5.5 rounded-full border border-white/20 hover:scale-115 active:scale-90 transition-all cursor-pointer relative group-button`}
                          style={{ backgroundColor: color.color }}
                          title={`Label: ${color.name}`}
                        >
                          <span className="sr-only">{color.name}</span>
                        </button>
                      ))}
                    </div>

                    <div className="w-px h-5 bg-white/10" />

                    {/* Reference comment note option */}
                    <button
                      onClick={() => {
                        const newNoteId = 'ann_' + Math.random().toString(36).substring(2, 11);
                        const newNote: Annotation = {
                          id: newNoteId,
                          type: 'note',
                          color: noteColors[0].hex,
                          page: currentPageNum,
                          x: 50,
                          y: 20,
                          noteText: `Ref: "${selectionPopover.selectedText}": `,
                          createdAt: new Date().toISOString()
                        };

                        const nextAnnotations = [...annotations, newNote];
                        setAnnotations(nextAnnotations);
                        saveAnnotations(nextAnnotations);
                        setActiveNoteId(newNoteId);
                        setNoteDraftText(`Ref: "${selectionPopover.selectedText}": `);
                        setSelectionPopover(null);
                        window.getSelection()?.removeAllRanges();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-brand-cyan/20 text-brand-cyan text-[10px] font-extrabold hover:bg-brand-cyan/30 active:scale-95 transition-all flex items-center space-x-1"
                    >
                      <StickyNote className="w-3 h-3" />
                      <span>Ref Note</span>
                    </button>

                    <button 
                      onClick={() => setSelectionPopover(null)}
                      className="p-1 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Page Sheet Container */}
              <div 
                onClick={handlePageClick}
                onMouseUp={handleTextSelection}
                className={`w-full min-h-[600px] bg-neutral-900 border border-white/10 rounded-3xl p-8 md:p-14 shadow-2xl relative overflow-hidden select-text leading-relaxed select-none transition-all duration-300 ${
                  interactionMode === 'note' ? 'cursor-crosshair border-brand-cyan/30 bg-neutral-900/95' : 'cursor-text'
                }`}
              >
                {/* Header title inside sheet */}
                {activePage && (
                  <div className="pb-6 mb-8 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-base font-extrabold text-white tracking-tight flex items-center space-x-2">
                      <BookOpen className="w-4 h-4 text-brand-purple" />
                      <span>{activePage.title || 'Extracted Document Layout'}</span>
                    </h3>
                    <span className="text-[10px] bg-white/5 px-2.5 py-1 rounded text-gray-400 font-extrabold font-mono tracking-widest">
                      PAGE {activePage.pageNumber} OF {pages.length}
                    </span>
                  </div>
                )}

                {/* Page Content Body (Selection anchor) */}
                {activePage ? (
                  <div className="relative z-10 select-text page-body-content">
                    {renderHighlightedContent(activePage.content)}
                  </div>
                ) : (
                  <div className="text-center py-24 text-gray-500">
                    No page stream parsed for this section index.
                  </div>
                )}

                {/* Floating comment notes indicators placed on the page sheet */}
                {annotations
                  .filter(ann => ann.type === 'note' && ann.page === currentPageNum)
                  .map((note) => {
                    const matchColor = noteColors.find(c => c.hex === note.color) || noteColors[0];
                    return (
                      <div
                        key={note.id}
                        className="absolute cursor-pointer group z-30 select-none"
                        style={{ left: `${note.x}%`, top: `${note.y}%` }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveNoteId(note.id);
                          setNoteDraftText(note.noteText || '');
                        }}
                      >
                        <div className="relative">
                          {/* Pin design with dynamic glow ring */}
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center border shadow-xl shadow-black/50 transition-all group-hover:scale-115 active:scale-90"
                            style={{ 
                              backgroundColor: `${matchColor.hex}15`, 
                              borderColor: `${matchColor.hex}50`,
                              boxShadow: `0 0 15px ${matchColor.hex}20` 
                            }}
                          >
                            <Pin className="w-3.5 h-3.5" style={{ color: matchColor.hex, fill: matchColor.hex }} />
                          </div>
                          
                          {/* Animated hover note preview */}
                          <div className="absolute left-1/2 bottom-full mb-2.5 -translate-x-1/2 bg-neutral-950 border border-white/10 p-3 rounded-xl shadow-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 min-w-[180px] z-50">
                            <div className="text-[9px] font-extrabold text-gray-500 uppercase tracking-widest mb-1 font-mono">Sticky Pin Comment</div>
                            <p className="text-[11px] text-white line-clamp-3 leading-normal font-normal">
                              {note.noteText || '(Click to edit comment text...)'}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Micro Stats Widget */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-brand-purple/10 border border-brand-purple/20">
                  <Highlighter className="w-4 h-4 text-brand-purple" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono">Highlights</div>
                  <div className="text-base font-extrabold text-white">{totalHighlightsCount} passages</div>
                </div>
              </div>

              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20">
                  <StickyNote className="w-4 h-4 text-brand-cyan" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono">Sticky Pins</div>
                  <div className="text-base font-extrabold text-white">{totalNotesCount} annotations</div>
                </div>
              </div>

              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-green-500/10 border border-green-500/20">
                  <BookOpenCheck className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono">Indexed Pages</div>
                  <div className="text-base font-extrabold text-white">{pages.length} parsed</div>
                </div>
              </div>

              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20">
                  <Palette className="w-4 h-4 text-pink-400" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono">Active Color Keys</div>
                  <div className="text-base font-extrabold text-white">4 custom keys</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Annotation Management Panel */}
          <div className="space-y-6 xl:col-span-1">
            
            {/* 1. Comment editor card */}
            <AnimatePresence>
              {activeNoteId && (() => {
                const noteItem = annotations.find(ann => ann.id === activeNoteId);
                if (!noteItem) return null;
                return (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="z-30"
                  >
                    <GlassCard className="p-5 border-brand-cyan/30 bg-brand-cyan/5 space-y-4 shadow-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs font-bold text-white uppercase tracking-widest">
                          <StickyNote className="w-4 h-4 text-brand-cyan" />
                          <span>Pin Composer</span>
                        </div>
                        <button 
                          onClick={() => setActiveNoteId(null)} 
                          className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Content text */}
                      <textarea
                        value={noteDraftText}
                        onChange={(e) => setNoteDraftText(e.target.value)}
                        placeholder="Type comments, study tags, or references here..."
                        className="w-full h-28 bg-black/40 border border-white/10 focus:border-brand-cyan/40 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none transition-all resize-none leading-relaxed"
                      />

                      {/* Pick color label */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">Pin Accent Color:</span>
                        <div className="flex items-center space-x-1.5">
                          {noteColors.map((color) => (
                            <button
                              key={color.name}
                              onClick={() => {
                                const updated = annotations.map(ann => {
                                  if (ann.id === activeNoteId) return { ...ann, color: color.hex };
                                  return ann;
                                });
                                setAnnotations(updated);
                                saveAnnotations(updated);
                              }}
                              className={`w-4.5 h-4.5 rounded-full border border-white/20 hover:scale-110 transition-all ${
                                noteItem.color === color.hex ? 'ring-2 ring-white scale-110' : ''
                              }`}
                              style={{ backgroundColor: color.hex }}
                              title={color.name}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Editor control buttons */}
                      <div className="flex items-center justify-between pt-2 border-t border-white/5 gap-2">
                        <button
                          onClick={() => handleDeleteAnnotation(activeNoteId)}
                          className="flex-1 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold flex items-center justify-center space-x-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                        <button
                          onClick={() => handleSaveNoteText(activeNoteId, noteDraftText)}
                          className="flex-1 py-2 rounded-lg bg-brand-cyan hover:bg-cyan-400 text-black text-xs font-bold flex items-center justify-center space-x-1"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Note</span>
                        </button>
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })()}
            </AnimatePresence>

            {/* 2. Primary Annotation & Synthesis Side Panel */}
            <GlassCard className="p-5 flex flex-col min-h-[480px]">
              
              {/* Header Tab selectors */}
              <div className="pb-3 border-b border-white/5 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-1.5">
                    <Palette className="w-4 h-4 text-brand-purple" />
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Notebook Workspace</h4>
                  </div>
                </div>

                {/* Sub tab selectors */}
                <div className="grid grid-cols-4 bg-black/40 p-1 rounded-xl border border-white/5 text-[10px]">
                  <button
                    onClick={() => setSidebarTab('all')}
                    className={`py-1.5 rounded-lg font-bold transition-all ${
                      sidebarTab === 'all' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setSidebarTab('highlights')}
                    className={`py-1.5 rounded-lg font-bold transition-all ${
                      sidebarTab === 'highlights' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Highlights
                  </button>
                  <button
                    onClick={() => setSidebarTab('notes')}
                    className={`py-1.5 rounded-lg font-bold transition-all ${
                      sidebarTab === 'notes' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Pins
                  </button>
                  <button
                    onClick={() => setSidebarTab('synthesis')}
                    className={`py-1.5 rounded-lg font-bold transition-all ${
                      sidebarTab === 'synthesis' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    AI Synthesis
                  </button>
                </div>
              </div>

              {/* Sub tab conditional renders */}
              {sidebarTab !== 'synthesis' ? (
                <>
                  {/* Search query field */}
                  <div className="relative mb-3">
                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search notes & highlights..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-black/30 border border-white/5 focus:border-brand-purple/30 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none transition-all"
                    />
                  </div>

                  {/* Highlights Color Category quick filters */}
                  {sidebarTab === 'highlights' && (
                    <div className="flex flex-wrap items-center gap-1.5 mb-4 p-2 bg-white/[0.01] border border-white/5 rounded-xl">
                      <div className="text-[8px] font-extrabold text-gray-500 uppercase tracking-widest font-mono mr-1">Filter Key:</div>
                      <button
                        onClick={() => setColorFilter(null)}
                        className={`px-2 py-0.5 rounded text-[8px] font-bold transition-all border ${
                          colorFilter === null 
                            ? 'bg-white/15 text-white border-white/10' 
                            : 'bg-transparent text-gray-500 border-transparent hover:text-gray-300'
                        }`}
                      >
                        All
                      </button>
                      {highlightColors.map(color => (
                        <button
                          key={color.name}
                          onClick={() => setColorFilter(color.color)}
                          className={`px-2 py-0.5 rounded text-[8px] font-bold transition-all border ${
                            colorFilter === color.color 
                              ? 'bg-white/10 text-white border-white/10' 
                              : 'opacity-50 hover:opacity-100 border-transparent'
                          }`}
                          style={{ color: color.color }}
                        >
                          {color.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Notebook feed entries list scroll viewport */}
                  <div className="flex-1 overflow-y-auto space-y-3 max-h-[360px] pr-1 scrollbar-thin">
                    {filteredAnnotations.map((ann) => {
                      const isHighlight = ann.type === 'highlight';
                      const highlightColor = isHighlight ? highlightColors.find(c => c.color === ann.color) : undefined;
                      const noteColor = !isHighlight ? noteColors.find(c => c.hex === ann.color) : undefined;

                      const displayColor = isHighlight ? ann.color : (noteColor?.hex || '#f59e0b');
                      const displayName = isHighlight ? (highlightColor?.name || 'Highlight') : 'Pin Comment';

                      return (
                        <div
                          key={ann.id}
                          onClick={() => {
                            setCurrentPageNum(ann.page);
                            if (ann.type === 'note') {
                              setActiveNoteId(ann.id);
                              setNoteDraftText(ann.noteText || '');
                            }
                          }}
                          className="p-3 bg-white/[0.01] hover:bg-white/[0.04] border border-white/5 hover:border-brand-purple/20 rounded-xl cursor-pointer transition-all space-y-2 text-left"
                        >
                          {/* Header info bar */}
                          <div className="flex items-center justify-between text-[9px]">
                            <span 
                              className="px-2 py-0.5 rounded font-extrabold uppercase tracking-widest border"
                              style={{ 
                                color: displayColor, 
                                borderColor: `${displayColor}25`,
                                backgroundColor: `${displayColor}08`
                              }}
                            >
                              {displayName}
                            </span>
                            <div className="flex items-center space-x-1.5 text-gray-500 font-bold font-mono">
                              <span>PAGE {ann.page}</span>
                              <span>•</span>
                              <button
                                onClick={(e) => handleDeleteAnnotation(ann.id, e)}
                                className="p-0.5 rounded hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
                                title="Delete annotation"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Body annotation content */}
                          {isHighlight ? (
                            <p 
                              className="text-xs text-white font-medium italic line-clamp-3 leading-relaxed border-l-2 pl-2"
                              style={{ borderLeftColor: ann.color }}
                            >
                              "{ann.text}"
                            </p>
                          ) : (
                            <p className="text-xs text-gray-300 font-normal line-clamp-3 leading-relaxed font-sans">
                              {ann.noteText || <span className="text-gray-600 italic">Empty comment...</span>}
                            </p>
                          )}

                          <div className="flex justify-between items-center text-[8px] text-gray-600 font-bold uppercase tracking-wider">
                            <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                            {isHighlight && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(ann.text || '', ann.id);
                                }}
                                className="text-gray-500 hover:text-white flex items-center space-x-0.5"
                              >
                                {copySuccess === ann.id ? (
                                  <span className="text-green-400 font-mono">Copied!</span>
                                ) : (
                                  <>
                                    <Copy className="w-2.5 h-2.5" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {filteredAnnotations.length === 0 && (
                      <div className="text-center py-16 text-gray-600 space-y-2">
                        <Palette className="w-8 h-8 text-neutral-800 mx-auto" />
                        <p className="text-xs font-semibold text-gray-500">No matching entries</p>
                        <p className="text-[10px] text-gray-600 leading-normal font-normal">
                          Adjust filters or switch modes to add highlights or pins.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Gemini AI Synthesis guide tab view */
                <div className="flex-1 flex flex-col space-y-4">
                  {isSynthesizing ? (
                    <div className="flex-1 py-16 flex flex-col items-center justify-center space-y-3 text-center">
                      <div className="w-12 h-12 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-brand-cyan animate-pulse" />
                      </div>
                      <p className="text-xs font-bold text-white">Gemini Study Synthesis Active...</p>
                      <p className="text-[10px] text-gray-400 leading-relaxed max-w-[180px] mx-auto">
                        Weaving all highlighted document passages into a coherent thematic summary guide...
                      </p>
                    </div>
                  ) : synthesisText ? (
                    <div className="flex-1 flex flex-col space-y-3">
                      <div className="flex items-center justify-between p-2 bg-white/[0.02] border border-white/5 rounded-xl">
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest font-mono">MD Guide Output</span>
                        
                        {/* Download & Copy actions */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => copyToClipboard(synthesisText, 'synthesis_copy')}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                            title="Copy Markdown"
                          >
                            {copySuccess === 'synthesis_copy' ? (
                              <Check className="w-3.5 h-3.5 text-green-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={downloadSynthesis}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                            title="Download Markdown"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Synthesis view content scroll */}
                      <div className="flex-1 overflow-y-auto max-h-[300px] bg-black/30 border border-white/5 rounded-2xl p-4 text-xs leading-relaxed text-gray-300 font-sans text-left">
                        <div className="markdown-body">
                          <Markdown>{synthesisText}</Markdown>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 py-12 flex flex-col items-center justify-center space-y-4 text-center">
                      <Sparkles className="w-10 h-10 text-brand-cyan/30 animate-pulse" />
                      <div>
                        <h5 className="text-xs font-bold text-white mb-1">Generate AI Synthesis Guide</h5>
                        <p className="text-[10px] text-gray-500 max-w-[200px] leading-normal mx-auto font-normal">
                          Compile all key concepts highlighted across the entire document into an organized study manual.
                        </p>
                      </div>
                      <button
                        onClick={handleSynthesizeHighlights}
                        disabled={totalHighlightsCount === 0}
                        className="px-4 py-2 bg-gradient-to-tr from-brand-purple to-brand-cyan text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-purple/20 disabled:opacity-20 disabled:pointer-events-none transition-all"
                      >
                        Synthesize Now ({totalHighlightsCount} highlights)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </GlassCard>
          </div>
        </>
      )}
    </div>
  );
};

export default DocumentViewer;
