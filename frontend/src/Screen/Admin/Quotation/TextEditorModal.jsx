import { useEffect, useState, useRef, useMemo } from "react";
import { X, ChevronDown, FileText } from "lucide-react";
import { EditorContent, useEditor } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import "../../../assets/css/TiptapEditor.css";

// --- CUSTOM EXTENSIONS (SAME AS CONTRACT.JSX) ---

const FontSize = Extension.create({
  name: "fontSize",
  addOptions() {
    return { types: ["textStyle"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: (fontSize) => ({ chain }) => {
        return chain()
          .setMark("textStyle", { fontSize: fontSize.includes("px") ? fontSize : `${fontSize}px` })
          .run();
      },
    };
  },
});

const FontFamily = Extension.create({
  name: "fontFamily",
  addOptions() {
    return { types: ["textStyle"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontFamily: {
            default: null,
            parseHTML: (element) => element.style.fontFamily?.replace(/['"]/g, ""),
            renderHTML: (attributes) => {
              if (!attributes.fontFamily) return {};
              return { style: `font-family: ${attributes.fontFamily}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontFamily: (fontFamily) => ({ chain }) => {
        return chain().setMark("textStyle", { fontFamily }).run();
      },
    };
  },
});

// --- HELPER COMPONENTS (SAME AS CONTRACT.JSX) ---

const Group = ({ children }) => (
  <div className="flex items-center gap-1 px-2 border-r border-gray-200 last:border-0">
    {children}
  </div>
);

const ToolbarBtn = ({ onClick, active, children, title, disabled, className = "" }) => (
  <button
    type="button"
    onMouseDown={(e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) onClick();
    }}
    title={title}
    disabled={disabled}
    className={`h-8 w-8 flex items-center justify-center rounded cursor-pointer transition-all duration-200 ${active
      ? 'bg-indigo-100 text-indigo-700 shadow-sm border border-indigo-200'
      : 'text-gray-700 hover:bg-gray-200 hover:text-black'
      } ${disabled ? 'opacity-20 cursor-not-allowed' : ''} ${className}`}
  >
    {children}
  </button>
);

const Toolbar = ({ editor }) => {
  const [, setUpdate] = useState(0);
  const fontRef = useRef(null);
  const headingRef = useRef(null);
  const sizeRef = useRef(null);
  const listRef = useRef(null);
  const bulletRef = useRef(null);

  useEffect(() => {
    if (!editor) return;
    const handler = () => setUpdate((s) => s + 1);
    editor.on("transaction", handler);
    editor.on("selectionUpdate", handler);
    return () => {
      editor.off("transaction", handler);
      editor.off("selectionUpdate", handler);
    };
  }, [editor]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (fontRef.current && !fontRef.current.contains(event.target)) setShowFontFamilyDropdown(false);
      if (headingRef.current && !headingRef.current.contains(event.target)) setShowHeadingDropdown(false);
      if (sizeRef.current && !sizeRef.current.contains(event.target)) setShowFontSizeDropdown(false);
      if (listRef.current && !listRef.current.contains(event.target)) setShowListTypeDropdown(false);
      if (bulletRef.current && !bulletRef.current.contains(event.target)) setShowBulletTypeDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!editor) return null;

  const [showFontSizeDropdown, setShowFontSizeDropdown] = useState(false);
  const [showHeadingDropdown, setShowHeadingDropdown] = useState(false);
  const [showFontFamilyDropdown, setShowFontFamilyDropdown] = useState(false);
  const [showListTypeDropdown, setShowListTypeDropdown] = useState(false);
  const [showBulletTypeDropdown, setShowBulletTypeDropdown] = useState(false);

  const getCurrentHeading = () => {
    if (editor.isActive('heading', { level: 1 })) return 'H1';
    if (editor.isActive('heading', { level: 2 })) return 'H2';
    if (editor.isActive('heading', { level: 3 })) return 'H3';
    return 'Text';
  };

  const fonts = [
    { label: 'Inter', value: 'Inter, sans-serif' },
    { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
    { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
    { label: 'Courier New', value: '"Courier New", Courier, monospace' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
    { label: 'Trebuchet MS', value: '"Trebuchet MS", Helvetica, sans-serif' },
    { label: 'Tahoma', value: 'Tahoma, Geneva, sans-serif' },
    { label: 'Impact', value: 'Impact, Charcoal, sans-serif' },
    { label: 'Comic Sans MS', value: '"Comic Sans MS", "Comic Sans", cursive' },
    { label: 'Garamond', value: 'Garamond, serif' },
    { label: 'Palatino', value: '"Palatino Linotype", "Book Antiqua", Palatino, serif' },
  ];

  return (
    <div className="bg-[#fcfcfc] border-b border-gray-300 p-2.5 sticky top-0 z-[100] flex flex-wrap items-center gap-1.5 rounded-t-xl shadow-md pointer-events-auto min-h-[50px]">
      {/* Undo/Redo Group */}
      <Group>
        <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" /></svg>
        </ToolbarBtn>
      </Group>

      {/* Font/Heading Control */}
      <Group>
        <div className="relative" ref={fontRef}>
          <button
            type="button"
            onClick={() => setShowFontFamilyDropdown(!showFontFamilyDropdown)}
            className="h-7 px-2 text-[11px] font-medium border border-gray-200 hover:border-indigo-400 rounded flex items-center gap-1 min-w-[90px] bg-white truncate shadow-sm transition-all"
          >
            {fonts.find(f => f.value === editor.getAttributes('textStyle').fontFamily)?.label || 'Font'}
            <ChevronDown size={10} className="ml-auto" />
          </button>
          {showFontFamilyDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-xl z-50 py-1 min-w-[160px] max-h-64 overflow-y-auto">
              {fonts.map(font => (
                <button
                  key={font.value}
                  onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setFontFamily(font.value).run(); setShowFontFamilyDropdown(false); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-indigo-50 text-xs text-gray-700 transition-colors"
                  style={{ fontFamily: font.value }}
                >
                  {font.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative mx-1" ref={headingRef}>
          <button
            type="button"
            onClick={() => setShowHeadingDropdown(!showHeadingDropdown)}
            className="h-7 px-2 text-[11px] font-bold border border-gray-200 hover:border-indigo-400 rounded flex items-center gap-1 min-w-[50px] bg-white shadow-sm transition-all"
          >
            {getCurrentHeading()}
            <ChevronDown size={10} className="ml-auto" />
          </button>
          {showHeadingDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-xl z-50 py-1 min-w-[130px]">
              <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setParagraph().run(); setShowHeadingDropdown(false); }} className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-xs text-gray-700">Paragraph</button>
              <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 1 }).run(); setShowHeadingDropdown(false); }} className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-xs text-black font-extrabold">Heading 1</button>
              <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run(); setShowHeadingDropdown(false); }} className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-xs text-black font-bold">Heading 2</button>
              <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 3 }).run(); setShowHeadingDropdown(false); }} className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-xs text-black font-semibold">Heading 3</button>
            </div>
          )}
        </div>

        <div className="relative mx-1" ref={sizeRef}>
          <button
            type="button"
            onClick={() => setShowFontSizeDropdown(!showFontSizeDropdown)}
            className="h-7 px-1.5 text-[11px] border border-gray-200 hover:border-indigo-400 rounded flex items-center gap-1 min-w-[40px] bg-white shadow-sm transition-all"
          >
            {editor.getAttributes('textStyle').fontSize?.replace('px', '') || '16'}
            <ChevronDown size={10} className="ml-auto" />
          </button>
          {showFontSizeDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-xl z-50 py-1 max-h-60 overflow-y-auto min-w-[60px]">
              {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 30, 32, 36, 40, 48, 60, 72, 96].map(size => (
                <button
                  key={size}
                  onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setFontSize(`${size}px`).run(); setShowFontSizeDropdown(false); }}
                  className="w-full text-center px-1 py-1.5 hover:bg-indigo-50 text-[11px] text-gray-700"
                >
                  {size}
                </button>
              ))}
            </div>
          )}
        </div>
      </Group>

      {/* Formatting Group */}
      <Group>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
          <span className="font-bold text-sm">B</span>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
          <span className="italic text-sm">I</span>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline">
          <span className="underline text-sm">U</span>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
          <span className="line-through text-sm">S</span>
        </ToolbarBtn>
      </Group>

      {/* Alignment Group */}
      <Group>
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align Left">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h10M4 18h16" /></svg>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align Center">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M7 12h10M4 18h16" /></svg>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align Right">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M10 12h10M4 18h16" /></svg>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Justify">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
        </ToolbarBtn>
      </Group>

      {/* Lists Group */}
      <Group>
        <div className="relative flex items-center" ref={bulletRef}>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16M4 6h.01M4 12h.01M4 18h.01" /></svg>
          </ToolbarBtn>
          {(editor.isActive('bulletList')) && (
            <button
              onMouseDown={(e) => { e.preventDefault(); setShowBulletTypeDropdown(!showBulletTypeDropdown); }}
              className="h-7 px-1 hover:bg-gray-100 rounded flex items-center"
            >
              <ChevronDown size={10} />
            </button>
          )}
          {showBulletTypeDropdown && editor.isActive('bulletList') && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-xl z-50 py-1 min-w-[100px]">
              <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().updateAttributes('bulletList', { listStyleType: 'disc' }).run(); setShowBulletTypeDropdown(false); }} className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-xs text-gray-700">● Dot</button>
              <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().updateAttributes('bulletList', { listStyleType: 'circle' }).run(); setShowBulletTypeDropdown(false); }} className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-xs text-gray-700">○ Circle</button>
              <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().updateAttributes('bulletList', { listStyleType: 'square' }).run(); setShowBulletTypeDropdown(false); }} className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-xs text-gray-700">■ Square</button>
            </div>
          )}
        </div>

        <div className="relative flex items-center" ref={listRef}>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered List">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 6h13M7 12h13M7 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
          </ToolbarBtn>
          {(editor.isActive('orderedList')) && (
            <button
              onMouseDown={(e) => { e.preventDefault(); setShowListTypeDropdown(!showListTypeDropdown); }}
              className="h-7 px-1 hover:bg-gray-100 rounded flex items-center"
            >
              <ChevronDown size={10} />
            </button>
          )}
          {showListTypeDropdown && editor.isActive('orderedList') && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-xl z-50 py-1 min-w-[100px]">
              <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().updateAttributes('orderedList', { listStyleType: 'decimal' }).run(); setShowListTypeDropdown(false); }} className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-xs text-gray-700">1. Decimal</button>
              <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().updateAttributes('orderedList', { listStyleType: 'lower-alpha' }).run(); setShowListTypeDropdown(false); }} className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-xs text-gray-700">a. Lower Alpha</button>
              <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().updateAttributes('orderedList', { listStyleType: 'upper-alpha' }).run(); setShowListTypeDropdown(false); }} className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-xs text-gray-700">A. Upper Alpha</button>
              <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().updateAttributes('orderedList', { listStyleType: 'lower-roman' }).run(); setShowListTypeDropdown(false); }} className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-xs text-gray-700">i. Lower Roman</button>
              <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().updateAttributes('orderedList', { listStyleType: 'upper-roman' }).run(); setShowListTypeDropdown(false); }} className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-xs text-gray-700">I. Upper Roman</button>
            </div>
          )}
        </div>
      </Group>

      {/* Table Management */}
      <Group>
        <ToolbarBtn onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} active={editor.isActive('table')} title="New Table">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        </ToolbarBtn>

        {editor.isActive('table') && (
          <div className="flex bg-indigo-50 items-center h-full px-1 border-l border-indigo-200">
            <ToolbarBtn onClick={() => editor.chain().focus().addRowBefore().run()} title="Add Row Above" className="text-zinc-600"><span className="text-[9px] font-extrabold">+R↑</span></ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().addRowAfter().run()} title="Add Row Below" className="text-zinc-600"><span className="text-[9px] font-extrabold">+R↓</span></ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().addColumnBefore().run()} title="Add Column Left" className="text-zinc-600"><span className="text-[9px] font-extrabold">+C←</span></ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().addColumnAfter().run()} title="Add Column Right" className="text-zinc-600"><span className="text-[9px] font-extrabold">+C→</span></ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().deleteRow().run()} title="Delete Row" className="text-red-500 hover:bg-red-50"><span className="text-[9px] font-extrabold text-red-600">-R</span></ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().deleteColumn().run()} title="Delete Column" className="text-red-500 hover:bg-red-50"><span className="text-[9px] font-extrabold text-red-600">-C</span></ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().deleteTable().run()} title="Delete Entire Table" className="text-red-600 hover:bg-red-100"><span className="text-[9px] font-extrabold">DEL</span></ToolbarBtn>
          </div>
        )}
      </Group>

      {/* Clear Formatting */}
      <Group>
        <ToolbarBtn onClick={() => editor.chain().focus().unsetAllMarks().run()} title="Clear Formatting">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        </ToolbarBtn>
      </Group>
    </div>
  );
};

export default function TextEditorModal({
  open,
  onClose,
  initialContent = "",
  onSave,
  initialHeading = "",
  sectionId = null,
}) {
  const [heading, setHeading] = useState(initialHeading);

  // --- EDITOR SETUP ---
  const extensions = useMemo(() => [
    StarterKit,
    Underline,
    TextStyle,
    Color,
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    BulletList.extend({
      addAttributes() {
        return {
          listStyleType: {
            default: 'disc',
            parseHTML: (element) => element.style.listStyleType || 'disc',
            renderHTML: (attributes) => ({ style: `list-style-type: ${attributes.listStyleType}` }),
          },
        };
      },
    }),
    OrderedList.extend({
      addAttributes() {
        return {
          listStyleType: {
            default: 'decimal',
            parseHTML: (element) => element.style.listStyleType || 'decimal',
            renderHTML: (attributes) => ({ style: `list-style-type: ${attributes.listStyleType}` }),
          },
        };
      },
    }),
    Table.configure({
      resizable: true,
      HTMLAttributes: { class: "agreement-table" },
    }),
    TableRow,
    TableHeader,
    TableCell,
    FontSize,
    FontFamily,
  ], []);

  const editor = useEditor({
    extensions,
    content: initialContent,
    onUpdate: ({ editor }) => {
      // Handled during save
    },
  });

  useEffect(() => {
    if (editor && open) {
      editor.commands.setContent(initialContent || "");
      setHeading(initialHeading || "");
    }
  }, [open, editor, initialContent, initialHeading]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [open]);

  if (!open) return null;

  const saveHandler = () => {
    if (editor) {
      const htmlContent = editor.getHTML();
      // Only call onSave with the new content; parent handles the database save
      onSave(htmlContent, heading);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-[1250px] bg-white rounded-xl shadow-2xl flex flex-col h-[95vh] border border-gray-200 overflow-hidden">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-[#0d6b35] to-[#7a8f3d] px-6 flex justify-between items-center h-[55px] shadow-md relative z-20 overflow-hidden">
          <div className="flex items-center gap-2 text-white">
            <FileText className="w-5 h-5" />
            <h3 className="font-semibold text-lg">Terms & Conditions Editor</h3>
          </div>
          <div className="flex items-center gap-2 h-full py-2.5">
            <button
              onClick={onClose}
              className="h-full px-6 bg-red-500 text-white hover:bg-red-600 rounded-lg text-xs font-bold transition-all shadow-lg flex items-center justify-center min-w-[100px]"
            >
              CANCEL
            </button>
            <button
              onClick={saveHandler}
              disabled={!editor}
              className="h-full px-6 bg-white text-[#0d6b35] hover:bg-gray-100 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center min-w-[100px]"
            >
              SAVE
            </button>
          </div>
        </div>

        {/* TOP CONTROLS (Heading Input) */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 px-1">
              Section Heading
            </label>
            <input
              value={heading}
              onChange={(e) => setHeading(e.target.value)}
              placeholder="e.g. Terms of Service, Payment Policy, etc."
              className="w-full border border-gray-300 px-4 py-2.5 rounded-lg text-sm focus:border-[#129046] focus:ring-2 focus:ring-[#129046]/20 focus:outline-none transition-all shadow-sm bg-white"
            />
          </div>
        </div>

        {/* TOOLBAR & EDITOR AREA (GOOGLE DOCS STYLE) */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <Toolbar editor={editor} />
          <div className="editor-page-container bg-[#e5e7eb] py-8 px-6 flex justify-center overflow-y-auto max-h-full shadow-inner relative z-10 flex-1">
            <div className="w-full max-w-[1150px] pointer-events-auto">
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}