// src/constants/library.ts
// Category and role mapping constants extracted from the UI prototype.
// These are the source of truth for the Library screen filtering logic.

// Maps each role filter pill to the categories shown in the sidebar
export const sidebarMapping: Record<string, string[]> = {
    All:      ['Encoding', 'Formatting', 'Security', 'Network', 'JSON Tools', 'Regex', 'SQL Formatting'],
    Frontend: ['Encoding', 'Formatting', 'JSON Tools', 'Regex'],
    Backend:  ['Security', 'JSON Tools', 'SQL Formatting', 'Network', 'Encoding'],
    DevOps:   ['Network', 'Security', 'Formatting'],
    Security: ['Security', 'Encoding', 'Network'],
    Data:     ['JSON Tools', 'SQL Formatting', 'Formatting', 'Encoding'],
  };
  
  // Maps each role to which tool type tags are visible in the tool grid
  export const gridRoleMapping: Record<string, string[] | 'all'> = {
    All:      'all',
    Frontend: ['Standard', 'Web Utility', 'String', 'Media'],
    Backend:  ['OAuth', 'Standard', 'Security', 'Conversion'],
    DevOps:   ['Web Utility', 'Security'],
    Security: ['Security', 'OAuth'],
    Data:     ['Standard', 'Conversion', 'String'],
  };
  
  // Subtitle displayed under the category heading in the tool grid
  export const categorySubtitles: Record<string, string> = {
    Encoding:        'Convert and transform data formats safely.',
    Formatting:      'Prettify and organize code structures.',
    Security:        'Analyze and protect sensitive data.',
    Network:         'Test and troubleshoot network connectivity.',
    'JSON Tools':    'Manipulate and validate JSON structures.',
    Regex:           'Build and test regular expressions.',
    'SQL Formatting':'Beautify and optimize SQL queries.',
  };
  
  // Icon name for each category — uses Material Symbols icon names (must exist in the font)
  export const categoryIcons: Record<string, string> = {
    Encoding:        'data_array',
    Formatting:      'format_indent_increase',
    Security:        'verified_user',
    Network:         'router',
    'JSON Tools':    'data_object',
    Regex:           'regular_expression',
    'SQL Formatting':'storage',
  };

  // Maps Library category display name to registry ToolCategory for filtering tools
  export const categoryNameToRegistry: Record<string, string> = {
    Encoding:        'encoding',
    Formatting:      'text',
    Security:        'crypto',
    Network:         'network',
    'JSON Tools':    'json',
    Regex:           'text',
    'SQL Formatting':'code',
  };