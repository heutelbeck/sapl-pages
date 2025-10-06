# frozen_string_literal: true

Jekyll::Hooks.register :site, :after_init do |site|
  puts "\n" + ("=" * 60)
  puts "Jekyll Configuration Check:"
  puts "  Markdown: #{site.config['markdown']}"
  puts "  Highlighter: #{site.config['highlighter']}"
  puts "  Kramdown syntax_highlighter: #{site.config.dig('kramdown', 'syntax_highlighter')}"
  puts "=" * 60 + "\n"
end

# Force kramdown to load Rouge syntax highlighter
require 'kramdown/converter/syntax_highlighter/rouge'

# Patch kramdown to ensure Rouge is used
module Kramdown
  module Converter
    class Html
      alias_method :original_convert_codeblock, :convert_codeblock
      
      def convert_codeblock(el, indent)
        attr = el.attr.dup
        lang = extract_code_language!(attr)
        
        puts "\n>>> Converting codeblock with language: #{lang.inspect}" if lang == 'sapl'
        
        if lang && @options[:syntax_highlighter] == 'rouge'
          puts "    Using Rouge highlighter" if lang == 'sapl'
          
          # Ensure Rouge can find the lexer
          require 'rouge'
          lexer = ::Rouge::Lexer.find(lang)
          
          if lang == 'sapl'
            puts "    Lexer found: #{lexer ? lexer.class.name : 'NONE'}"
            
            if lexer
              # Manually highlight
              formatter = ::Rouge::Formatters::HTMLLegacy.new(css_class: 'highlight')
              highlighted = formatter.format(lexer.lex(el.value))
              puts "    Highlighted HTML length: #{highlighted.length}"
              return "#{' ' * indent}<div class=\"language-#{lang} highlighter-rouge\"><div class=\"highlight\"><pre class=\"highlight\"><code>#{highlighted}</code></pre></div></div>\n"
            else
              puts "    !!! Lexer not found, falling back"
            end
          end
        end
        
        original_convert_codeblock(el, indent)
      end
    end
  end
end