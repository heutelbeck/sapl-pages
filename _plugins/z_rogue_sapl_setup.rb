require 'rouge'
require_relative 'y_sapl'
require_relative 'y_sapl_test'

# Register lexers with Rouge at load time
Rouge::Lexer.register(Rouge::Lexers::SAPL)
Rouge::Lexer.register(Rouge::Lexers::SAPLTest)

# Verify registration
test_code = 'policy "test" permit'
begin
  lexer = Rouge::Lexer.find('sapl')
  tokens = lexer.lex(test_code).to_a
  if tokens.any?
    puts "✓ SAPL lexer registered: #{tokens.length} tokens"
    puts "  Tokens: #{tokens.map { |t| t[0].qualname }.join(', ')}"
  else
    puts "✗ SAPL lexer generates NO tokens!"
  end
rescue => e
  puts "✗ SAPL lexer error: #{e.message}"
  puts "  #{e.backtrace.first}"
end