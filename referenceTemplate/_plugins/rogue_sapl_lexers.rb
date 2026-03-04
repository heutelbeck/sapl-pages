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

      state :root do
        rule %r/\s+/, Text
        rule %r/\/\/.*$/, Comment::Single
        rule %r/\/\*/, Comment::Multiline, :multiline_comment
        rule %r/"/, Str::Double, :string
        rule %r/-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/, Num
        rule %r/\b(?:policy|set|permit|deny|var|import|as|schema|enforced|obligation|advice|transform|for|each|or|errors|abstain|propagate|first|priority|strict|unanimous|unique)\b/, Keyword
        rule %r/\b(?:true|false|null|undefined)\b/, Keyword::Constant
        rule %r/\b(?:subject|action|resource|environment)\b/, Name::Builtin
        rule %r/\|?<(?=[a-zA-Z_$])/, Operator, :attribute_finder
        rule %r/\|\|/, Operator
        rule %r/&&/, Operator
        rule %r/==/, Operator
        rule %r/!=/, Operator
        rule %r/=~/, Operator
        rule %r/<=/, Operator
        rule %r/>=/, Operator
        rule %r/\bin\b/, Operator::Word
        rule %r/\.\./, Operator
        rule %r/\|-/, Operator
        rule %r/::/, Operator
        rule %r/=/, Operator
        rule %r/[|^&<>+\-*\/%!?]/, Operator
        rule %r/[@#]/, Name::Variable::Instance
        rule %r/\b[a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)+(?=\()/, Name::Function
        rule %r/\b[a-zA-Z_$][a-zA-Z0-9_$]*(?=\()/, Name::Function
        rule %r/\^?[a-zA-Z_$][a-zA-Z0-9_$]*/, Name
        rule %r/[{}()\[\]:;,.]/, Punctuation
      end

      state :string do
        rule %r/"/, Str::Double, :pop!
        rule %r/\\["\\\/bfnrt]/, Str::Escape
        rule %r/\\u[0-9a-fA-F]{4}/, Str::Escape
        rule %r/\\./, Str::Double
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

    class SAPLTest < RegexLexer
      title "SAPL-Test"
      desc "Test language for SAPL policies"
      tag 'sapl-test'
      aliases 'sapltest'
      filenames '*.sapltest'
      mimetypes 'text/x-sapl-test'

      state :root do
        rule %r/\s+/, Text
        rule %r/\/\/.*$/, Comment::Single
        rule %r/\/\*/, Comment::Multiline, :multiline_comment
        rule %r/"/, Str::Double, :string
        rule %r/[+-]?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/, Num
        rule %r/\b(?:permit|deny|indeterminate|not-applicable)\b/, Name::Constant
        rule %r/\b(?:requirement|scenario|given|when|expect|then|verify)\b/, Keyword::Declaration
        rule %r/\b(?:subject|action|resource|environment)\b/, Name::Builtin
        rule %r/\b(?:attempts|emits|maps|called|matching|equals|containing|with|is|of|to|on|in|where|any|next|once|times|and|starting|ending)\b/, Keyword
        rule %r/\b(?:text|number|boolean|array|object|blank|empty|regex|length|stream|order|error|null-or-empty|null-or-blank|equal|compressed|whitespace|case-insensitive)\b/, Keyword::Type
        rule %r/\b(?:function|attribute|decision|obligation|advice|obligations|variables|secrets|configuration|pdp-configuration|document|documents|key|value|or|errors|abstain|propagate|first|priority|strict|unanimous|unique)\b/, Keyword
        rule %r/\b(?:true|false|null|undefined)\b/, Keyword::Constant
        rule %r/[a-zA-Z_$][a-zA-Z0-9_$]*/, Name
        rule %r/[{}()\[\]:;,.<>-]/, Punctuation
      end

      state :string do
        rule %r/"/, Str::Double, :pop!
        rule %r/\\["\\\/bfnrt]/, Str::Escape
        rule %r/\\u[0-9a-fA-F]{4}/, Str::Escape
        rule %r/\\./, Str::Double
        rule %r/[^"\\]+/, Str::Double
      end

      state :multiline_comment do
        rule %r/\*\//, Comment::Multiline, :pop!
        rule %r/[^*]+/, Comment::Multiline
        rule %r/\*/, Comment::Multiline
      end
    end
  end
end