import re

def convert_markdown_to_html(text):
    if not text:
        return ""

    lines = text.split('\n')
    html_output = []
    
    # State tracking
    state = {'in_list': False, 'list_type': None}
    
    def close_list():
        if state['in_list']:
            html_output.append(f"</{state['list_type']}>")
            state['in_list'] = False
            state['list_type'] = None

    for line in lines:
        stripped = line.strip()
        
        # Empty line
        if not stripped:
            close_list()
            continue

        # Headers
        if stripped.startswith('#'):
            close_list()
            # Determine level
            level = 0
            for char in stripped:
                if char == '#':
                    level += 1
                else:
                    break
            
            # Extract content if there is a space after headers, e.g. "### Title"
            # If "###Title" (no space), treat as header
            content = stripped[level:].strip()
            
            if 1 <= level <= 6:
                html_output.append(f"<h{level}>{parse_inline(content)}</h{level}>")
            else:
                # Treat as normal text if too many #'s? Or just h6?
                html_output.append(f"<p>{parse_inline(stripped)}</p>")
            continue

        # Horizontal Rule
        if stripped in ['---', '***', '___']:
            close_list()
            html_output.append("<hr>")
            continue
            
        # Lists
        is_ul = stripped.startswith('- ') or stripped.startswith('* ')
        is_ol = re.match(r'^\d+\.\s', stripped)
        
        if is_ul or is_ol:
            new_type = 'ul' if is_ul else 'ol'
            
            # If we are in a list but of different type, close it
            if state['in_list'] and state['list_type'] != new_type:
                close_list()
                
            # Start new list if needed
            if not state['in_list']:
                state['in_list'] = True
                state['list_type'] = new_type
                html_output.append(f"<{new_type}>")
            
            # Extract content
            if is_ul:
                content = stripped[2:] 
            else:
                # Remove "1. " or "10. "
                content = re.sub(r'^\d+\.\s', '', stripped, count=1)
                
            html_output.append(f"<li>{parse_inline(content)}</li>")
            continue
            
        # Paragraph (non-list, non-header, non-hr, non-empty)
        # If we were in a list, this line breaks the list (simple parser behavior)
        close_list() 
        html_output.append(f"<p>{parse_inline(stripped)}</p>")
        
    close_list()
    return "\n".join(html_output)

def parse_inline(text):
    # Bold **text**
    text = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', text)
    # Bold __text__
    text = re.sub(r'__(.*?)__', r'<strong>\1</strong>', text)
    
    # Italic *text* (naive: matches pairs regardless of words)
    # Use negated character class to avoid matching across * * pairs incorrectly if they are far apart
    # But usually *word* is fine.
    # Note: This regex `\*([^\*]+)\*` says "match * then anything that is NOT * then *"
    # This prevents `*bold* and *bold*` from becoming `<em>bold* and *bold</em>`
    text = re.sub(r'\*([^\*]+)\*', r'<em>\1</em>', text)
    text = re.sub(r'_([^_]+)_', r'<em>\1</em>', text)
    
    return text
