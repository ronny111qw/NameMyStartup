import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { domain } = req.query

  if (!domain) {
    console.error('Domain parameter is missing')
    return res.status(400).json({ error: 'Domain parameter is required' })
  }

  const apiKey = process.env.GODADDY_API_KEY
  const apiSecret = process.env.GODADDY_API_SECRET

  if (!apiKey || !apiSecret) {
    console.error('GoDaddy API credentials are missing')
    return res.status(500).json({ error: 'GoDaddy API credentials are not configured' })
  }

  console.log(`Checking availability for domain: ${domain}`)
  console.log(`Using API Key: ${apiKey.substring(0, 5)}...`) // Log first 5 characters of API key

  const url = `https://api.ote-godaddy.com/v1/domains/available?domain=${domain}`

  try {
    console.log(`Sending request to GoDaddy API: ${url}`)
    const response = await axios.get(url, {
      headers: {
        Authorization: `sso-key ${apiKey}:${apiSecret}`,
        Accept: 'application/json'
      }
    })

    console.log('GoDaddy API Response:', response.data)

    const available = response.data.available
    return res.status(200).json({ available })
  } catch (error) {
    console.error('Error in API route:')
    if (axios.isAxiosError(error)) {
      console.error('Axios error:', error.message)
      console.error('Response data:', error.response?.data)
      console.error('Response status:', error.response?.status)
      console.error('Response headers:', error.response?.headers)
    } else {
      console.error('Unexpected error:', error)
    }
    return res.status(500).json({ available: false, error: 'Failed to check domain availability' })
  }
}