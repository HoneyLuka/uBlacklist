require 'fileutils'

if ARGV.length != 2
    puts 'arguments error'
    return
end

from = ARGV[0]
to = ARGV[1]

# The Xcode project uses file system synchronized folders, so new .lproj
# directories are picked up automatically; copying the files is enough.
['macOS', 'iOS'].each do |platform|
    from_dir = "../#{platform} (App)/Common/Intl/#{from}.lproj"
    to_dir = "../#{platform} (App)/Common/Intl/#{to}.lproj"
    FileUtils.copy_entry(from_dir, to_dir)
end

puts "Complete. Translate Localizable.strings in #{to}.lproj on both platforms."
