# frozen_string_literal: true

require 'rouge'

module Rouge
  module Lexers
    class SAPL < RegexLexer
      title "SAPL"
      desc "Streaming Attribute Policy Language"
      tag 'sapl'
      filenames '*.sapl'
      mimetypes 'text/x-sapl'

      def self.keywords
        @keywords ||= Set.new %w(
          policy set permit deny where var import as schema enforced
          obligation advice transform for each true false null undefined
        )
      end

      state :root do
        rule %r/\s+/, Text
        rule %r(//.*$), Comment::Single
        rule %r(/\*), Comment::Multiline, :multiline_comment
        rule %r/"/, Str::Double, :string
        rule %r/-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/, Num
        rule %r/\b(?:deny-overrides|permit-overrides|first-applicable|only-one-applicable|deny-unless-permit|permit-unless-deny)\b/, Name::Constant
        rule %r/\b(?:policy|set|permit|deny|where|var|import|as|schema|enforced|obligation|advice|transform|for|each)\b/, Keyword
        rule %r/\b(?:true|false|null|undefined)\b/, Keyword::Constant
        rule %r/\b(?:subject|action|resource|environment)\b/, Name::Builtin
        rule %r/\|?</, Operator, :attribute_finder
        rule %r/\|\|/, Operator
        rule %r/&&/, Operator
        rule %r/==/, Operator
        rule %r/!=/, Operator
        rule %r/=~/, Operator
        rule %r/<=/, Operator
        rule %r/>=/, Operator
        rule %r/\bin\b/, Operator::Word
        rule %r/[|^&<>+\-*\/%!]/, Operator
        rule %r/\.\./, Operator
        rule %r/\|-/, Operator
        rule %r/::/, Operator
        rule %r/@/, Name::Variable::Instance
        rule %r/\b[a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)+(?=\()/, Name::Function
        rule %r/\b[a-zA-Z_$][a-zA-Z0-9_$]*(?=\()/, Name::Function
        rule %r/\^?[a-zA-Z_$][a-zA-Z0-9_$]*/, Name
        rule %r/[{}()\[\]:;,.]/, Punctuation
      end

      state :string do
        rule %r/"/, Str::Double, :pop!
        rule %r/\\["\\\/bfnrt]/, Str::Escape
        rule %r/\\u[0-9a-fA-F]{4}/, Str::Escape
        rule %r/[^"\\]+/, Str::Double
      end

      state :multiline_comment do
        rule %r/\*\//, Comment::Multiline, :pop!
        rule %r/[^*]+/, Comment::Multiline
        rule %r/\*/, Comment::Multiline
      end

      state :attribute_finder do
        rule %r/>/, Operator, :pop!
        rule %r/\b[a-zA-Z_$][a-zA-Z0-9_$.]*/, Name::Decorator
        rule %r/\(/, Punctuation, :attribute_args
        rule %r/\s+/, Text
      end

      state :attribute_args do
        rule %r/\)/, Punctuation, :pop!
        rule %r/,/, Punctuation
        rule %r/"/, Str::Double, :string
        rule %r/-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/, Num
        rule %r/\b(?:true|false|null)\b/, Keyword::Constant
        rule %r/[a-zA-Z_$][a-zA-Z0-9_$]*/, Name
        rule %r/\s+/, Text
      end
    end
  end
end

# Force Rouge to recognize this lexer
Jekyll::Hooks.register :site, :pre_render do |site|
  require 'rouge'
  Rouge::Lexer.send(:register, 'sapl', Rouge::Lexers::SAPL) unless Rouge::Lexer.find('sapl')
end