const fetch = require('node-fetch'),
      express = require('express'),
      app = express();

      const cheerio = require('cheerio');
      const fs = require('fs');

      const lineReader = require('line-reader');

      let i = 0;

         
      function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
      }

      var stream = fs.createWriteStream("my_file.txt");
      stream.once('open', function(fd) {
        //stream.write("My first row\n");
        //stream.write("My second row\n");
        // stream.end();

        lineReader.eachLine('./test.txt', function(line) {
          console.log(i, line);
          i++;
          let url = line;
            url = url.replace("*", "")
            url = url.trim()
          
          if(url.indexOf("bloomberg.com") != -1 ){
            a = url.split("/")          
            console.log("a[a.length-1]", a[a.length-1])
            b = (a[a.length-1]).replace(/-/g, " ")
            title1 = capitalizeFirstLetter(b)
            const title = title1.replace(/\|/g, "-")
            // console.log(line, "\n", c)
            stream.write(`* ${title} [${url}](${url})\n`)
          }else{            
            fetch(url)
            .then(res => res.text()) // parse response's body as text
            .then(body => parseTitle(body)) // extract <title> from body
            .then(title1 => {
              const title = title1.replace(/\|/g, "-")
              console.log(i,  title, url)
              stream.write(`* ${title} [${url}](${url})\n`)
            }) // send the result back
            .catch(e => {
              console.log("error", url, e)
            }) // catch possible errors
          }          
      });

    });
        



const parseTitle = (body) => {
//    console.log("body", body);

   const $ = cheerio.load(body);


  let match = $("title").first().text().trim()
    // console.log("match:", match)
  if (!match)
    throw new Error('Unable to parse the title tag')
    // match = match.replace("|" , "-")  
    // console.log("match:", match)
  return match
}

app.get('/', (req, res) => {
  const { url } = req.query
  if (!url)
    return res.status(400).end('Missing url query parameter')
  
  fetch(url)
    .then(res => res.text()) // parse response's body as text
    .then(body => {
        // console.log("body", body)
        parseTitle(body)
    }) // extract <title> from body
    .then(title => res.send(title)) // send the result back
    .catch(e => res.status(500).end(e.message)) // catch possible errors
})

app.listen(3000)