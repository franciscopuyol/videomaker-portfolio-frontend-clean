// Fallback content generation when OpenAI quota is exceeded
export function generateFallbackContent(filename: string): {
  title: string;
  description: string;
  category: string;
  tags: string[];
  seoDescription: string;
} {
  // Extract meaningful parts from filename
  const cleanName = filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
  const words = cleanName.split(" ").map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  );
  
  // Generate basic title
  const title = words.join(" ");
  
  // Basic description template
  const description = `Professional video production showcasing ${title}. This project demonstrates exceptional creative vision and technical execution, delivering compelling visual storytelling that engages audiences and achieves strategic objectives.`;
  
  // Default category based on common patterns
  let category = "Commercial Campaign";
  const lowerFilename = filename.toLowerCase();
  if (lowerFilename.includes("event") || lowerFilename.includes("festival")) {
    category = "Event Coverage";
  } else if (lowerFilename.includes("music") || lowerFilename.includes("concert")) {
    category = "Music Video";
  } else if (lowerFilename.includes("doc") || lowerFilename.includes("story")) {
    category = "Documentary";
  } else if (lowerFilename.includes("fashion") || lowerFilename.includes("style")) {
    category = "Fashion";
  } else if (lowerFilename.includes("sport") || lowerFilename.includes("athletic")) {
    category = "Sports";
  }
  
  // Basic tags
  const tags = ["video", "production", "creative", "professional", "cinematic"];
  
  // SEO description
  const seoDescription = `Professional ${category.toLowerCase()} video production: ${title}. High-quality creative content.`;
  
  return {
    title,
    description,
    category,
    tags,
    seoDescription: seoDescription.substring(0, 155)
  };
}

export function generateFallbackDescription(title: string, client?: string): { description: string } {
  const clientText = client ? ` for ${client}` : "";
  const description = `Professional video production${clientText} showcasing ${title}. This project combines creative excellence with technical precision to deliver compelling visual storytelling that resonates with audiences and achieves strategic communication objectives.`;
  
  return { description };
}

export function generateFallbackTranslation(text: string, targetLanguage: 'en' | 'es' | 'fr'): { translatedText: string } {
  // Basic translation hints - not actual translation but helpful fallback
  const hints = {
    en: "English translation not available - OpenAI quota exceeded. Please add credits to access translation features.",
    es: "Traducción al español no disponible - cuota de OpenAI excedida. Agregue créditos para acceder a funciones de traducción.",
    fr: "Traduction française non disponible - quota OpenAI dépassé. Veuillez ajouter des crédits pour accéder aux fonctionnalités de traduction."
  };
  
  return { translatedText: hints[targetLanguage] };
}

export function generateFallbackSEO(title: string, description: string): {
  seoTitle: string;
  tags: string[];
  metaDescription: string;
} {
  // SEO-optimized title (max 60 chars)
  const seoTitle = title.length > 60 ? title.substring(0, 57) + "..." : title;
  
  // Basic SEO tags
  const tags = [
    "video production",
    "professional video",
    "creative content",
    "visual storytelling",
    "cinematic",
    "filmmaker",
    "video marketing"
  ];
  
  // Meta description (max 155 chars)
  let metaDescription = description.substring(0, 155);
  if (description.length > 155) {
    metaDescription = description.substring(0, 152) + "...";
  }
  
  return {
    seoTitle,
    tags,
    metaDescription
  };
}