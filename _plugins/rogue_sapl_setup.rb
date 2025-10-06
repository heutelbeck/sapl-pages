require 'rouge'
require_relative 'sapl'
require_relative 'sapl_test'

# Monkey-patch IMMEDIATELY at load time, not in a hook
module Rouge
  class Lexer
    class << self
      unless method_defined?(:find_without_sapl)
        alias_method :find_without_sapl, :find
      end
      
      def find(name)
        case name.to_s.downcase
        when 'sapl'
          Rouge::Lexers::SAPL
        when 'sapl-test', 'sapltest'
          Rouge::Lexers::SAPLTest
        else
          find_without_sapl(name)
        end
      end
    end
  end
end

# Test that lexer actually WORKS, not just that it's found
test_code = 'policy "test" permit'
begin
  lexer = Rouge::Lexer.find('sapl')
  tokens = lexer.lex(test_code).to_a
  if tokens.any?
    puts "✓ SAPL lexer working: generated #{tokens.length} tokens"
  else
    puts "✗ SAPL lexer found but generated NO tokens!"
  end
rescue => e
  puts "✗ SAPL lexer error: #{e.message}"
end