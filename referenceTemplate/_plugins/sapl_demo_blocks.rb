# frozen_string_literal: true

#
# Replaces Rouge-highlighted SAPL code blocks with markers for sapl-embed.js.
#
# sapl-embed.js provides CodeMirror-based syntax highlighting for all SAPL
# blocks and adds interactive playground loading for demo blocks.
#
# Code fence types:
#
#   ```sapl              -- static CodeMirror highlight (read-only, no interactivity)
#   ```sapl-demo         -- interactive: CodeMirror + "Try it live" click-to-load
#
# Subscription for demo blocks is read from data attributes (Kramdown IAL):
#
#   ```sapl-demo
#   policy "example" permit
#   ```
#   {: data-subject="bob" data-action="write" data-resource="file" }
#
#   ```sapl-demo
#   policy "example" permit subject.role == "admin";
#   ```
#   {: data-json='{"subject":{"name":"alice","role":"admin"},"action":"read","resource":"doc"}' }
#
# When no data attributes are present, a default subscription is used.
#
# Fallback: without JavaScript, the raw policy text is visible in a <pre>.
#

require 'cgi'
require 'json'

module SaplDemoBlocks
  PLAYGROUND_URL = 'https://playground.sapl.io'
  EMBED_SCRIPT = "#{PLAYGROUND_URL}/embed/sapl-embed.js".freeze
  DEFAULT_SUBSCRIPTION = '{"subject":"alice","action":"read","resource":"document"}'.freeze

  # Matches <pre> elements containing <code class="language-sapl"> or
  # <code class="language-sapl-demo">. Captures optional data-* attributes
  # on the <pre>, the language variant, and the code content.
  BLOCK_PATTERN = %r{
    <pre(?<attrs>[^>]*)>
    <code\s+class="language-sapl(?<demo>-demo)?"
    >(?<code>.*?)</code></pre>
  }mx

  def self.build_subscription(pre_attrs)
    return DEFAULT_SUBSCRIPTION if pre_attrs.nil? || pre_attrs.empty?

    json = extract_attr(pre_attrs, 'data-json')
    return json if json

    subject  = extract_attr(pre_attrs, 'data-subject') || 'alice'
    action   = extract_attr(pre_attrs, 'data-action') || 'read'
    resource = extract_attr(pre_attrs, 'data-resource') || 'document'

    JSON.generate({ subject: subject, action: action, resource: resource })
  end

  def self.extract_attr(attrs_str, name)
    match = attrs_str.match(/#{Regexp.escape(name)}=["']([^"']*)["']/)
    match ? CGI.unescapeHTML(match[1]) : nil
  end

  def self.transform(content)
    script_injected = false

    result = content.gsub(BLOCK_PATTERN) do
      pre_attrs = Regexp.last_match(:attrs)
      is_demo = Regexp.last_match(:demo)
      raw_code = CGI.unescapeHTML(Regexp.last_match(:code))
      policy = raw_code.strip

      if is_demo
        subscription = build_subscription(pre_attrs)
        html = <<~HTML
          <sapl-demo>
            <pre class="sapl-fallback"><code>#{CGI.escapeHTML(policy)}</code></pre>
            <script type="sapl/policy">
          #{CGI.escapeHTML(policy)}
            </script>
            <script type="sapl/subscription">
          #{CGI.escapeHTML(subscription)}
            </script>
          </sapl-demo>
        HTML
      else
        html = <<~HTML
          <sapl-code>
            <pre class="sapl-fallback"><code>#{CGI.escapeHTML(policy)}</code></pre>
          </sapl-code>
        HTML
      end

      unless script_injected
        html += %(<script type="module" src="#{EMBED_SCRIPT}"></script>\n)
        script_injected = true
      end

      html
    end

    result
  end
end

Jekyll::Hooks.register [:pages, :documents], :post_render do |item|
  next unless item.output_ext == '.html'
  next unless item.output&.include?('language-sapl')

  item.output = SaplDemoBlocks.transform(item.output)
end
