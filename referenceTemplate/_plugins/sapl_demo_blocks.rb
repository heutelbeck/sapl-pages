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
# Subscription sources for demo blocks (checked in order):
#
# 1. HTML comment immediately after the code block:
#
#      ```sapl-demo
#      policy "example" permit subject.role == "admin";
#      ```
#      <!-- sapl-subscription
#      {
#        "subject": {"name": "alice", "role": "admin"},
#        "action": "read",
#        "resource": {"type": "medical", "id": "record-7"}
#      }
#      -->
#
# 2. Kramdown IAL data attributes (simple subscriptions only):
#
#      ```sapl-demo
#      policy "example" permit
#      ```
#      {: data-subject="bob" data-action="write" data-resource="file" }
#
# 3. Default: {"subject":"alice","action":"read","resource":"document"}
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
  # <code class="language-sapl-demo">. Captures optional attributes on the
  # <pre>, the language variant, the code content, and any trailing HTML
  # comment with sapl-subscription.
  BLOCK_PATTERN = %r{
    <pre(?<attrs>[^>]*)>\s*
    <code\s+class="language-sapl(?<demo>-demo)?"
    >(?<code>.*?)</code>\s*</pre>
    (?<after>
      \s*<!--\s*sapl-subscription\s*\n(?<subscription>.*?)-->
    )?
  }mx

  def self.build_subscription(match)
    comment_json = match[:subscription]
    if comment_json && !comment_json.strip.empty?
      return comment_json.strip
    end

    pre_attrs = match[:attrs]
    return build_subscription_from_attrs(pre_attrs) if pre_attrs && !pre_attrs.empty?

    DEFAULT_SUBSCRIPTION
  end

  def self.build_subscription_from_attrs(pre_attrs)
    subject  = extract_attr(pre_attrs, 'data-subject')
    action   = extract_attr(pre_attrs, 'data-action')
    resource = extract_attr(pre_attrs, 'data-resource')

    return DEFAULT_SUBSCRIPTION unless subject || action || resource

    JSON.generate({
      subject:  subject || 'alice',
      action:   action || 'read',
      resource: resource || 'document'
    })
  end

  def self.extract_attr(attrs_str, name)
    match = attrs_str.match(/#{Regexp.escape(name)}=["']([^"']*)["']/)
    match ? CGI.unescapeHTML(match[1]) : nil
  end

  def self.transform(content)
    script_injected = false

    result = content.gsub(BLOCK_PATTERN) do
      m = Regexp.last_match
      is_demo = m[:demo]
      raw_code = CGI.unescapeHTML(m[:code])
      policy = raw_code.strip

      if is_demo
        subscription = build_subscription(m)
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
