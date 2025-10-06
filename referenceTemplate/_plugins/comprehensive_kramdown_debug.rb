# frozen_string_literal: true

require 'kramdown/converter/html'

module Kramdown
  module Converter
    class Html
      alias_method :original_convert, :convert
      
      def convert(el, indent = 0)
        if el.type == :codeblock
          attr = el.attr.dup
          lang = extract_code_language!(attr)
          
          puts "\n" + ("!" * 60)
          puts "!!! CODEBLOCK DETECTED !!!"
          puts "  Type: #{el.type}"
          puts "  Language: #{lang.inspect}"
          puts "  Value length: #{el.value.length}"
          puts "  First 50 chars: #{el.value[0..50].inspect}"
          puts "  Syntax highlighter option: #{@options[:syntax_highlighter].inspect}"
          puts "  All options: #{@options.keys.inspect}"
          puts ("!" * 60) + "\n"
          
          if lang == 'sapl'
            puts ">>> THIS IS A SAPL CODE BLOCK - Attempting to highlight..."
            
            require 'rouge'
            lexer = ::Rouge::Lexer.find('sapl')
            
            if lexer
              puts "    Lexer found: #{lexer.class.name}"
              
              formatter = ::Rouge::Formatters::HTMLLegacy.new(css_class: 'highlight')
              tokens = lexer.lex(el.value).to_a
              
              puts "    Generated #{tokens.length} tokens"
              puts "    First 5 tokens: #{tokens.first(5).map { |t| [t[0].qualname, t[1]] }.inspect}"
              
              highlighted = formatter.format(lexer.lex(el.value))
              puts "    Highlighted HTML length: #{highlighted.length}"
              
              result = "#{' ' * indent}<div class=\"language-#{lang} highlighter-rouge\"><div class=\"highlight\"><pre class=\"highlight\"><code>#{highlighted}</code></pre></div></div>\n"
              puts "    Returning manually highlighted code"
              return result
            else
              puts "    !!! ERROR: SAPL lexer not found!"
            end
          end
        end
        
        original_convert(el, indent)
      end
    end
  end
end