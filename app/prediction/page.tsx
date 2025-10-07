"use client"

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Upload, Image as ImageIcon, Loader2, AlertCircle, CheckCircle, Camera, X, Sparkles } from 'lucide-react'
import { useDropzone } from 'react-dropzone'

interface AnalysisResult {
  diseaseDetected: boolean
  diseaseName?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
  confidence: number
  symptoms: string[]
  recommendations: string[]
  healthStatus: string
  additionalInfo?: string
}

export default function PredictionPage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string)
        setAnalysisResult(null)
        setError(null)
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  })

  const handleAnalyze = async () => {
    if (!imageFile) return

    setIsAnalyzing(true)
    setError(null)
    setAnalysisResult(null)

    try {
      const formData = new FormData()
      formData.append('image', imageFile)

      const response = await fetch('/api/analyze-plant', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed')
      }

      setAnalysisResult(data.result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze image')
      console.error('Analysis error:', err)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleReset = () => {
    setSelectedImage(null)
    setImageFile(null)
    setAnalysisResult(null)
    setError(null)
  }

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'low': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
      case 'medium': return 'bg-orange-500/10 text-orange-600 border-orange-500/20'
      case 'high': return 'bg-red-500/10 text-red-600 border-red-500/20'
      case 'critical': return 'bg-red-700/10 text-red-700 border-red-700/20'
      default: return 'bg-green-500/10 text-green-600 border-green-500/20'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50/30 to-emerald-50/30 dark:from-slate-950 dark:via-green-950/30 dark:to-emerald-950/30 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-lime-600 bg-clip-text text-transparent">
              Plant Disease Prediction
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Upload a plant or leaf image for AI-powered disease analysis
            </p>
          </div>
          <Sparkles className="w-12 h-12 text-green-500 animate-pulse" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Section */}
          <Card className="border-2 border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-green-600" />
                Upload Plant Image
              </CardTitle>
              <CardDescription>
                Drag & drop or click to select an image (PNG, JPG, WEBP • Max 10MB)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedImage ? (
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 ${
                    isDragActive
                      ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                      : 'border-slate-300 dark:border-slate-700 hover:border-green-400 hover:bg-slate-50 dark:hover:bg-slate-900'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                  {isDragActive ? (
                    <p className="text-green-600 dark:text-green-400 font-medium">
                      Drop the image here...
                    </p>
                  ) : (
                    <>
                      <p className="text-slate-700 dark:text-slate-300 font-medium mb-2">
                        Drag & drop plant image here
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        or click to browse files
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-800">
                    <img
                      src={selectedImage}
                      alt="Selected plant"
                      className="w-full h-auto max-h-96 object-contain bg-slate-100 dark:bg-slate-900"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={handleReset}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Analyze Plant
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      disabled={isAnalyzing}
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card className="border-2 border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-emerald-600" />
                Analysis Results
              </CardTitle>
              <CardDescription>
                AI-powered disease detection and recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!analysisResult && !isAnalyzing && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center mb-4">
                    <Sparkles className="w-10 h-10 text-slate-400" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">
                    Upload and analyze an image to see results
                  </p>
                </div>
              )}

              {isAnalyzing && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-12 h-12 text-green-600 animate-spin mb-4" />
                  <p className="text-slate-700 dark:text-slate-300 font-medium">
                    Analyzing plant health...
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                    This may take a few seconds
                  </p>
                </div>
              )}

              {analysisResult && (
                <div className="space-y-6">
                  {/* Health Status */}
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border border-slate-200 dark:border-slate-700">
                    {analysisResult.diseaseDetected ? (
                      <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">
                        {analysisResult.healthStatus}
                      </h3>
                      {analysisResult.diseaseDetected && analysisResult.diseaseName && (
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={getSeverityColor(analysisResult.severity)}>
                            {analysisResult.diseaseName}
                          </Badge>
                          {analysisResult.severity && (
                            <Badge variant="outline" className="text-xs">
                              {analysisResult.severity.toUpperCase()} severity
                            </Badge>
                          )}
                        </div>
                      )}
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                        Confidence: {(analysisResult.confidence * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* Symptoms */}
                  {analysisResult.symptoms.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-3 text-slate-700 dark:text-slate-300">
                        Detected Symptoms:
                      </h4>
                      <ul className="space-y-2">
                        {analysisResult.symptoms.map((symptom, index) => (
                          <li
                            key={index}
                            className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400"
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                            {symptom}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendations */}
                  {analysisResult.recommendations.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-3 text-slate-700 dark:text-slate-300">
                        Recommendations:
                      </h4>
                      <ul className="space-y-2">
                        {analysisResult.recommendations.map((rec, index) => (
                          <li
                            key={index}
                            className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400"
                          >
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Additional Info */}
                  {analysisResult.additionalInfo && (
                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {analysisResult.additionalInfo}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-green-200 dark:border-green-900">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                  <Sparkles className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">AI-Powered</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Advanced Gemini Vision API for accurate disease detection
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-200 dark:border-emerald-900">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900">
                  <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">QBM Integration</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Tailored recommendations for your hydroponic system
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-lime-200 dark:border-lime-900">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-lime-100 dark:bg-lime-900">
                  <ImageIcon className="w-5 h-5 text-lime-600 dark:text-lime-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">Instant Analysis</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Get results in seconds with confidence scores
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
