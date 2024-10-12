'use client'

import React, { useState } from 'react'
import { GoogleGenerativeAI } from '@google/generative-ai'
import axios from 'axios'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Loader2, RefreshCw } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

interface NameSuggestion {
  name: string
  domain: string
  available: boolean
}

interface FormData {
  keywords: string
  industry: string
  targetAudience: string
  companyValues: string
  companyDescription: string
}

const industries = [
  "Technology", "Healthcare", "Finance", "Education", "Entertainment",
  "Food & Beverage", "Travel", "Fashion", "Real Estate", "Other"
]

export default function StartupNamer() {
  const [formData, setFormData] = useState<FormData>({
    keywords: '',
    industry: '',
    targetAudience: '',
    companyValues: '',
    companyDescription: ''
  })
  const [suggestions, setSuggestions] = useState<NameSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, industry: value }))
  }

  const generateNames = async () => {
    if (!formData.keywords.trim()) {
      setError("Please enter at least one keyword");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      const prompt = `Generate 5 unique and catchy startup names based on the following information:
      Keywords: ${formData.keywords}
      Industry: ${formData.industry}
      Target Audience: ${formData.targetAudience}
      Company Values: ${formData.companyValues}
      Company Description: ${formData.companyDescription}
     
      Format the output strictly as a JSON array of objects, each with a 'name' property. Do not include any additional text or formatting.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = await response.text();

      const jsonString = text.trim().replace(/```json\n?|```/g, "").trim();
      const generatedNames: { name: string }[] = JSON.parse(jsonString);
      
      if (!Array.isArray(generatedNames)) {
        throw new Error("Generated content is not an array");
      }

      const suggestionsWithDomains = await Promise.all(
        generatedNames.map(async (item) => {
          if (typeof item.name !== 'string') {  
            console.error("Invalid name:", item);
            return null;
          }
          const domain = `${item.name.toLowerCase().replace(/\s/g, "")}.com`;
          try {
            const res = await axios.get(`/api/check-domain?domain=${domain}`);
            return {
              name: item.name,
              domain,
              available: res.data.available,
            };
          } catch (error) {
            console.error("Error checking domain:", error);
            return {
              name: item.name,
              domain,
              available: false,
            };
          }   
        })
      );

      const validSuggestions = suggestionsWithDomains.filter((suggestion): suggestion is NameSuggestion => suggestion !== null);
      setSuggestions(validSuggestions);

      if (validSuggestions.length === 0) {
        setError("No valid names were generated. Please try again.");
      }
    } catch (err) {
      console.error("Error generating names or checking domains:", err);
      setError("Failed to generate names or check domains. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-indigo-200 p-4 flex flex-col items-center justify-center">
      <h1 className="text-2xl md:text-3xl font-bold text-center mb-4 mt-6">Startup Names by AI</h1>
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardDescription className="text-center text-base md:text-lg text-gray-800 font-semibold">
            Find the perfect startup name with AI-powered Startup Namer, creating unique names tailored to your business and checking domain availability in real time.
          </CardDescription>
        </CardHeader>
        <div className="text-center mb-4">
          <div className="custom-line"></div>
        </div>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); generateNames(); }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="keywords">Enter keywords related to your startup</Label>
              <Input
                id="keywords"
                name="keywords"
                placeholder="Culinary, Gourmet, Organic"
                value={formData.keywords}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Select your industry</Label>
              <Select onValueChange={handleSelectChange} value={formData.industry}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an industry" />
                </SelectTrigger>
                <SelectContent>
                  {industries.map((industry) => (
                    <SelectItem key={industry} value={industry.toLowerCase()}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetAudience">Describe your target audience</Label>
              <Input
                id="targetAudience"
                name="targetAudience"
                placeholder="Example: Food lovers, health enthusiasts, aspiring chefs"
                value={formData.targetAudience}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyValues">Describe your company values</Label>
              <Textarea
                id="companyValues"
                name="companyValues"
                placeholder="Example: Sustainability, Innovation, Customer-Centric Excellence"
                value={formData.companyValues}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyDescription">Describe what your company does or what it sells</Label>
              <Textarea
                id="companyDescription"
                name="companyDescription"
                placeholder="Example: Premium culinary experiences, Organic gourmet products, Innovative food solutions"
                value={formData.companyDescription}
                onChange={handleInputChange}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Names...
                </>
              ) : (
                'Generate Names'
              )}
            </Button>
          </form>

          {error && <p className="text-red-500 mt-4 text-center">{error}</p>}

          {suggestions.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-4">Suggested Names:</h3>
              <ul className="space-y-4">
                {suggestions.map((suggestion, index) => (
                  <li key={index} className="bg-white p-4 rounded-lg shadow">
                    <p className="font-bold text-lg">{suggestion.name}</p>
                    <p className="text-sm text-gray-600">
                      Domain: {suggestion.domain}
                      {suggestion.available ? (
                        <span className="text-green-500 ml-2">Available</span>
                      ) : (
                        <span className="text-red-500 ml-2">Unavailable</span>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
              <Button
                onClick={generateNames}
                className="mt-4 w-full"
                disabled={loading}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Generate More Names
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="mt-6 flex flex-col md:flex-row justify-center items-center space-y-4 md:space-y-0 md:space-x-8 text-gray-800">
        <p className="flex items-center">
          <span className="text-xl">👨‍💻</span>
          <span className="ml-2 font-semibold">
            By <a href="https://www.instagram.com/37mohammd/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">37mohammd</a>
          </span>
        </p>
        <p className="flex items-center">
          <span className="text-xl">🌐</span>
          <span className="ml-2 font-semibold">
            Visit <a href="https://startup-names-by-ai.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">my Vercel Site</a>
          </span>
        </p>
      </div>
    </div>
  )
}