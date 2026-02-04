import { describe, it, expect } from 'vitest'
import {
  sanitizeUrl,
  extractImageUrls,
  stripHtml,
  getIngredientColors,
  getStartingSteps,
  getStartingStepIds,
} from './utils'
import { ValidationError } from './errors'
import type { RecipeStep } from './types'

describe('sanitizeUrl', () => {
  describe('valid URLs', () => {
    it('allows valid HTTP URLs', () => {
      const url = sanitizeUrl('http://example.com/recipe')
      expect(url.href).toBe('http://example.com/recipe')
    })

    it('allows valid HTTPS URLs', () => {
      const url = sanitizeUrl('https://example.com/recipe')
      expect(url.href).toBe('https://example.com/recipe')
    })

    it('allows URLs with paths and query params', () => {
      const url = sanitizeUrl('https://example.com/recipes/pasta?id=123')
      expect(url.pathname).toBe('/recipes/pasta')
      expect(url.searchParams.get('id')).toBe('123')
    })
  })

  describe('invalid URL formats', () => {
    it('rejects invalid URL format', () => {
      expect(() => sanitizeUrl('not-a-url')).toThrow(ValidationError)
      expect(() => sanitizeUrl('not-a-url')).toThrow('Invalid URL format')
    })

    it('rejects empty string', () => {
      expect(() => sanitizeUrl('')).toThrow(ValidationError)
    })
  })

  describe('blocked protocols', () => {
    it('rejects file:// protocol', () => {
      expect(() => sanitizeUrl('file:///etc/passwd')).toThrow(ValidationError)
      expect(() => sanitizeUrl('file:///etc/passwd')).toThrow('Only HTTP and HTTPS')
    })

    it('rejects ftp:// protocol', () => {
      expect(() => sanitizeUrl('ftp://example.com')).toThrow(ValidationError)
    })

    it('rejects javascript: protocol', () => {
      expect(() => sanitizeUrl('javascript:alert(1)')).toThrow(ValidationError)
    })
  })

  describe('blocked localhost', () => {
    it('blocks localhost', () => {
      expect(() => sanitizeUrl('http://localhost/admin')).toThrow(ValidationError)
      expect(() => sanitizeUrl('http://localhost/admin')).toThrow('localhost')
    })

    it('blocks 127.0.0.1', () => {
      expect(() => sanitizeUrl('http://127.0.0.1/admin')).toThrow(ValidationError)
    })

    it('blocks 0.0.0.0', () => {
      expect(() => sanitizeUrl('http://0.0.0.0/')).toThrow(ValidationError)
    })

    it('blocks ::1 (IPv6 localhost)', () => {
      expect(() => sanitizeUrl('http://[::1]/')).toThrow(ValidationError)
    })
  })

  describe('blocked private IP ranges', () => {
    it('blocks 10.x.x.x (Class A private)', () => {
      expect(() => sanitizeUrl('http://10.0.0.1/')).toThrow(ValidationError)
      expect(() => sanitizeUrl('http://10.255.255.255/')).toThrow(ValidationError)
    })

    it('blocks 172.16-31.x.x (Class B private)', () => {
      expect(() => sanitizeUrl('http://172.16.0.1/')).toThrow(ValidationError)
      expect(() => sanitizeUrl('http://172.31.255.255/')).toThrow(ValidationError)
    })

    it('allows 172.15.x.x (not in private range)', () => {
      const url = sanitizeUrl('http://172.15.0.1/')
      expect(url.hostname).toBe('172.15.0.1')
    })

    it('blocks 192.168.x.x (Class C private)', () => {
      expect(() => sanitizeUrl('http://192.168.0.1/')).toThrow(ValidationError)
      expect(() => sanitizeUrl('http://192.168.1.100/')).toThrow(ValidationError)
    })

    it('blocks 169.254.x.x (link-local / AWS metadata)', () => {
      expect(() => sanitizeUrl('http://169.254.169.254/')).toThrow(ValidationError)
    })

    it('blocks 100.64-127.x.x (CGNAT)', () => {
      expect(() => sanitizeUrl('http://100.64.0.1/')).toThrow(ValidationError)
      expect(() => sanitizeUrl('http://100.127.255.255/')).toThrow(ValidationError)
    })
  })

  describe('blocked hostname patterns', () => {
    it('blocks .local domains', () => {
      expect(() => sanitizeUrl('http://myserver.local/')).toThrow(ValidationError)
    })

    it('blocks .internal domains', () => {
      expect(() => sanitizeUrl('http://api.internal/')).toThrow(ValidationError)
    })

    it('blocks internal.* domains', () => {
      expect(() => sanitizeUrl('http://internal.company.com/')).toThrow(ValidationError)
    })

    it('blocks intranet.* domains', () => {
      expect(() => sanitizeUrl('http://intranet.company.com/')).toThrow(ValidationError)
    })

    it('blocks .localdomain', () => {
      expect(() => sanitizeUrl('http://server.localdomain/')).toThrow(ValidationError)
    })
  })
})

