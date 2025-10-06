# frozen_string_literal: true

Jekyll::Hooks.register :site, :after_init do |site|
  # Force kramdown to use Rouge
  site.config['kramdown'] ||= {}
  site.config['kramdown']['syntax_highlighter'] = 'rouge'
  site.config['kramdown']['syntax_highlighter_opts'] ||= {}
  site.config['kramdown']['syntax_highlighter_opts']['css_class'] = 'highlight'
  
  puts "\n" + ("=" * 60)
  puts "FORCING Kramdown Configuration:"
  puts "  syntax_highlighter: #{site.config['kramdown']['syntax_highlighter']}"
  puts "  Will use Rouge: #{site.config['kramdown']['syntax_highlighter'] == 'rouge'}"
  puts "=" * 60 + "\n"
  
  # Verify Rouge has SAPL
  require 'rouge'
  lexer = Rouge::Lexer.find('sapl')
  puts "SAPL lexer available: #{lexer ? 'YES' : 'NO'}"
  puts "Lexer class: #{lexer.class.name}" if lexer
  puts ("=" * 60) + "\n"
end