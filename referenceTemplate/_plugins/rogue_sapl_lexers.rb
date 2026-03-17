# frozen_string_literal: true

require 'rouge'

module Rouge
  module Lexers
    # SAPL and sapl-demo code blocks are handled by sapl-embed.js (CodeMirror).
    # Only register minimal placeholder lexers so Kramdown/Rouge does not error
    # on unknown language tags. The output is replaced post-render by the
    # sapl_demo_blocks.rb plugin.

    class SAPL < RegexLexer
      title "SAPL"
      desc "Streaming Attribute Policy Language (placeholder for sapl-embed.js)"
      tag 'sapl'
      filenames '*.sapl'
      mimetypes 'text/x-sapl'

      state :root do
        rule %r/.*\n?/m, Text
      end
    end

    class SAPLDemo < RegexLexer
      title "SAPL Demo"
      desc "Interactive SAPL demo block (placeholder for sapl-embed.js)"
      tag 'sapl-demo'

      state :root do
        rule %r/.*\n?/m, Text
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