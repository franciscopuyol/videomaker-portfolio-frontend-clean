import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ProjectSuggestion {
  description: string;
  roles: string[];
  tags: string[];
  category: string;
}

export async function generateProjectSuggestions(
  title: string,
  category?: string,
  client?: string,
  year?: number
): Promise<ProjectSuggestion> {
  console.log('[AI] generateProjectSuggestions called with:', { title, category, client, year });
  
  try {
    const prompt = `Generate project suggestions for a video/film project with the following details:
Title: ${title}
Category: ${category || 'Not specified'}
Client: ${client || 'Not specified'}
Year: ${year || new Date().getFullYear()}

Please provide:
1. A professional project description (2-3 sentences)
2. Relevant project roles (e.g., Editing, Motion Design, Color Grading, Cinematography, etc.)
3. Relevant tags for categorization
4. Suggested category if not provided

Respond in JSON format with this structure:
{
  "description": "Professional description here",
  "roles": ["Role1", "Role2", "Role3"],
  "tags": ["tag1", "tag2", "tag3"],
  "category": "suggested category"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert video production assistant. Provide professional, industry-standard suggestions for video projects."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    const suggestions = JSON.parse(content);
    
    return {
      description: suggestions.description || '',
      roles: Array.isArray(suggestions.roles) ? suggestions.roles : [],
      tags: Array.isArray(suggestions.tags) ? suggestions.tags : [],
      category: suggestions.category || category || ''
    };
  } catch (error) {
    console.error('AI suggestion error:', error);
    throw new Error(`Failed to generate AI suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function generateDescriptionSuggestion(
  title: string,
  category?: string,
  client?: string
): Promise<string> {
  try {
    const prompt = `Generate a professional project description (2-3 sentences) for a video/film project:
Title: ${title}
Category: ${category || 'Not specified'}
Client: ${client || 'Not specified'}

Make it engaging and professional, suitable for a portfolio.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional copywriter specializing in video production portfolios."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    console.error('Description generation error:', error);
    throw new Error(`Failed to generate description: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function generateRoleSuggestions(
  title: string,
  description?: string,
  category?: string
): Promise<string[]> {
  try {
    const prompt = `Based on this video project, suggest relevant professional roles:
Title: ${title}
Description: ${description || 'Not provided'}
Category: ${category || 'Not specified'}

Common roles include: Editing, Motion Design, Color Grading, Cinematography, Direction, Sound Design, VFX, Animation, etc.

Respond in JSON format with this structure:
{
  "roles": ["Role1", "Role2", "Role3"]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a video production expert. Suggest only realistic, industry-standard roles."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) return [];
    
    const result = JSON.parse(content);
    return Array.isArray(result.roles) ? result.roles : [];
  } catch (error) {
    console.error('Role suggestion error:', error);
    return [];
  }
}

export async function generateTagSuggestions(
  title: string,
  description?: string,
  category?: string
): Promise<string[]> {
  try {
    const prompt = `Generate relevant tags for this video project:
Title: ${title}
Description: ${description || 'Not provided'}
Category: ${category || 'Not specified'}

Suggest 4-6 relevant tags for categorization and searchability.
Respond in JSON format with this structure:
{
  "tags": ["tag1", "tag2", "tag3", "tag4"]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a content categorization expert. Suggest relevant, searchable tags."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) return [];
    
    const result = JSON.parse(content);
    return Array.isArray(result.tags) ? result.tags : [];
  } catch (error) {
    console.error('Tag suggestion error:', error);
    return [];
  }
}