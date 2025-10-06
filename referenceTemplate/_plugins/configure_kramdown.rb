# frozen_string_literal: true

Jekyll::Hooks.register :site, :after_init do |site|
  site.config['kramdown'] ||= {}
  site.config['kramdown']['syntax_highlighter'] = 'rouge'
end