describe('extractImageUrls', () => {
  it('extracts standard src attributes', () => {
    const html = '<img src="https://example.com/image.jpg">'
    const urls = extractImageUrls(html)
    expect(urls).toEqual(['https://example.com/image.jpg'])
  })

  it('extracts data-src for lazy loading', () => {
    const html = '<img data-src="https://example.com/lazy.jpg" src="data:image/gif;base64,placeholder">'
    const urls = extractImageUrls(html)
    expect(urls).toEqual(['https://example.com/lazy.jpg'])
  })

  it('extracts data-lazy-src for WordPress lazy loading', () => {
    const html = '<img data-lazy-src="https://example.com/wp-lazy.jpg">'
    const urls = extractImageUrls(html)
    expect(urls).toEqual(['https://example.com/wp-lazy.jpg'])
  })

  it('extracts from srcset attribute', () => {
    const html = '<img srcset="https://example.com/small.jpg 300w, https://example.com/large.jpg 600w">'
    const urls = extractImageUrls(html)
    expect(urls).toEqual(['https://example.com/small.jpg'])
  })

  it('prioritizes data-src over src', () => {
    const html = '<img data-src="https://example.com/real.jpg" src="https://example.com/placeholder.jpg">'
    const urls = extractImageUrls(html)
    expect(urls).toEqual(['https://example.com/real.jpg'])
  })

  it('skips data: URLs in src', () => {
    const html = '<img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP">'
    const urls = extractImageUrls(html)
    expect(urls).toEqual([])
  })

  it('respects maxImages limit', () => {
    const html = `
      <img src="https://example.com/1.jpg">
      <img src="https://example.com/2.jpg">
      <img src="https://example.com/3.jpg">
      <img src="https://example.com/4.jpg">
    `
    const urls = extractImageUrls(html, 2)
    expect(urls).toHaveLength(2)
  })

  it('deduplicates URLs', () => {
    const html = `
      <img src="https://example.com/same.jpg">
      <img src="https://example.com/same.jpg">
    `
    const urls = extractImageUrls(html)
    expect(urls).toEqual(['https://example.com/same.jpg'])
  })

  it('returns empty array for HTML with no images', () => {
    const html = '<div>No images here</div>'
    const urls = extractImageUrls(html)
    expect(urls).toEqual([])
  })
})

describe('stripHtml', () => {
  it('removes HTML tags', () => {
    const html = '<p>Hello <strong>world</strong></p>'
    expect(stripHtml(html)).toBe('Hello world')
  })

  it('strips script blocks', () => {
    const html = '<div>Text</div><script>alert("bad")</script><p>More</p>'
    expect(stripHtml(html)).toBe('Text More')
  })

  it('strips style blocks', () => {
    const html = '<style>.class { color: red; }</style><p>Content</p>'
    expect(stripHtml(html)).toBe('Content')
  })

  it('normalizes whitespace', () => {
    const html = '<p>Hello</p>   <p>World</p>'
    expect(stripHtml(html)).toBe('Hello World')
  })

  it('respects maxLength', () => {
    const html = '<p>This is a very long text that should be truncated</p>'
    const result = stripHtml(html, 20)
    expect(result.length).toBeLessThanOrEqual(20)
  })

  it('handles empty input', () => {
    expect(stripHtml('')).toBe('')
  })
})

