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
# Kramdown + Rouge produces this HTML structure for fenced code blocks:
#
#   <div class="language-sapl highlighter-rouge">
#     <div class="highlight">
#       <pre class="highlight"><code>...</code></pre>
#     </div>
#   </div>
#
# For sapl-demo with IAL data attributes:
#
#   <div data-subject="bob" data-action="write" data-resource="file"
#        class="language-sapl-demo highlighter-rouge">
#     <div class="highlight">
#       <pre class="highlight"><code>...</code></pre>
#     </div>
#   </div>
#
# Subscription sources for demo blocks (checked in order):
#
# 1. HTML comment immediately after the closing </div>:
#
#      <!-- sapl-subscription
#      { "subject": {"name": "alice"}, "action": "read", "resource": "doc" }
#      -->
#
# 2. Kramdown IAL data attributes on the wrapper div:
#
#      {: data-subject="bob" data-action="write" data-resource="file" }
#
# 3. Default: {"subject":"alice","action":"read","resource":"document"}
#

require 'cgi'
require 'json'

module SaplDemoBlocks
  PLAYGROUND_URL = 'https://playground.sapl.io'
  EMBED_SCRIPT = "#{PLAYGROUND_URL}/embed/sapl-embed.js".freeze
  DEFAULT_SUBSCRIPTION = '{"subject":"alice","action":"read","resource":"document"}'.freeze

  # Matches the Kramdown/Rouge output structure for language-sapl and
  # language-sapl-demo code blocks, plus optional trailing HTML comments.
  BLOCK_PATTERN = %r{
    <div(?<attrs>[^>]*)class="language-sapl(?<demo>-demo)?\s+highlighter-rouge"[^>]*>
    \s*<div\s+class="highlight">\s*
    <pre\s+class="highlight"><code>(?<code>.*?)</code></pre>
    \s*</div>\s*</div>
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

  def self.build_subscription_from_attrs(attrs_str)
    subject  = extract_attr(attrs_str, 'data-subject')
    action   = extract_attr(attrs_str, 'data-action')
    resource = extract_attr(attrs_str, 'data-resource')

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
          #{policy}
            </script>
            <script type="sapl/subscription">
          #{subscription}
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
