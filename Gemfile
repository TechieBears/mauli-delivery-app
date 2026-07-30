source 'https://rubygems.org'

# You may use http://rbenv.org/ or https://rvm.io/ to install and use this version
ruby ">= 2.6.10"

# Exclude problematic versions of cocoapods and activesupport that causes build failures.
# 1.16+ is required on Ruby 3.4: CocoaPods 1.15.x (via CFPropertyList) does
# `require 'kconv'`, and kconv was removed from the Ruby 3.4 stdlib, so 1.15.2
# crashes with "cannot load such file -- kconv" on every `bundle exec pod install`.
gem 'cocoapods', '>= 1.16', '!= 1.15.0', '!= 1.15.1'
gem 'activesupport', '>= 6.1.7.5', '!= 7.1.0'
gem 'concurrent-ruby', '< 1.3.4'

# Ruby 3.4.0 has removed some libraries from the standard library.
gem 'bigdecimal'
gem 'logger'
gem 'benchmark'
gem 'mutex_m'
