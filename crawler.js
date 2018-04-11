
// Include common libraries
const Entities = require('html-entities').XmlEntities;
const entities = new Entities();
const http = require("http");
const cheerio = require('cheerio');

//  IMDBCrawler Class
class IMDBCrawler {

   constructor()
   {
       this.hostName = "http://www.imdb.com/";
       this.movies = {};
       this.index = {};
       this.maxMoviesToCrawl = 1000;
       this.moviesCrawled = 0;
   }
   
   // function to log the current index
   // useful for debugging.
   logIndex()
   {
        var allIndexedWords = Object.keys(this.index)
        for(var word in allIndexedWords)
        {
            console.log(allIndexedWords[word],JSON.stringify(Array.from(this.index[allIndexedWords[word]])));
        }
   }
   
   // Search the index. Primary logic is to 
   // get set of movies that relates to each word in the
   // search query and then return their intersection.
   // Since we don't care about the relevance the order 
   // does not matter
   search(words)
   {    
        if(words == null)
        {
            return [];
        }

        var tokens = this._tokenise(words);
        if(tokens == null || tokens.length < 1 || this.index[tokens[0]] == null)
        {
            return [];
        }

        var intersection = this.index[tokens[0]];
        for(var i = 1; i < tokens.length; i++)
        {
            if(this.index[tokens[i]] == null)
            {
                return [];
            }
            
            intersection = new Set([...intersection].filter(x => this.index[tokens[i]].has(x)));
        }

        var result = [];

        for(var elem of intersection)
        {
            result.push(this.movies[elem]);
        }

        return result;
   }

   // Crawler Logic
   // First get a list of all the movies 
   // Then crawl each movie 
   crawl(onCrawlComplete)
   { 
       this.onCrawlComplete = onCrawlComplete;
       var maxPagesToCrawl = this.maxMoviesToCrawl/50;
       // Get list of movies and their links
       for(var i = 0; i < maxPagesToCrawl; i++)
       {
            http.get(this._getMainListURLForIndex(i+1), function(response) {
              let body = "";
              
              response.on("data", data => {
                body += data;
              });
              
              response.on("end", () => {
                    const $ = cheerio.load(body);
                    var allTitles = $(".lister-item.mode-simple");
                    for(var j = 0; j < allTitles.length; j++)
                    {
                        var titleLink = $(".lister-item-header a",allTitles[j]);
                        this.parent.movies[(this.i*50)+(j+1)] = entities.decode(titleLink.html());
                        // crawl the movie page
                        this.parent._crawlMoviePage(this.parent.hostName+titleLink.attr('href'),this.parent.movies[(this.i*50)+(j+1)],(this.i*50)+(j+1));
                    }
                });
            }.bind({i:i,parent:this}));
        }
    }
    
    // Crawl movie page
    _crawlMoviePage(url,movieTitle,movieIndex)
    {
       // add title to index
       this._addToIndex(movieTitle,movieIndex);

	   try 
       {       http.get(url, function(response) {
              let body = "";
              
              response.on("data", data => {
                body += data;
              });
              
              response.on("end", () => {
                    const $ = cheerio.load(body);
                    // add actor, directors writers etc
                    var primaryContributors = $(".itemprop",$(".plot_summary"));
                    
                    for(var i = 0; i < primaryContributors.length; i++)
                    {
                        this.parent._addToIndex($(primaryContributors[i]).html(),movieIndex);
                    }
                     
                    // We can put more stuff in the index if we want here.
                    // But for now this much is enough. 
                    
                    this.parent.moviesCrawled++;
					
					if(this.parent.moviesCrawled % (this.parent.maxMoviesToCrawl/10) == 0)
					{
						console.log("Movies Crawled:" + this.parent.moviesCrawled);
					}
					
                    if(this.parent.moviesCrawled == this.parent.maxMoviesToCrawl && this.parent.onCrawlComplete)
                    {
                        this.parent.onCrawlComplete();
                    }
                });

            }.bind({parent:this}));
	   }
	   catch(err)
	   {
		   this.parent.moviesCrawled++;
		   if(this.moviesCrawled == this.maxMoviesToCrawl && this.onCrawlComplete)
		   {
				this.onCrawlComplete();
		   }
	   }
    }
    
    _addToIndex(words,movieIndex)
    {
        var tokens = this._tokenise(words);
        for(var token in tokens)
        {
            if(this.index[tokens[token]] == null)
            {
                this.index[tokens[token]] = new Set([]);
            }

            this.index[tokens[token]].add(movieIndex);
        }
    }
    
    _tokenise(words)
    {
        // decode html
        words = entities.decode(words);
        // make all lower case
        words = words.toLowerCase();
        // remove all special chars
        words = words.replace(/[^a-zA-Z\d\s:]/g, " ");
        // match all non-space character sequences
        return words.match(/[^ ]+/g);
    }
    
    _getMainListURLForIndex(index)
    {
        return this.hostName+"search/title?groups=top_1000&sort=user_rating&view=simple&page="+index+"&ref_=adv_prv";
    }

}

module.exports = IMDBCrawler;