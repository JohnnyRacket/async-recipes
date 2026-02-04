import { describe, it, expect } from 'vitest'
import {
  IngredientCategorySchema,
  RecipeStepSchema,
  RecipeSchema,
  IngestResultSchema,
} from './schemas'

describe('IngredientCategorySchema', () => {
  it('accepts valid categories', () => {
    const validCategories = ['meat', 'seafood', 'vegetable', 'dairy', 'grain', 'sauce', 'spice', 'chocolate', 'other']
    for (const category of validCategories) {
      expect(IngredientCategorySchema.safeParse(category).success).toBe(true)
    }
  })

  it('rejects invalid categories', () => {
    expect(IngredientCategorySchema.safeParse('fruit').success).toBe(false)
    expect(IngredientCategorySchema.safeParse('').success).toBe(false)
    expect(IngredientCategorySchema.safeParse(123).success).toBe(false)
  })
})

describe('RecipeStepSchema', () => {
  const validStep = {
    id: 'step1',
    text: 'Chop the onions',
    dependsOn: [],
  }

  it('accepts a valid step with required fields', () => {
    const result = RecipeStepSchema.safeParse(validStep)
    expect(result.success).toBe(true)
  })

  it('accepts a step with all optional fields', () => {
    const fullStep = {
      ...validStep,
      duration: 5,
      isPassive: false,
      needsTimer: false,
      ingredients: ['onion'],
      temperature: 'medium heat',
    }
    const result = RecipeStepSchema.safeParse(fullStep)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.duration).toBe(5)
      expect(result.data.isPassive).toBe(false)
      expect(result.data.ingredients).toEqual(['onion'])
    }
  })

  it('requires id field', () => {
    const { id, ...missingId } = validStep
    const result = RecipeStepSchema.safeParse(missingId)
    expect(result.success).toBe(false)
  })

  it('requires text field', () => {
    const { text, ...missingText } = validStep
    const result = RecipeStepSchema.safeParse(missingText)
    expect(result.success).toBe(false)
  })

  it('requires dependsOn field', () => {
    const { dependsOn, ...missingDependsOn } = validStep
    const result = RecipeStepSchema.safeParse(missingDependsOn)
    expect(result.success).toBe(false)
  })

  it('accepts dependsOn with step IDs', () => {
    const stepWithDeps = {
      ...validStep,
      dependsOn: ['step0', 'prep1'],
    }
    const result = RecipeStepSchema.safeParse(stepWithDeps)
    expect(result.success).toBe(true)
  })
})

describe('RecipeSchema', () => {
  const validRecipe = {
    title: 'Spaghetti Carbonara',
    description: 'A classic Italian pasta dish.',
    ingredients: ['400g spaghetti', '200g guanciale', '4 egg yolks', '100g pecorino'],
    steps: [
      { id: 'step1', text: 'Boil water', dependsOn: [] },
      { id: 'step2', text: 'Cook pasta', dependsOn: ['step1'] },
    ],
  }

  it('accepts a valid recipe with required fields', () => {
    const result = RecipeSchema.safeParse(validRecipe)
    expect(result.success).toBe(true)
  })

  it('accepts a recipe with all optional fields', () => {
    const fullRecipe = {
      ...validRecipe,
      imageUrl: 'https://example.com/carbonara.jpg',
      calories: 650,
      ingredientCategories: {
        guanciale: 'meat',
        'egg yolks': 'dairy',
        pecorino: 'dairy',
      },
    }
    const result = RecipeSchema.safeParse(fullRecipe)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.imageUrl).toBe('https://example.com/carbonara.jpg')
      expect(result.data.calories).toBe(650)
    }
  })

  it('requires title field', () => {
    const { title, ...missingTitle } = validRecipe
    const result = RecipeSchema.safeParse(missingTitle)
    expect(result.success).toBe(false)
  })

  it('requires description field', () => {
    const { description, ...missingDesc } = validRecipe
    const result = RecipeSchema.safeParse(missingDesc)
    expect(result.success).toBe(false)
  })

  it('requires ingredients array', () => {
    const { ingredients, ...missingIngredients } = validRecipe
    const result = RecipeSchema.safeParse(missingIngredients)
    expect(result.success).toBe(false)
  })

  it('requires steps array', () => {
    const { steps, ...missingSteps } = validRecipe
    const result = RecipeSchema.safeParse(missingSteps)
    expect(result.success).toBe(false)
  })

  it('validates nested steps', () => {
    const invalidSteps = {
      ...validRecipe,
      steps: [{ invalid: 'step' }],
    }
    const result = RecipeSchema.safeParse(invalidSteps)
    expect(result.success).toBe(false)
  })

  it('accepts empty ingredients array', () => {
    const emptyIngredients = {
      ...validRecipe,
      ingredients: [],
    }
    const result = RecipeSchema.safeParse(emptyIngredients)
    expect(result.success).toBe(true)
  })

  it('accepts empty steps array', () => {
    const emptySteps = {
      ...validRecipe,
      steps: [],
    }
    const result = RecipeSchema.safeParse(emptySteps)
    expect(result.success).toBe(true)
  })
})

describe('IngestResultSchema', () => {
  const validRecipe = {
    title: 'Test Recipe',
    description: 'A test recipe',
    ingredients: ['ingredient1'],
    steps: [{ id: 'step1', text: 'Do something', dependsOn: [] }],
  }

  it('accepts valid result with recipe', () => {
    const result = IngestResultSchema.safeParse({
      isValidRecipe: true,
      recipe: validRecipe,
    })
    expect(result.success).toBe(true)
  })

  it('accepts invalid result without recipe', () => {
    const result = IngestResultSchema.safeParse({
      isValidRecipe: false,
      invalidReason: 'Page does not contain a recipe',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.invalidReason).toBe('Page does not contain a recipe')
    }
  })

  it('requires isValidRecipe boolean', () => {
    const result = IngestResultSchema.safeParse({
      recipe: validRecipe,
    })
    expect(result.success).toBe(false)
  })

  it('allows recipe to be undefined for invalid results', () => {
    const result = IngestResultSchema.safeParse({
      isValidRecipe: false,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.recipe).toBeUndefined()
    }
  })

  it('validates nested recipe when provided', () => {
    const result = IngestResultSchema.safeParse({
      isValidRecipe: true,
      recipe: { invalid: 'recipe' },
    })
    expect(result.success).toBe(false)
  })
})
