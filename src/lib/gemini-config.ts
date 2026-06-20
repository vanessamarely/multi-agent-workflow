import { GoogleGenerativeAI } from '@google/generative-ai'

export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''

if (!GEMINI_API_KEY) {
  console.warn('VITE_GEMINI_API_KEY not found. Please add it to your environment.')
}

export const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

export const getFlashModel = () => {
  return genAI.getGenerativeModel({ 
    model: 'gemini-1.5-flash',
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 2048,
    }
  })
}

export const getProModel = () => {
  return genAI.getGenerativeModel({ 
    model: 'gemini-1.5-pro',
    generationConfig: {
      temperature: 0.8,
      topP: 0.95,
      maxOutputTokens: 8192,
    }
  })
}
