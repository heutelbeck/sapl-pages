# frozen_string_literal: true

require 'kramdown/converter/syntax_highlighter/rouge'

module Kramdown
  module Converter
    module SyntaxHighlighter
      module Rouge
        class << self
          alias_method :original_call, :call

          def call(converter, text, lang, type, call_opts)
            if lang == 'sapl' || lang == 'sapl-test'
              puts "\n" + ("=" * 60)
              puts "=== SAPL HIGHLIGHTING ATTEMPT ==="
              puts "Language requested: #{lang}"
              puts "Type: #{type}"
              puts "Text length: #{text.length}"
              
              # Try to find the lexer
              lexer = ::Rouge::Lexer.find_fancy(lang, text)
              puts "Lexer found: #{lexer ? lexer.class.name : 'NONE'}"
              puts "Lexer tag: #{lexer.tag}" if lexer
              
              # Check all available lexers
              all_tags = ::Rouge::Lexer.all.map(&:tag)
              puts "All available Rouge tags: #{all_tags.sort.join(', ')}"
              puts "SAPL in tags?: #{all_tags.include?('sapl')}"
              
              if lexer
                # Try to lex the code
                tokens = lexer.lex(text).to_a
                puts "Tokens generated: #{tokens.length}"
                puts "First 10 tokens:"
                tokens.first(10).each do |token|
                  puts "  #{token[0].qualname}: #{token[1].inspect}"
                end
              else
                puts "!!! LEXER NOT FOUND - Rouge will not highlight !!!"
              end
              
              puts ("=" * 60) + "\n"
            end
            
            original_call(converter, text, lang, type, call_opts)
          end
        end
      end
    end
  end
end