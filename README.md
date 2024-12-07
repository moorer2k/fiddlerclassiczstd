### Add ZSTD decompression to Fiddler Classic for Windows ###


-> Download the windows release that suites your windows arch: https://github.com/facebook/zstd/releases/

-> Go to Rules -> Customize Rules

-> Change m_ZSTDBinPath to your extracted path. 

OnBeforeResponse is already defined by default, so just update it with the code shown, after you've made the other changes, it should be good to go!
