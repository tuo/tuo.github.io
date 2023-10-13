## BLOG


	www.tuohuang.info

    rvm install  --with-openssl-dir=$HOME/.rvm/usr
    rvm install 2.7.6 --with-openssl-dir=$HOME/.rvm/usr

## Jekyll

    rvm use 3.0.0 --default
    # resolve openssl https://talk.jekyllrb.com/t/jekyll-install-fatal-error-openssl-ssl-h-file-not-found-macos/7660
    #gem install eventmachine -- --with-cppflags=-I/usr/local/opt/openssl/include

	sudo gem install -n /usr/local/bin  rouge
	rougify help style
	rougify style github > ./static/css/rouge_syntax.css
	rougify style monokai > ./static/css/rouge_syntax.css

	gem install bundle


## New post

    rvm use 2.7.6 --default
	bundle install --verbose
	bundle exec jekyll serve

	rake -t post['Setup docker on Mac with xhyve without GUI']

	rake jekyll:server[1]







	 bundle update --bundler

mogrify -format jpg **/*.png



## misc

[s3](https://s3.console.aws.amazon.com/s3/home?region=us-west-1)
