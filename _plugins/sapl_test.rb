# frozen_string_literal: true

require 'rouge'

module Rouge
  module Lexers
    class SAPLTest < RegexLexer
      title "SAPL-Test"
      desc "Test language for SAPL policies"
      tag 'sapl-test'
      aliases 'sapltest'
      filenames '*.sapltest'
      mimetypes 'text/x-sapl-test'

      state :root do
        rule %r/\s+/, Text
        rule %r(//.*$), Comment::Single
        rule %r(/\*), Comment::Multiline, :multiline_comment
        rule %r/"/, Str::Double, :string
        rule %r/[+-]?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/, Num
        rule %r/\b(?:deny-overrides|permit-overrides|only-one-applicable|deny-unless-permit|permit-unless-deny)\b/, Name::Constant
        rule %r/\b(?:permit|deny|indeterminate|notApplicable)\b/, Name::Constant
        rule %r/\b(?:pip|static-pip|function-library|static-function-library)\b/, Keyword::Type
        rule %r/\b(?:requirement|scenario|given|when|expect|then)\b/, Keyword::Declaration
        rule %r/\b(?:attempts|emits|maps|called|wait|matching|equals|containing|with|is|of|to|on|in|where|any)\b/, Keyword
        rule %r/\b(?:text|number|boolean|array|object|null|blank|empty|regex|length|stream|order|error)\b/, Keyword::Type
        rule %r/\b(?:policy|set|policies|pdp|function|attribute|decision|obligation|advice|virtual-time|environment)\b/, Keyword
        rule %r/\b(?:true|false|null|undefined)\b/, Keyword::Constant
        rule %r/[a-zA-Z_$][a-zA-Z0-9_$-]*/, Name
        rule %r/[{}()\[\]:;,.<>-]/, Punctuation
      end

      state :string do
        rule %r/"/, Str::Double, :pop!
        rule %r/\\["\\\/bfnrt]/, Str::Escape
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

Rouge::Lexer.send(:register, Rouge::Lexers::SAPLTest)