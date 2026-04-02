import { forwardRef, useImperativeHandle, useState, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Quote, Undo2, Redo2,
  Link as LinkIcon, Unlink,
  AlignLeft, AlignCenter, AlignRight,
  Heading1, Heading2,
  Minus,
} from 'lucide-react'

export interface RichEmailEditorRef {
  setContent: (html: string) => void
  getContent: () => string
  isEmpty: () => boolean
  /** Insert raw text/HTML at the current cursor position */
  insertAtCursor: (text: string) => void
  /** Focus the editor */
  focus: () => void
}

interface Props {
  onChange: (html: string) => void
  placeholder?: string
  /** Min height CSS value for the editor canvas */
  minHeight?: string
}

const TB = 'w-7 h-7 rounded flex items-center justify-center transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed'
const TB_ACTIVE = 'bg-indigo-100 text-indigo-700'
const TB_IDLE = 'text-slate-500'

export const RichEmailEditor = forwardRef<RichEmailEditorRef, Props>(
  ({ onChange, placeholder = 'Start writing your email...', minHeight = '280px' }, ref) => {

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-sky-600 underline cursor-pointer' },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
    ],
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    editorProps: {
      attributes: {
        class: `rich-email-body focus:outline-none text-sm text-slate-700 leading-relaxed`,
        style: `min-height:${minHeight}`,
        spellcheck: 'true',
      },
    },
  })

  useImperativeHandle(ref, () => ({
    setContent: (html: string) => {
      if (!editor) return
      editor.commands.setContent(html || '', { emitUpdate: true })
    },
    getContent: () => editor?.getHTML() ?? '',
    isEmpty: () => editor?.isEmpty ?? true,
    insertAtCursor: (text: string) => {
      if (!editor) return
      editor.chain().focus().insertContent(text).run()
    },
    focus: () => { editor?.commands.focus() },
  }), [editor])

  // ── Link prompt ─────────────────────────────────────────────────────────────
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  const toggleLink = useCallback(() => {
    if (!editor) return
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run()
      return
    }
    const prev = editor.getAttributes('link').href ?? ''
    setLinkUrl(prev)
    setShowLinkInput(true)
  }, [editor])

  const applyLink = useCallback(() => {
    if (!editor) return
    if (linkUrl.trim()) {
      const url = linkUrl.match(/^https?:\/\//) ? linkUrl : `https://${linkUrl}`
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    } else {
      editor.chain().focus().unsetLink().run()
    }
    setShowLinkInput(false)
    setLinkUrl('')
  }, [editor, linkUrl])

  if (!editor) return null

  const btn = (active: boolean) => `${TB} ${active ? TB_ACTIVE : TB_IDLE}`

  return (
    <>
      <style>{`
        .rich-email-body p            { margin: 0 0 0.55em; }
        .rich-email-body p:last-child { margin-bottom: 0; }
        .rich-email-body ul, .rich-email-body ol { padding-left: 1.4em; margin: 0 0 0.55em; }
        .rich-email-body li           { margin-bottom: 0.2em; }
        .rich-email-body ul li        { list-style-type: disc; }
        .rich-email-body ol li        { list-style-type: decimal; }
        .rich-email-body strong       { font-weight: 600; }
        .rich-email-body em           { font-style: italic; }
        .rich-email-body u            { text-decoration: underline; }
        .rich-email-body s            { text-decoration: line-through; }
        .rich-email-body h1           { font-size: 1.4em; font-weight: 700; margin: 0.3em 0 0.4em; }
        .rich-email-body h2           { font-size: 1.15em; font-weight: 700; margin: 0.2em 0 0.4em; }
        .rich-email-body a            { color: #0284c7; text-decoration: underline; }
        .rich-email-body blockquote   { border-left: 3px solid #cbd5e1; padding-left: 0.8em; color: #64748b; margin: 0 0 0.55em; }
        .rich-email-body img          { max-width: 100%; height: auto; }
        .rich-email-body code         { background: #f1f5f9; padding: 0.1em 0.35em; border-radius: 3px; font-size: 0.85em; font-family: monospace; }
        .rich-email-body pre          { background: #f1f5f9; border-radius: 6px; padding: 0.75em 1em; overflow-x: auto; margin: 0 0 0.55em; }
        .rich-email-body pre code     { background: none; padding: 0; }
        .rich-email-body hr           { border: none; border-top: 1px solid #e2e8f0; margin: 1em 0; }
        .rich-email-body .is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #94a3b8;
          pointer-events: none;
          height: 0;
          font-style: italic;
        }
      `}</style>

      <div className="rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 transition-all overflow-hidden bg-white">

        {/* Toolbar */}
        <div className="flex items-center gap-0.5 px-2.5 py-1.5 border-b border-slate-100 bg-slate-50/80 flex-wrap">

          {/* Headings */}
          <button type="button" title="Heading 1"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={btn(editor.isActive('heading', { level: 1 }))}>
            <Heading1 size={13} />
          </button>
          <button type="button" title="Heading 2"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={btn(editor.isActive('heading', { level: 2 }))}>
            <Heading2 size={13} />
          </button>

          <div className="w-px h-4 bg-slate-200 mx-0.5" />

          {/* Text formatting */}
          <button type="button" title="Bold (Ctrl+B)"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={btn(editor.isActive('bold'))}>
            <Bold size={13} />
          </button>
          <button type="button" title="Italic (Ctrl+I)"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={btn(editor.isActive('italic'))}>
            <Italic size={13} />
          </button>
          <button type="button" title="Underline (Ctrl+U)"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={btn(editor.isActive('underline'))}>
            <UnderlineIcon size={13} />
          </button>
          <button type="button" title="Strikethrough"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={btn(editor.isActive('strike'))}>
            <Strikethrough size={13} />
          </button>

          <div className="w-px h-4 bg-slate-200 mx-0.5" />

          {/* Lists */}
          <button type="button" title="Bullet list"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={btn(editor.isActive('bulletList'))}>
            <List size={13} />
          </button>
          <button type="button" title="Numbered list"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={btn(editor.isActive('orderedList'))}>
            <ListOrdered size={13} />
          </button>
          <button type="button" title="Blockquote"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={btn(editor.isActive('blockquote'))}>
            <Quote size={13} />
          </button>

          <div className="w-px h-4 bg-slate-200 mx-0.5" />

          {/* Alignment */}
          <button type="button" title="Align left"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={btn(editor.isActive({ textAlign: 'left' }))}>
            <AlignLeft size={13} />
          </button>
          <button type="button" title="Align center"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={btn(editor.isActive({ textAlign: 'center' }))}>
            <AlignCenter size={13} />
          </button>
          <button type="button" title="Align right"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={btn(editor.isActive({ textAlign: 'right' }))}>
            <AlignRight size={13} />
          </button>

          <div className="w-px h-4 bg-slate-200 mx-0.5" />

          {/* Link */}
          <button type="button" title={editor.isActive('link') ? 'Remove link' : 'Add link'}
            onClick={toggleLink}
            className={btn(editor.isActive('link'))}>
            {editor.isActive('link') ? <Unlink size={13} /> : <LinkIcon size={13} />}
          </button>

          {/* Horizontal rule */}
          <button type="button" title="Horizontal line"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className={`${TB} ${TB_IDLE}`}>
            <Minus size={13} />
          </button>

          <div className="flex-1" />

          {/* Undo / Redo */}
          <button type="button" title="Undo (Ctrl+Z)"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className={`${TB} ${TB_IDLE}`}>
            <Undo2 size={13} />
          </button>
          <button type="button" title="Redo (Ctrl+Y)"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className={`${TB} ${TB_IDLE}`}>
            <Redo2 size={13} />
          </button>
        </div>

        {/* Inline link input */}
        {showLinkInput && (
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-sky-50/50">
            <LinkIcon size={12} className="text-sky-500 flex-shrink-0" />
            <input
              autoFocus
              className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200"
              placeholder="https://example.com"
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyLink() } if (e.key === 'Escape') setShowLinkInput(false) }}
            />
            <button type="button" onClick={applyLink}
              className="text-[11px] font-semibold text-white bg-sky-500 hover:bg-sky-600 px-3 py-1.5 rounded-lg transition-colors">
              Apply
            </button>
            <button type="button" onClick={() => setShowLinkInput(false)}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 px-2 py-1.5 rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        )}

        {/* Editor canvas */}
        <EditorContent editor={editor} className="px-4 py-3" />
      </div>
    </>
  )
})

RichEmailEditor.displayName = 'RichEmailEditor'
