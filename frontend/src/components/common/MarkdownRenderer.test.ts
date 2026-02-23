import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MarkdownRenderer from './MarkdownRenderer.vue'

describe('MarkdownRenderer', () => {
  // Helper to get rendered HTML content
  const renderMarkdown = (content: string) => {
    const wrapper = mount(MarkdownRenderer, {
      props: { content }
    })
    return wrapper.find('.markdown-content').html()
  }

  describe('Basic rendering', () => {
    it('renders empty string when content is empty', () => {
      const wrapper = mount(MarkdownRenderer, {
        props: { content: '' }
      })
      expect(wrapper.find('.markdown-content').text()).toBe('')
    })

    it('renders plain text', () => {
      const html = renderMarkdown('Hello World')
      expect(html).toContain('Hello World')
    })
  })

  describe('Bold text', () => {
    it('renders **bold** with double asterisks', () => {
      const html = renderMarkdown('This is **bold** text')
      expect(html).toContain('<strong>bold</strong>')
    })

    it('renders __bold__ with double underscores', () => {
      const html = renderMarkdown('This is __bold__ text')
      expect(html).toContain('<strong>bold</strong>')
    })
  })

  describe('Italic text', () => {
    it('renders *italic* with single asterisk', () => {
      const html = renderMarkdown('This is *italic* text')
      expect(html).toContain('<em>italic</em>')
    })

    it('renders _italic_ with single underscore', () => {
      const html = renderMarkdown('This is _italic_ text')
      expect(html).toContain('<em>italic</em>')
    })
  })

  describe('Combined formatting', () => {
    it('renders ***bold and italic*** together', () => {
      const html = renderMarkdown('This is ***bold and italic*** text')
      expect(html).toMatch(/<(strong|em)>.*<(strong|em)>bold and italic<\/(strong|em)>.*<\/(strong|em)>/)
    })
  })

  describe('Line breaks', () => {
    it('renders single line break as <br>', () => {
      const html = renderMarkdown('Line 1\nLine 2')
      expect(html).toContain('<br>')
    })

    it('renders multiple line breaks', () => {
      const html = renderMarkdown('Line 1\nLine 2\nLine 3')
      expect(html).toContain('Line 1')
      expect(html).toContain('Line 2')
      expect(html).toContain('Line 3')
    })
  })

  describe('Paragraphs', () => {
    it('renders paragraphs with double newlines', () => {
      const html = renderMarkdown('Paragraph 1\n\nParagraph 2')
      expect(html).toContain('<p>')
    })
  })

  describe('Links', () => {
    it('renders markdown links', () => {
      const html = renderMarkdown('[Click here](https://example.com)')
      expect(html).toContain('<a href="https://example.com"')
      expect(html).toContain('Click here</a>')
    })

    it('sanitizes javascript: links', () => {
      const html = renderMarkdown('[Evil](javascript:alert("xss"))')
      expect(html).not.toContain('javascript:')
    })
  })

  describe('Lists', () => {
    it('renders unordered lists with dashes', () => {
      const html = renderMarkdown('- Item 1\n- Item 2\n- Item 3')
      expect(html).toContain('<ul>')
      expect(html).toContain('<li>')
      expect(html).toContain('Item 1')
      expect(html).toContain('Item 2')
      expect(html).toContain('Item 3')
    })

    it('renders unordered lists with asterisks', () => {
      const html = renderMarkdown('* Item 1\n* Item 2')
      expect(html).toContain('<ul>')
      expect(html).toContain('<li>')
    })

    it('renders ordered lists', () => {
      const html = renderMarkdown('1. First\n2. Second\n3. Third')
      expect(html).toContain('<ol>')
      expect(html).toContain('<li>')
      expect(html).toContain('First')
    })
  })

  describe('Headings', () => {
    it('renders h1 headings', () => {
      const html = renderMarkdown('# Heading 1')
      expect(html).toContain('<h1>')
      expect(html).toContain('Heading 1')
    })

    it('renders h2 headings', () => {
      const html = renderMarkdown('## Heading 2')
      expect(html).toContain('<h2>')
    })

    it('renders h3 headings', () => {
      const html = renderMarkdown('### Heading 3')
      expect(html).toContain('<h3>')
    })
  })

  describe('Code', () => {
    it('renders inline code with backticks', () => {
      const html = renderMarkdown('Use `const` for constants')
      expect(html).toContain('<code>')
      expect(html).toContain('const')
    })

    it('renders code blocks with triple backticks', () => {
      const html = renderMarkdown('```\nconst x = 1;\n```')
      expect(html).toContain('<pre>')
      expect(html).toContain('<code>')
    })
  })

  describe('Blockquotes', () => {
    it('renders blockquotes', () => {
      const html = renderMarkdown('> This is a quote')
      expect(html).toContain('<blockquote>')
      expect(html).toContain('This is a quote')
    })
  })

  describe('XSS Prevention (DOMPurify)', () => {
    it('strips script tags', () => {
      const html = renderMarkdown('<script>alert("xss")</script>')
      expect(html).not.toContain('<script>')
      expect(html).not.toContain('alert')
    })

    it('strips onclick attributes', () => {
      const html = renderMarkdown('<a href="#" onclick="alert(1)">Click</a>')
      expect(html).not.toContain('onclick')
    })

    it('strips onerror attributes', () => {
      const html = renderMarkdown('<img src="x" onerror="alert(1)">')
      expect(html).not.toContain('onerror')
    })

    it('strips style tags', () => {
      const html = renderMarkdown('<style>body{display:none}</style>')
      expect(html).not.toContain('<style>')
    })
  })

  describe('Real-world description examples', () => {
    it('renders a typical curriculum description with formatting', () => {
      const content = `This is a **beginner** curriculum for learning *fundamentals*.

Key topics:
- Basic techniques
- Core concepts
- Practice drills

Duration: approximately 1 hour.`
      
      const html = renderMarkdown(content)
      expect(html).toContain('<strong>beginner</strong>')
      expect(html).toContain('<em>fundamentals</em>')
      expect(html).toContain('<ul>')
      expect(html).toContain('Basic techniques')
    })

    it('renders exercise notes with linebreaks', () => {
      const content = `Focus points:
- Keep back straight
- Control breathing

Variations:
Start slow, increase speed gradually.`
      
      const html = renderMarkdown(content)
      expect(html).toContain('Focus points')
      expect(html).toContain('<ul>')
      expect(html).toContain('Keep back straight')
    })
  })
})
