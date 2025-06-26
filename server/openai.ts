import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ContentSuggestions {
  title: string;
  description: string;
  category: string;
  tags: string[];
  seoDescription: string;
}

export async function generateContentSuggestions(
  filename: string,
  existingTitle?: string,
  existingDescription?: string,
  model: string = 'gpt-3.5-turbo'
): Promise<{ suggestions: ContentSuggestions; tokenUsage?: number }> {
  try {
    const prompt = `You are a professional video portfolio content creator for filmmaker Francisco Puyol. Based on the video filename "${filename}" and any existing content (Title: "${existingTitle || 'Not provided'}", Description: "${existingDescription || 'Not provided'}"), generate compelling content for a video portfolio.

Respond with JSON in this exact format:
{
  "title": "Professional, engaging video title (max 60 characters)",
  "description": "Compelling description highlighting the creative vision, technical execution, and impact (150-200 words)",
  "category": "One of: Commercial Campaign, Event Coverage, Brand Integration, Documentary, Music Video, Corporate, Fashion, Sports, Travel, Experimental",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "seoDescription": "SEO-optimized meta description (max 155 characters)"
}

Make the content professional, creative, and suitable for a high-end video portfolio. Focus on technical excellence, creative vision, and commercial impact.`;

    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: "You are an expert copywriter specializing in video portfolio content and SEO optimization."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
      temperature: 0.7
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    const suggestions: ContentSuggestions = {
      title: result.title || "Professional Video Production",
      description: result.description || "A compelling video showcasing creative excellence and technical precision.",
      category: result.category || "Commercial Campaign",
      tags: result.tags || ["video", "production", "creative", "professional", "cinematic"],
      seoDescription: result.seoDescription || "Professional video production showcasing creative excellence and technical precision."
    };

    return {
      suggestions,
      tokenUsage: response.usage?.total_tokens
    };
    
  } catch (error: any) {
    console.error("Error generating content suggestions:", error);
    
    if (error.status === 429 || error.code === 'insufficient_quota') {
      throw new Error("OpenAI quota exceeded. Please add credits to your OpenAI account at https://platform.openai.com/account/billing");
    }
    
    if (error.status === 401) {
      throw new Error("Invalid OpenAI API key. Please check your API key configuration.");
    }
    
    throw new Error("Failed to generate content suggestions. Please try again or check your OpenAI account status.");
  }
}

export async function generateAutoDescription(
  title: string,
  client?: string
): Promise<{ description: string }> {
  try {
    const prompt = `You are a professional video portfolio content creator. Based on the project title "${title}" and client "${client || 'Not specified'}", generate a compelling video description.

Respond with JSON in this exact format:
{
  "description": "A compelling, professional description that highlights creative vision, technical execution, and impact (150-200 words)"
}

Make it cinematic, engaging, and suitable for a high-end video portfolio. Focus on visual storytelling and professional impact.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert copywriter specializing in cinematic video descriptions."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
      temperature: 0.7
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      description: result.description || "A compelling video showcasing creative excellence and technical precision."
    };
    
  } catch (error: any) {
    console.error("Error generating auto description:", error);
    
    if (error.status === 429 || error.code === 'insufficient_quota') {
      throw new Error("OpenAI quota exceeded. Please add credits to your OpenAI account at https://platform.openai.com/account/billing");
    }
    
    if (error.status === 401) {
      throw new Error("Invalid OpenAI API key. Please check your API key configuration.");
    }
    
    throw new Error("Failed to generate description. Please try again or check your OpenAI account status.");
  }
}

export async function translateContent(
  text: string,
  targetLanguage: 'en' | 'es' | 'fr'
): Promise<{ translatedText: string }> {
  try {
    const languageNames = {
      en: 'English',
      es: 'Spanish', 
      fr: 'French'
    };

    const prompt = `Translate the following text to ${languageNames[targetLanguage]}. Maintain the professional tone and creative style:

"${text}"

Respond with JSON in this exact format:
{
  "translatedText": "The translated text here"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional translator specializing in creative and marketing content."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
      temperature: 0.3
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      translatedText: result.translatedText || text
    };
    
  } catch (error: any) {
    console.error("Error translating content:", error);
    
    if (error.status === 429 || error.code === 'insufficient_quota') {
      throw new Error("OpenAI quota exceeded. Please add credits to your OpenAI account at https://platform.openai.com/account/billing");
    }
    
    if (error.status === 401) {
      throw new Error("Invalid OpenAI API key. Please check your API key configuration.");
    }
    
    throw new Error("Failed to translate content. Please try again or check your OpenAI account status.");
  }
}

export async function generateSEOContent(
  title: string,
  description: string
): Promise<{ seoTitle: string; tags: string[]; metaDescription: string }> {
  try {
    const prompt = `You are an SEO expert for video portfolios. Based on the title "${title}" and description "${description}", generate SEO-optimized content.

Respond with JSON in this exact format:
{
  "seoTitle": "SEO-optimized title (max 60 characters)",
  "tags": ["relevant", "seo", "keywords", "for", "video"],
  "metaDescription": "SEO meta description (max 155 characters)"
}

Focus on video production, filmmaking, and creative industry keywords.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an SEO expert specializing in video production and creative portfolios."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 800,
      temperature: 0.5
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      seoTitle: result.seoTitle || title,
      tags: result.tags || ["video", "production", "creative"],
      metaDescription: result.metaDescription || description.substring(0, 155)
    };
    
  } catch (error: any) {
    console.error("Error generating SEO content:", error);
    
    if (error.status === 429 || error.code === 'insufficient_quota') {
      throw new Error("OpenAI quota exceeded. Please add credits to your OpenAI account at https://platform.openai.com/account/billing");
    }
    
    if (error.status === 401) {
      throw new Error("Invalid OpenAI API key. Please check your API key configuration.");
    }
    
    throw new Error("Failed to generate SEO content. Please try again or check your OpenAI account status.");
  }
}

export async function improveExistingContent(
  title: string,
  description: string,
  category: string
): Promise<ContentSuggestions> {
  try {
    const prompt = `You are a professional video portfolio content optimizer for filmmaker Francisco Puyol. Improve the following existing content to be more compelling, SEO-friendly, and professional:

Current Title: "${title}"
Current Description: "${description}"
Current Category: "${category}"

Respond with JSON in this exact format:
{
  "title": "Improved professional title (max 60 characters)",
  "description": "Enhanced description with better storytelling and technical details (150-200 words)",
  "category": "Optimized category from: Commercial Campaign, Event Coverage, Brand Integration, Documentary, Music Video, Corporate, Fashion, Sports, Travel, Experimental",
  "tags": ["optimized", "seo", "tags", "relevant", "keywords"],
  "seoDescription": "SEO-optimized meta description (max 155 characters)"
}

Focus on improving clarity, impact, and SEO performance while maintaining the original intent.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert copywriter specializing in video portfolio optimization and SEO."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
      temperature: 0.7
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      title: result.title || title,
      description: result.description || description,
      category: result.category || category,
      tags: result.tags || ["video", "production", "creative"],
      seoDescription: result.seoDescription || description.substring(0, 155)
    };
    
  } catch (error: any) {
    console.error("Error improving content:", error);
    
    if (error.status === 429 || error.code === 'insufficient_quota') {
      throw new Error("OpenAI quota exceeded. Please add credits to your OpenAI account at https://platform.openai.com/account/billing");
    }
    
    if (error.status === 401) {
      throw new Error("Invalid OpenAI API key. Please check your API key configuration.");
    }
    
    throw new Error("Failed to improve content. Please try again or check your OpenAI account status.");
  }
}