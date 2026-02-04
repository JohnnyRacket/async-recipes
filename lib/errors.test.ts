import { describe, it, expect } from 'vitest'
import {
  AppError,
  ValidationError,
  NotFoundError,
  ExternalFetchError,
  RateLimitError,
  isAppError,
  toAppError,
  errorResponse,
} from './errors'

describe('AppError', () => {
  it('sets message, code, and statusCode', () => {
    const error = new AppError('Something went wrong', 'INTERNAL_ERROR', 500)
    expect(error.message).toBe('Something went wrong')
    expect(error.code).toBe('INTERNAL_ERROR')
    expect(error.statusCode).toBe(500)
  })

  it('sets name to AppError', () => {
    const error = new AppError('Test', 'TEST', 500)
    expect(error.name).toBe('AppError')
  })

  it('defaults statusCode to 500', () => {
    const error = new AppError('Test', 'TEST')
    expect(error.statusCode).toBe(500)
  })

  it('is an instance of Error', () => {
    const error = new AppError('Test', 'TEST')
    expect(error).toBeInstanceOf(Error)
  })

  describe('toJSON', () => {
    it('serializes error to JSON format', () => {
      const error = new AppError('Test message', 'TEST_CODE', 400)
      const json = error.toJSON()
      expect(json).toEqual({
        error: 'Test message',
        code: 'TEST_CODE',
        statusCode: 400,
      })
    })
  })
})

describe('ValidationError', () => {
  it('defaults to statusCode 400', () => {
    const error = new ValidationError('Invalid input')
    expect(error.statusCode).toBe(400)
  })

  it('defaults code to VALIDATION_ERROR', () => {
    const error = new ValidationError('Invalid input')
    expect(error.code).toBe('VALIDATION_ERROR')
  })

  it('allows custom code', () => {
    const error = new ValidationError('Invalid URL', 'INVALID_URL')
    expect(error.code).toBe('INVALID_URL')
  })

  it('sets name to ValidationError', () => {
    const error = new ValidationError('Test')
    expect(error.name).toBe('ValidationError')
  })

  it('is an instance of AppError', () => {
    const error = new ValidationError('Test')
    expect(error).toBeInstanceOf(AppError)
  })
})

describe('NotFoundError', () => {
  it('defaults to statusCode 404', () => {
    const error = new NotFoundError('Recipe not found')
    expect(error.statusCode).toBe(404)
  })

  it('defaults code to NOT_FOUND', () => {
    const error = new NotFoundError('Not found')
    expect(error.code).toBe('NOT_FOUND')
  })

  it('sets name to NotFoundError', () => {
    const error = new NotFoundError('Test')
    expect(error.name).toBe('NotFoundError')
  })
})

describe('ExternalFetchError', () => {
  it('defaults to statusCode 502', () => {
    const error = new ExternalFetchError('Failed to fetch')
    expect(error.statusCode).toBe(502)
  })

  it('defaults code to EXTERNAL_FETCH_ERROR', () => {
    const error = new ExternalFetchError('Failed')
    expect(error.code).toBe('EXTERNAL_FETCH_ERROR')
  })

  it('sets name to ExternalFetchError', () => {
    const error = new ExternalFetchError('Test')
    expect(error.name).toBe('ExternalFetchError')
  })
})

describe('RateLimitError', () => {
  it('defaults to statusCode 429', () => {
    const error = new RateLimitError()
    expect(error.statusCode).toBe(429)
  })

  it('defaults message to "Too many requests"', () => {
    const error = new RateLimitError()
    expect(error.message).toBe('Too many requests')
  })

  it('defaults code to RATE_LIMIT_EXCEEDED', () => {
    const error = new RateLimitError()
    expect(error.code).toBe('RATE_LIMIT_EXCEEDED')
  })

  it('allows custom message', () => {
    const error = new RateLimitError('Please slow down')
    expect(error.message).toBe('Please slow down')
  })

  it('sets name to RateLimitError', () => {
    const error = new RateLimitError()
    expect(error.name).toBe('RateLimitError')
  })
})

describe('isAppError', () => {
  it('returns true for AppError instances', () => {
    const error = new AppError('Test', 'TEST')
    expect(isAppError(error)).toBe(true)
  })

  it('returns true for subclasses of AppError', () => {
    expect(isAppError(new ValidationError('Test'))).toBe(true)
    expect(isAppError(new NotFoundError('Test'))).toBe(true)
    expect(isAppError(new ExternalFetchError('Test'))).toBe(true)
    expect(isAppError(new RateLimitError())).toBe(true)
  })

  it('returns false for native Error', () => {
    const error = new Error('Native error')
    expect(isAppError(error)).toBe(false)
  })

  it('returns false for non-errors', () => {
    expect(isAppError('string')).toBe(false)
    expect(isAppError(null)).toBe(false)
    expect(isAppError(undefined)).toBe(false)
    expect(isAppError({ message: 'fake error' })).toBe(false)
  })
})

describe('toAppError', () => {
  it('passes through AppError instances unchanged', () => {
    const original = new ValidationError('Original', 'ORIGINAL')
    const result = toAppError(original)
    expect(result).toBe(original)
  })

  it('converts native Error to AppError', () => {
    const native = new Error('Native error message')
    const result = toAppError(native)
    expect(result).toBeInstanceOf(AppError)
    expect(result.message).toBe('Native error message')
    expect(result.code).toBe('INTERNAL_ERROR')
    expect(result.statusCode).toBe(500)
  })

  it('converts unknown values to AppError with fallback message', () => {
    const result = toAppError('just a string', 'Custom fallback')
    expect(result).toBeInstanceOf(AppError)
    expect(result.message).toBe('Custom fallback')
    expect(result.code).toBe('INTERNAL_ERROR')
  })

  it('uses default fallback message for unknown values', () => {
    const result = toAppError(null)
    expect(result.message).toBe('An unexpected error occurred')
  })
})

describe('errorResponse', () => {
  it('creates Response with correct status code', async () => {
    const error = new ValidationError('Bad input', 'BAD_INPUT')
    const response = errorResponse(error)
    expect(response.status).toBe(400)
  })

  it('creates Response with JSON body', async () => {
    const error = new NotFoundError('Recipe not found', 'RECIPE_NOT_FOUND')
    const response = errorResponse(error)
    const body = await response.json()
    expect(body).toEqual({
      error: 'Recipe not found',
      code: 'RECIPE_NOT_FOUND',
      statusCode: 404,
    })
  })

  it('works with all error types', async () => {
    const error = new RateLimitError()
    const response = errorResponse(error)
    expect(response.status).toBe(429)
    const body = await response.json()
    expect(body.code).toBe('RATE_LIMIT_EXCEEDED')
  })
})