describe('getIngredientColors', () => {
  it('returns colors from AI-inferred categories', () => {
    const categories = { 'chicken': 'meat' as const }
    const colors = getIngredientColors('chicken', categories)
    expect(colors.bg).toBe('bg-red-100')
    expect(colors.text).toBe('text-red-700')
  })

  it('is case-insensitive for category lookup', () => {
    const categories = { 'Chicken': 'meat' as const }
    const colors = getIngredientColors('chicken', categories)
    expect(colors.bg).toBe('bg-red-100')
  })

  it('falls back to keyword matching without categories', () => {
    const colors = getIngredientColors('chicken breast')
    expect(colors.bg).toBe('bg-red-100') // meat category
  })

  it('matches vegetable keywords', () => {
    const colors = getIngredientColors('diced onion')
    expect(colors.bg).toBe('bg-green-100')
  })

  it('matches dairy keywords', () => {
    const colors = getIngredientColors('parmesan cheese')
    expect(colors.bg).toBe('bg-yellow-100')
  })

  it('matches spice keywords', () => {
    const colors = getIngredientColors('ground cumin')
    expect(colors.bg).toBe('bg-purple-100')
  })

  it('returns other for unknown ingredients', () => {
    const colors = getIngredientColors('mystery ingredient xyz')
    expect(colors.bg).toBe('bg-slate-100')
    expect(colors.text).toBe('text-slate-600')
  })
})

describe('getStartingSteps', () => {
  const mockSteps: RecipeStep[] = [
    { id: 'step1', text: 'Prep veggies', dependsOn: [] },
    { id: 'step2', text: 'Boil water', dependsOn: [] },
    { id: 'step3', text: 'Add pasta', dependsOn: ['step2'] },
    { id: 'step4', text: 'Combine', dependsOn: ['step1', 'step3'] },
  ]

  it('returns steps with empty dependsOn arrays', () => {
    const starting = getStartingSteps(mockSteps)
    expect(starting).toHaveLength(2)
    expect(starting.map(s => s.id)).toEqual(['step1', 'step2'])
  })

  it('returns empty array when all steps have dependencies', () => {
    const allDependent: RecipeStep[] = [
      { id: 'step1', text: 'Step 1', dependsOn: ['step0'] },
      { id: 'step2', text: 'Step 2', dependsOn: ['step1'] },
    ]
    expect(getStartingSteps(allDependent)).toEqual([])
  })

  it('returns all steps when none have dependencies', () => {
    const allIndependent: RecipeStep[] = [
      { id: 'step1', text: 'Step 1', dependsOn: [] },
      { id: 'step2', text: 'Step 2', dependsOn: [] },
    ]
    expect(getStartingSteps(allIndependent)).toHaveLength(2)
  })
})

describe('getStartingStepIds', () => {
  const mockSteps: RecipeStep[] = [
    { id: 'step1', text: 'Prep veggies', dependsOn: [] },
    { id: 'step2', text: 'Boil water', dependsOn: [] },
    { id: 'step3', text: 'Add pasta', dependsOn: ['step2'] },
  ]

  it('returns IDs of steps with no dependencies', () => {
    const ids = getStartingStepIds(mockSteps)
    expect(ids).toEqual(['step1', 'step2'])
  })

  it('returns empty array when all steps have dependencies', () => {
    const allDependent: RecipeStep[] = [
      { id: 'step1', text: 'Step 1', dependsOn: ['step0'] },
    ]
    expect(getStartingStepIds(allDependent)).toEqual([])
  })
})
