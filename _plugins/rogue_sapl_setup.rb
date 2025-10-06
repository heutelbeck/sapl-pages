require 'rouge'

# Load the lexers
require_relative 'sapl'
require_relative 'sapl_test'

# Force Rouge to recognize them by monkey-patching the registry
module Rouge
  module Lexers
    # Ensure SAPL lexers are in the registry
    Lexer.class_eval do
      class << self
        alias_method :original_find, :find
        
        def find(name)
          case name.to_s.downcase
          when 'sapl'
            Rouge::Lexers::SAPL
          when 'sapl-test', 'sapltest'
            Rouge::Lexers::SAPLTest
          else
            original_find(name)
          end
        end
      end
    end
  end
end

# Verify it works
Jekyll::Hooks.register :site, :after_init do |site|
  puts "SAPL lexer check: #{Rouge::Lexer.find('sapl') ? 'FOUND' : 'NOT FOUND'}"
  puts "SAPL-Test lexer check: #{Rouge::Lexer.find('sapl-test') ? 'FOUND' : 'NOT FOUND'}"
end