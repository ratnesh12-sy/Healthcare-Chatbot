export const extractSuggestions = (aiMessage: string): string[] => {
  if (!aiMessage) return [];

  // Split text by newlines and basic sentence endings (.!?)
  // We want to evaluate clean segments.
  const segments = aiMessage.split(/[\n.!?]+/).map(s => s.trim()).filter(s => s.length > 5);
  
  const actionVerbs = ['take', 'drink', 'schedule', 'avoid', 'monitor', 'exercise', 'eat', 'contact', 'consult', 'stop', 'use', 'apply'];
  
  const suggestions = new Set<string>();

  for (const segment of segments) {
    // Strip bullet points or asterisks at the start
    const cleanSegment = segment.replace(/^[-*•\d]+\.?\s*/, '').trim();
    
    // Lowercase for checking
    const lowerSegment = cleanSegment.toLowerCase();

    // Check if the segment is an imperative or contains a strong recommendation
    const hasActionVerb = actionVerbs.some(verb => lowerSegment.startsWith(verb));
    const hasRecommendationPhrase = lowerSegment.includes('you should') || lowerSegment.includes('please') || lowerSegment.includes('it is recommended to') || lowerSegment.includes('consider');

    if (hasActionVerb) {
      suggestions.add(cleanSegment);
    } else if (hasRecommendationPhrase) {
      // Try to isolate the action after "you should", "please", etc.
      let actionPart = cleanSegment;
      
      const shouldIdx = lowerSegment.indexOf('you should');
      if (shouldIdx !== -1) {
        actionPart = cleanSegment.substring(shouldIdx + 11);
      } else if (lowerSegment.startsWith('please ')) {
        actionPart = cleanSegment.substring(7);
      } else if (lowerSegment.includes('consider ')) {
        actionPart = cleanSegment.substring(lowerSegment.indexOf('consider ') + 9);
      }
      
      // Capitalize first letter securely
      actionPart = actionPart.trim();
      if (actionPart.length > 0) {
        actionPart = actionPart.charAt(0).toUpperCase() + actionPart.slice(1);
        suggestions.add(actionPart);
      }
    }
    
    // Stop early if we have enough
    if (suggestions.size >= 3) break;
  }

  // Fallback: If no action verbs found but there are bullet points in the original text, maybe we missed them because of formatting.
  if (suggestions.size === 0) {
    const listItems = aiMessage.split('\n').filter(line => line.trim().match(/^[-*•]\s/)).map(l => l.replace(/^[-*•]\s+/, '').trim());
    for (const item of listItems) {
      if (item.length > 5 && item.length < 80) {
        suggestions.add(item);
        if (suggestions.size >= 3) break;
      }
    }
  }

  return Array.from(suggestions).slice(0, 3);
};
