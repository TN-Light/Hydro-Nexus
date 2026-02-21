import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '')

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get('image') as File

    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!imageFile.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an image.' },
        { status: 400 }
      )
    }

    // Convert image to base64
    const bytes = await imageFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Image = buffer.toString('base64')

    // Get Gemini Vision model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    // Craft detailed prompt for plant disease analysis
    const prompt = `You are an expert plant pathologist and agronomist specializing in disease diagnosis for hydroponic and agricultural systems.

Analyze this plant/leaf image and provide a detailed assessment in the following JSON format:

{
  "diseaseDetected": boolean,
  "diseaseName": "specific disease name or 'Healthy' if no disease",
  "severity": "low" | "medium" | "high" | "critical" (only if disease detected),
  "confidence": 0.0-1.0 (your confidence in this diagnosis),
  "symptoms": ["symptom 1", "symptom 2", ...] (visible symptoms),
  "recommendations": ["action 1", "action 2", ...] (specific treatment/prevention steps),
  "healthStatus": "brief overall health assessment",
  "additionalInfo": "any additional relevant information about the plant condition, growth stage, or environmental factors"
}

Focus on:
- Common diseases: leaf spot, blight, powdery mildew, rust, bacterial infections, viral diseases, nutrient deficiencies
- Visible symptoms: discoloration, spots, wilting, lesions, curling, yellowing, browning, necrosis
- For hydroponic systems: mention water quality, nutrient balance, pH considerations if relevant
- Provide actionable recommendations specific to QBM-HydroNet (plasma-activated water, biochar substrate, AMF symbiosis)

If the plant appears healthy, still provide a confidence score and note any minor observations.

Return ONLY valid JSON, no additional text.`

    // Analyze the image
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: imageFile.type,
          data: base64Image
        }
      },
      prompt
    ])

    const response = await result.response
    const text = response.text()

    // Parse JSON response
    let analysisResult
    try {
      // Extract JSON from response (in case there's additional text)
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0])
      } else {
        // Fallback: create structured response from text
        analysisResult = {
          diseaseDetected: text.toLowerCase().includes('disease') || text.toLowerCase().includes('infected'),
          diseaseName: 'Analysis completed - see details',
          confidence: 0.75,
          symptoms: [text.substring(0, 200)],
          recommendations: ['Consult the full analysis for details'],
          healthStatus: text.substring(0, 100),
          additionalInfo: text
        }
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      // Create fallback structured response
      analysisResult = {
        diseaseDetected: false,
        diseaseName: 'Analysis completed',
        confidence: 0.7,
        symptoms: ['Unable to parse detailed symptoms'],
        recommendations: ['Review the analysis carefully', 'Consider consulting with an agronomist'],
        healthStatus: text.substring(0, 150),
        additionalInfo: text
      }
    }

    // Validate and sanitize the result
    const sanitizedResult = {
      diseaseDetected: Boolean(analysisResult.diseaseDetected),
      diseaseName: analysisResult.diseaseName || 'Unknown',
      severity: analysisResult.severity || undefined,
      confidence: Math.min(Math.max(Number(analysisResult.confidence) || 0.5, 0), 1),
      symptoms: Array.isArray(analysisResult.symptoms) ? analysisResult.symptoms : [],
      recommendations: Array.isArray(analysisResult.recommendations) ? analysisResult.recommendations : [],
      healthStatus: analysisResult.healthStatus || 'Analysis completed',
      additionalInfo: analysisResult.additionalInfo || undefined
    }

    return NextResponse.json({
      success: true,
      result: sanitizedResult,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Plant analysis error:', error)
    
    // Provide helpful error messages
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'AI service configuration error. Please check API keys.' },
          { status: 500 }
        )
      }
      if (error.message.includes('quota')) {
        return NextResponse.json(
          { error: 'API quota exceeded. Please try again later.' },
          { status: 429 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to analyze image. Please try again.' },
      { status: 500 }
    )
  }
}

// Add OPTIONS handler for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

